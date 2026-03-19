"use client";

import * as React from "react";
import { FileText, Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResumeAnalysisResultsSectionWithBoundary } from "@/components/ResumeAnalysisResultsSectionWithBoundary";
import {
  ResumeAnalysisOutputSchema,
  type ResumeAnalysisOutput,
  type GapAnalysisOutput,
} from "@/lib/schema";
import {
  hashResumeText,
  SESSION_STORAGE_PREFIX,
} from "@/lib/hash";

import jobsData from "@/data/jobs.json";

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

async function runAnalysisPipeline(
  extracted: string,
  setResumeText: (t: string) => void,
  setAnalysis: (a: ResumeAnalysisOutput | null) => void,
  setErrorMessage: (m: string | null) => void,
  setIsAnalyzing: (v: boolean) => void,
) {
  setResumeText(extracted);
  setIsAnalyzing(true);
  const resumeHash = await hashResumeText(extracted);
  const cacheKey = `${SESSION_STORAGE_PREFIX}:${resumeHash}`;
  const raw = window.sessionStorage.getItem(cacheKey);
  const cached = raw ? (JSON.parse(raw) as ResumeAnalysisOutput) : null;
  const cachedParsed = cached ? ResumeAnalysisOutputSchema.safeParse(cached) : null;
  if (cachedParsed?.success) {
    setAnalysis(cachedParsed.data);
    setIsAnalyzing(false);
    return;
  }
  try {
    const analyzed = await analyzeResumeWithGroq(extracted);
    setAnalysis(analyzed);
    window.sessionStorage.setItem(cacheKey, JSON.stringify(analyzed));
  } catch (err) {
    setErrorMessage(err instanceof Error ? err.message : "Analysis failed.");
  }
  setIsAnalyzing(false);
}

export function ResumeUploadAndAnalyze() {
  const [resumeText, setResumeText] = React.useState("");
  const [pastedText, setPastedText] = React.useState("");
  const [analysis, setAnalysis] = React.useState<ResumeAnalysisOutput | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(
    null,
  );
  const [isParsing, setIsParsing] = React.useState(false);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [selectedJobTitle, setSelectedJobTitle] = React.useState("");
  const [gapResult, setGapResult] = React.useState<GapAnalysisOutput | null>(null);
  const [gapLoading, setGapLoading] = React.useState(false);
  const [gapError, setGapError] = React.useState<string | null>(null);

  const isBusy = isParsing || isAnalyzing;
  const jobs = jobsData as { title: string; targetSkills: string[] }[];

  async function handleGapAnalysis(jobTitle: string) {
    if (!analysis || !jobTitle) return;
    setGapLoading(true);
    setGapResult(null);
    setGapError(null);
    try {
      const res = await fetch("/api/analyze-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userSkills: analysis.skills.map((s) => s.name),
          targetRole: jobTitle,
        }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Gap analysis failed.");
      }
      const data = (await res.json()) as GapAnalysisOutput;
      setGapResult(data);
    } catch (err) {
      setGapResult(null);
      setGapError(err instanceof Error ? err.message : "Gap analysis failed.");
    }
    setGapLoading(false);
  }

  async function handleSubmitText() {
    const text = pastedText.trim();
    if (!text) return;
    setErrorMessage(null);
    setAnalysis(null);
    setResumeText("");
    setSelectedJobTitle("");
    setGapResult(null);
    setGapError(null);
    await runAnalysisPipeline(
      text,
      setResumeText,
      setAnalysis,
      setErrorMessage,
      setIsAnalyzing,
    );
  }

  async function handleFileChange(file: File | null) {
    if (!file) return;

    setErrorMessage(null);
    setAnalysis(null);
    setResumeText("");
    setSelectedJobTitle("");
    setGapResult(null);
    setGapError(null);

    setIsParsing(true);
    try {
      const extracted = await parseResume(file);
      setIsParsing(false);
      await runAnalysisPipeline(
        extracted,
        setResumeText,
        setAnalysis,
        setErrorMessage,
        setIsAnalyzing,
      );
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

          <div className="mt-5">
            <label className="block text-sm font-medium text-foreground/90">
              Or paste resume text
            </label>
            <textarea
              className="mt-2 w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Paste resume text here to bypass PDF upload..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              disabled={isBusy}
            />
            <Button
              type="button"
              size="sm"
              className="mt-2"
              disabled={isBusy || !pastedText.trim()}
              onClick={handleSubmitText}
            >
              Submit text
            </Button>
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

        <div className="space-y-6">
          <ResumeAnalysisResultsSectionWithBoundary
            resumeText={resumeText}
            analysis={analysis}
            errorMessage={errorMessage}
          />

          {analysis && (
            <div className="space-y-4">
              <label className="block text-sm font-semibold text-foreground/90">
                Compare to target role
              </label>
              <select
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={selectedJobTitle}
                onChange={(e) => {
                  const title = e.target.value;
                  setSelectedJobTitle(title);
                  if (title) void handleGapAnalysis(title);
                }}
                disabled={gapLoading}
              >
                <option value="">Select a role...</option>
                {jobs.map((j) => (
                  <option key={j.title} value={j.title}>
                    {j.title}
                  </option>
                ))}
              </select>

              {gapLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  <span>Analyzing gap...</span>
                </div>
              )}

              {gapError && !gapLoading && (
                <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground/90">
                  {gapError}
                </div>
              )}

              {gapResult && !gapLoading && (
                <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-3">
                  <Card className="border-green-500/30 bg-green-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span aria-hidden>🟢</span> Matched Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                        {gapResult.matchedSkills.length === 0 ? (
                          <li className="text-muted-foreground">None</li>
                        ) : (
                          gapResult.matchedSkills.map((s) => (
                            <li key={s}>{s}</li>
                          ))
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-red-500/30 bg-red-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span aria-hidden>🔴</span> Missing Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1 text-sm text-foreground/90">
                        {gapResult.missingSkills.length === 0 ? (
                          <li className="text-muted-foreground">None</li>
                        ) : (
                          gapResult.missingSkills.map((s) => (
                            <li key={s}>{s}</li>
                          ))
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                  <Card className="border-blue-500/30 bg-blue-500/5">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <span aria-hidden>📘</span> Recommended Learning Path
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="space-y-2 text-sm text-foreground/90">
                        {gapResult.recommendedCourses.length === 0 ? (
                          <li className="text-muted-foreground">None</li>
                        ) : (
                          gapResult.recommendedCourses.map((c) => (
                            <li key={c.name}>
                              <span className="font-medium">{c.name}</span>
                              {c.provider && (
                                <span className="text-muted-foreground">
                                  {" "}
                                  · {c.provider}
                                </span>
                              )}
                              {c.reason && (
                                <span className="block text-muted-foreground text-xs mt-0.5">
                                  {c.reason}
                                </span>
                              )}
                            </li>
                          ))
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

