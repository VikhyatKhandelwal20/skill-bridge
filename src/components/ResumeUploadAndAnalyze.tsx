"use client";

import * as React from "react";
import { FileText, Loader2, Upload } from "lucide-react";

import { ResumeAnalysisResultsSectionWithBoundary } from "@/components/ResumeAnalysisResultsSectionWithBoundary";
import { ResumeAnalysisOutputSchema, type ResumeAnalysisOutput } from "@/lib/schema";
import {
  hashResumeText,
  SESSION_STORAGE_PREFIX,
} from "@/lib/hash";

async function parseResume(file: File): Promise<string> {
  const formData = new FormData();
  formData.set("resume", file);

  const res = await fetch("/api/parse-resume", {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error ?? "Failed to parse resume PDF.");
  }

  const json = (await res.json()) as { text?: string; error?: string };
  if (!json.text) {
    throw new Error(json.error ?? "No resume text returned.");
  }
  return json.text;
}

async function analyzeResumeWithGroq(
  resumeText: string,
): Promise<ResumeAnalysisOutput> {
  const res = await fetch("/api/resume-analysis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ resumeText }),
  });

  if (!res.ok) {
    const json = await res.json().catch(() => null);
    throw new Error(json?.error ?? "Groq analysis failed.");
  }

  const json = await res.json().catch(() => null);
  const parsed = ResumeAnalysisOutputSchema.safeParse(json);
  if (!parsed.success) {
    // Ensures ErrorBoundary catches invalid JSON / invalid schema outputs.
    throw new Error("Invalid JSON structure from Groq analysis.");
  }

  return parsed.data;
}

export function ResumeUploadAndAnalyze() {
  const [resumeText, setResumeText] = React.useState("");
  const [analysis, setAnalysis] = React.useState<ResumeAnalysisOutput | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    null,
  );
  const [isParsing, setIsParsing] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);

  const isBusy = isParsing || isAnalyzing;

  async function handleFileChange(file: File | null) {
    if (!file) return;

    setErrorMessage(null);
    setAnalysis(null);
    setResumeText("");

    setIsParsing(true);
    try {
      const extracted = await parseResume(file);
      setResumeText(extracted);
      setIsParsing(false);

      // Hash -> sessionStorage check -> Groq if missing.
      setIsAnalyzing(true);
      const resumeHash = await hashResumeText(extracted);
      const cacheKey = `${SESSION_STORAGE_PREFIX}:${resumeHash}`;

      // Check cache by the resume hash key before calling Groq.
      const raw = window.sessionStorage.getItem(cacheKey);
      const cached = raw ? (JSON.parse(raw) as ResumeAnalysisOutput) : null;
      // Defensive: ensure cached data matches schema.
      const cachedParsed = cached
        ? ResumeAnalysisOutputSchema.safeParse(cached)
        : null;

      if (cachedParsed && cachedParsed.success) {
        setAnalysis(cachedParsed.data);
        setIsAnalyzing(false);
        return;
      }

      // Not cached: proceed to Groq and then store under hash key.
      const analyzed = await analyzeResumeWithGroq(extracted);
      setAnalysis(analyzed);

      // Store cached result keyed by resume hash.
      window.sessionStorage.setItem(cacheKey, JSON.stringify(analyzed));
      setIsAnalyzing(false);
    } catch (err) {
      setIsParsing(false);
      setIsAnalyzing(false);
      // Trigger fallback mode immediately through the boundary wrapper.
      setErrorMessage(err instanceof Error ? err.message : "Analysis failed.");
    }
  }

  return (
    <section className="mx-auto max-w-6xl px-4 pb-16 pt-6">
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <Upload className="h-5 w-5 text-primary" aria-hidden="true" />
            Upload your resume
          </h2>
          <p className="mt-2 text-sm text-foreground/80">
            We extract resume text, then hash it (SHA-256) to cache results and
            avoid redundant Groq calls.
          </p>

          <div className="mt-5">
            <label className="block">
              <span className="sr-only">Choose resume PDF</span>
              <input
                type="file"
                accept="application/pdf"
                className="block w-full cursor-pointer text-sm"
                disabled={isBusy}
                onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
              />
            </label>
          </div>

          <div className="mt-4 flex items-center gap-3 text-sm text-muted-foreground">
            <FileText className="h-4 w-4" aria-hidden="true" />
            <span>
              {isBusy
                ? "Processing..."
                : resumeText
                  ? "Resume text extracted (ready to analyze)"
                  : "Select a PDF to begin"}
            </span>
          </div>

          {(isParsing || isAnalyzing) && (
            <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-sm text-foreground/80">
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              <span>{isParsing ? "Extracting PDF..." : "Analyzing with Groq..."}</span>
            </div>
          )}
        </div>

        <div>
          <ResumeAnalysisResultsSectionWithBoundary
            resumeText={resumeText}
            analysis={analysis}
            errorMessage={errorMessage}
          />
        </div>
      </div>
    </section>
  );
}

