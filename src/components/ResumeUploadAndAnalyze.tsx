"use client";

import * as React from "react";
import { FileText, Loader2, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResumeAnalysisResultsSectionWithBoundary } from "@/components/ResumeAnalysisResultsSectionWithBoundary";
import { RoadmapTimeline } from "@/components/RoadmapTimeline";
import { RoleCombobox } from "@/components/RoleCombobox";
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
import { RoleSpecificInterviewPrep } from "@/components/RoleSpecificInterviewPrep";

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
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isLoadingSample, setIsLoadingSample] = React.useState(false);
  const [editableSkills, setEditableSkills] = React.useState<string[]>([]);
  const [skillDraft, setSkillDraft] = React.useState("");
  const [selectedJobTitle, setSelectedJobTitle] = React.useState("");
  const [gapResult, setGapResult] = React.useState<GapAnalysisOutput | null>(null);
  const [gapLoading, setGapLoading] = React.useState(false);
  const [gapError, setGapError] = React.useState<string | null>(null);

  const isBusy = isAnalyzing;
  const jobs = jobsData as { title: string; targetSkills: string[] }[];

  React.useEffect(() => {
    if (analysis) {
      setEditableSkills(analysis.skills);
      setSkillDraft("");
      setSelectedJobTitle("");
      setGapResult(null);
      setGapError(null);
    } else {
      setEditableSkills([]);
      setSkillDraft("");
      setSelectedJobTitle("");
      setGapResult(null);
      setGapError(null);
    }
  }, [analysis]);

  async function handleGapAnalysis(jobTitle: string) {
    if (!jobTitle) return;
    if (editableSkills.length === 0) return;
    setGapLoading(true);
    setGapResult(null);
    setGapError(null);
    try {
      const res = await fetch("/api/analyze-gap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userSkills: editableSkills,
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

  return (
    <section id="tool" className="scroll-mt-24 mx-auto max-w-6xl px-4 pb-16 pt-6">
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            Paste your resume text
          </h2>
          <p className="mt-2 text-sm text-foreground/80">
            Strict text-only bypass (no PDF parsing). Your input is SHA-256
            hashed and cached in sessionStorage to avoid redundant Groq calls.
          </p>

          <label className="mt-5 block text-sm font-medium text-foreground/90">
            Resume text
          </label>
          <div className="mt-2 grid gap-3 md:grid-cols-[1fr_auto]">
            <textarea
              className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              placeholder="Paste your resume text here..."
              value={pastedText}
              onChange={(e) => setPastedText(e.target.value)}
              disabled={isBusy}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="self-start md:mt-0"
              disabled={isBusy || isLoadingSample}
              onClick={async () => {
                setIsLoadingSample(true);
                setErrorMessage(null);
                setAnalysis(null);
                setSelectedJobTitle("");
                setEditableSkills([]);
                setGapResult(null);
                setGapError(null);
                try {
                  const res = await fetch("/api/sample-resume", {
                    method: "GET",
                  });
                  if (!res.ok) {
                    throw new Error("Failed to load sample resume.");
                  }
                  const json = (await res.json()) as { text?: string };
                  if (json.text) setPastedText(json.text);
                } catch (err) {
                  setErrorMessage(
                    err instanceof Error ? err.message : "Failed to load sample resume.",
                  );
                } finally {
                  setIsLoadingSample(false);
                }
              }}
            >
              {isLoadingSample ? "Loading..." : "Load Sample Resume"}
            </Button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button
              type="button"
              size="sm"
              disabled={isBusy || !pastedText.trim()}
              onClick={handleSubmitText}
            >
              Generate roadmap
            </Button>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {isBusy
                  ? "Analyzing with Groq..."
                  : resumeText
                    ? "Text captured (ready to analyze)"
                    : "Paste text, then map skills"}
              </span>
              {isBusy && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
            </div>
          </div>
        </div>

        <ResumeAnalysisResultsSectionWithBoundary
          resumeText={resumeText}
          analysis={analysis}
          errorMessage={errorMessage}
        />

        {analysis && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
              <h3 className="text-sm font-semibold">Update Extracted Skills</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Refine the skills Groq extracted before we generate your roadmap.
              </p>

              <div className="mt-4 flex flex-wrap gap-2">
                {editableSkills.length === 0 ? (
                  <span className="text-sm text-muted-foreground">
                    No extracted skills yet.
                  </span>
                ) : (
                  editableSkills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 rounded-full bg-zinc-800 text-amber-500 border border-amber-500/50 px-2 py-1 text-xs"
                    >
                      {skill}
                      <button
                        type="button"
                        aria-label={`Remove ${skill}`}
                        className="inline-flex h-4 w-4 items-center justify-center rounded-full text-amber-500/90 hover:text-amber-400"
                        onClick={() =>
                          setEditableSkills((prev) =>
                            prev.filter((s) => s !== skill),
                          )
                        }
                      >
                        <X className="h-3 w-3" aria-hidden />
                      </button>
                    </span>
                  ))
                )}
              </div>

              <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  placeholder="Add a missing skill (e.g., Prisma, PAN-OS, CISSP basics)"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  disabled={gapLoading || isBusy}
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;
                    e.preventDefault();
                    const next = skillDraft.trim();
                    if (!next) return;
                    setEditableSkills((prev) =>
                      prev.includes(next) ? prev : [...prev, next],
                    );
                    setSkillDraft("");
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={gapLoading || isBusy || !skillDraft.trim()}
                  onClick={() => {
                    const next = skillDraft.trim();
                    if (!next) return;
                    setEditableSkills((prev) =>
                      prev.includes(next) ? prev : [...prev, next],
                    );
                    setSkillDraft("");
                  }}
                >
                  Add Skill
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-foreground/90">
                Select a target role
              </label>

              <RoleCombobox
                options={jobs.map((j) => ({ title: j.title }))}
                value={selectedJobTitle}
                disabled={gapLoading || editableSkills.length === 0}
                onChange={(title) => {
                  setSelectedJobTitle(title);
                  if (title) void handleGapAnalysis(title);
                }}
              />
            </div>

            {gapLoading && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                <span>Building your roadmap...</span>
              </div>
            )}

            {gapError && !gapLoading && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-foreground/90">
                {gapError}
              </div>
            )}

            {gapResult && !gapLoading && (
              <>
                <div id="results" className="mx-auto grid max-w-4xl gap-4 md:grid-cols-2">
                  <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-zinc-100">
                        <span aria-hidden className="text-amber-500">
                          🟢
                        </span>
                        Matched Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-200">
                        {gapResult.matchedSkills.length === 0 ? (
                          <li className="text-zinc-500">None</li>
                        ) : (
                          gapResult.matchedSkills.map((s) => (
                            <li key={s}>{s}</li>
                          ))
                        )}
                      </ul>
                    </CardContent>
                  </Card>

                  <Card className="border-zinc-800 bg-zinc-900/50">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2 text-zinc-100">
                        <span aria-hidden className="text-amber-500">
                          🔴
                        </span>
                        Missing Skills
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1 text-sm text-zinc-200">
                        {gapResult.missingSkills.length === 0 ? (
                          <li className="text-zinc-500">None</li>
                        ) : (
                          gapResult.missingSkills.map((s) => (
                            <li key={s}>{s}</li>
                          ))
                        )}
                      </ul>
                    </CardContent>
                  </Card>
                </div>

                <section className="mx-auto w-full max-w-4xl rounded-2xl border border-amber-500/35 bg-zinc-950/80 p-5 md:p-6">
                  <div className="mb-5 flex items-center gap-2 text-zinc-100">
                    <span aria-hidden className="text-amber-500">
                      📍
                    </span>
                    <h3 className="text-base font-semibold">Chronological Roadmap</h3>
                  </div>

                  <RoadmapTimeline roadmap={gapResult.roadmap} />
                </section>

                <div className="pt-6">
                  <RoleSpecificInterviewPrep role={selectedJobTitle} />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

