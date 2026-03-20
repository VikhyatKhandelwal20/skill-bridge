"use client";

import * as React from "react";
import { FileText, FileUp, Loader2, TriangleAlert, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ResumeAnalysisResultsSectionWithBoundary } from "@/components/ResumeAnalysisResultsSectionWithBoundary";
import { RoadmapTimeline } from "@/components/RoadmapTimeline";
import { RoleCombobox } from "@/components/RoleCombobox";
import {
  ResumeAnalysisOutputSchema,
  type ResumeAnalysisOutput,
  type GapAnalysisOutput,
} from "@/lib/schema";

import jobsData from "@/data/jobs.json";
import { RoleSpecificInterviewPrep } from "@/components/RoleSpecificInterviewPrep";
import { CUSTOM_JD_FALLBACK_ERROR } from "@/lib/fallback";

type RoleMode = "predefined" | "custom";

export function ResumeUploadAndAnalyze({
  initialTab = "upload",
  initialRoleMode = "predefined",
  initialJdText = "",
}: {
  initialTab?: "upload" | "text";
  initialRoleMode?: RoleMode;
  initialJdText?: string;
} = {}) {
  const [resumeText, setResumeText] = React.useState("");
  const [pastedText, setPastedText] = React.useState("");
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [activeTab, setActiveTab] = React.useState(initialTab);
  const [roleMode, setRoleMode] = React.useState<RoleMode>(initialRoleMode);
  const [jdTab, setJdTab] = React.useState<"upload" | "text">("text");
  const [jdPdfFile, setJdPdfFile] = React.useState<File | null>(null);
  const [jdPastedText, setJdPastedText] = React.useState(initialJdText);
  const [analysis, setAnalysis] = React.useState<ResumeAnalysisOutput | null>(
    null,
  );
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [isLoadingSample, setIsLoadingSample] = React.useState(false);
  const [editableSkills, setEditableSkills] = React.useState<string[]>([]);
  const [skillDraft, setSkillDraft] = React.useState("");
  const [selectedJobTitle, setSelectedJobTitle] = React.useState("");
  const [gapResult, setGapResult] = React.useState<GapAnalysisOutput | null>(
    null,
  );

  const isBusy = isAnalyzing;
  const jobs = jobsData as { title: string; targetSkills: string[] }[];

  React.useEffect(() => {
    if (analysis) {
      setEditableSkills(analysis.skills);
      setSkillDraft("");
    } else {
      setEditableSkills([]);
      setSkillDraft("");
      setGapResult(null);
    }
  }, [analysis]);

  async function handleAnalyze() {
    const hasResumePdf = activeTab === "upload" && pdfFile && pdfFile.size > 0;
    const hasResumeText = activeTab === "text" && pastedText.trim().length > 0;

    if (!hasResumePdf && !hasResumeText) {
      setErrorMessage(
        activeTab === "upload"
          ? "Please upload a PDF file for your resume."
          : "Please paste your resume text.",
      );
      return;
    }

    if (roleMode === "predefined") {
      if (!selectedJobTitle.trim()) {
        setErrorMessage("Please select a target role.");
        return;
      }
    } else {
      const hasJdPdf = jdTab === "upload" && jdPdfFile && jdPdfFile.size > 0;
      const hasJdText = jdTab === "text" && jdPastedText.trim().length > 0;
      if (!hasJdPdf && !hasJdText) {
        setErrorMessage(
          jdTab === "upload"
            ? "Please upload a PDF for the Job Description."
            : "Please paste the Job Description text.",
        );
        return;
      }
    }

    setErrorMessage(null);
    setAnalysis(null);
    setGapResult(null);
    setIsAnalyzing(true);

    try {
      const formData = new FormData();

      if (roleMode === "predefined") {
        formData.set("targetRole", selectedJobTitle.trim());
      } else {
        if (jdTab === "upload" && jdPdfFile) {
          formData.set("jdFile", jdPdfFile);
        } else {
          formData.set("jdText", jdPastedText.trim());
        }
      }

      if (hasResumePdf && pdfFile) {
        formData.set("file", pdfFile);
      } else {
        formData.set("text", pastedText.trim());
      }

      const res = await fetch("/api/analyze-gap", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const json = await res.json().catch(() => null);
        throw new Error(json?.error ?? "Analysis failed.");
      }

      const json = (await res.json()) as {
        analysis?: ResumeAnalysisOutput;
        gapResult?: GapAnalysisOutput;
        extractedText?: string;
      };

      if (json.analysis && json.gapResult) {
        const parsed = ResumeAnalysisOutputSchema.safeParse(json.analysis);
        if (parsed.success) {
          setAnalysis(parsed.data);
          setResumeText(json.extractedText ?? pastedText.trim());
        }
        setGapResult(json.gapResult);
      } else {
        throw new Error("Invalid response structure.");
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Analysis failed.",
      );
    } finally {
      setIsAnalyzing(false);
    }
  }

  return (
    <section id="tool" className="scroll-mt-24 mx-auto max-w-6xl px-4 pb-16 pt-6">
      <div className="space-y-6">
        <div className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
            Resume input
          </h2>
          <p className="mt-2 text-sm text-foreground/80">
            Upload a PDF or paste your resume text. Select a target role, then
            click Analyze.
          </p>

          <div className="mt-5 space-y-4">
            <div>
              <label className="block text-sm font-medium text-foreground/90 mb-2">
                Target role
              </label>
              <Tabs
                value={roleMode}
                onValueChange={(v) => {
                  setRoleMode(v as RoleMode);
                  if (v === "predefined") {
                    setJdPdfFile(null);
                    setJdPastedText("");
                  } else {
                    setSelectedJobTitle("");
                  }
                  setErrorMessage(null);
                }}
                className="w-full"
              >
                <TabsList className="grid w-full grid-cols-2 mb-3">
                  <TabsTrigger
                    value="predefined"
                    className="flex items-center gap-2"
                  >
                    Select Predefined Role
                  </TabsTrigger>
                  <TabsTrigger value="custom" className="flex items-center gap-2">
                    Upload Custom JD
                  </TabsTrigger>
                </TabsList>
                {roleMode === "predefined" && (
                  <div className="mt-2">
                    <RoleCombobox
                      options={jobs.map((j) => ({ title: j.title }))}
                      value={selectedJobTitle}
                      disabled={isBusy}
                      onChange={setSelectedJobTitle}
                    />
                  </div>
                )}
                {roleMode === "custom" && (
                  <Tabs
                    value={jdTab}
                    onValueChange={(v) => setJdTab(v as "upload" | "text")}
                    className="mt-2 w-full"
                  >
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="upload" className="flex items-center gap-2">
                        <FileUp className="h-4 w-4" />
                        Upload PDF
                      </TabsTrigger>
                      <TabsTrigger value="text" className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Paste Text
                      </TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload" className="mt-4">
                      <label
                        htmlFor="jd-pdf-upload"
                        className="flex flex-col items-center justify-center w-full min-h-[100px] rounded-md border border-dashed border-input bg-background/50 px-4 py-4 cursor-pointer hover:bg-background/80 transition-colors"
                      >
                        <FileUp className="h-8 w-8 text-muted-foreground mb-2" />
                        <span className="text-sm text-foreground/80">
                          {jdPdfFile
                            ? jdPdfFile.name
                            : "Drop JD PDF or click to browse"}
                        </span>
                        <input
                          id="jd-pdf-upload"
                          type="file"
                          accept=".pdf"
                          className="sr-only"
                          disabled={isBusy}
                          onChange={(e) => {
                            setJdPdfFile(e.target.files?.[0] ?? null);
                            setErrorMessage(null);
                          }}
                        />
                      </label>
                    </TabsContent>
                    <TabsContent
                      value="text"
                      className="mt-4"
                      forceMount
                      hidden={jdTab !== "text"}
                    >
                      <textarea
                        className="w-full min-h-[100px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        placeholder="Paste Job Description text here..."
                        value={jdPastedText}
                        onChange={(e) => {
                          setJdPastedText(e.target.value);
                          setErrorMessage(null);
                        }}
                        disabled={isBusy}
                      />
                    </TabsContent>
                  </Tabs>
                )}
              </Tabs>
            </div>

            <Tabs
              defaultValue="upload"
              value={activeTab}
              onValueChange={(v) => setActiveTab(v as "text" | "upload")}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload" className="flex items-center gap-2">
                  <FileUp className="h-4 w-4" />
                  Upload PDF
                </TabsTrigger>
                <TabsTrigger value="text" className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Paste Text
                </TabsTrigger>
              </TabsList>
              <TabsContent value="upload" className="mt-4">
                <label
                  htmlFor="pdf-upload"
                  className="flex flex-col items-center justify-center w-full min-h-[140px] rounded-md border border-dashed border-input bg-background/50 px-4 py-6 cursor-pointer hover:bg-background/80 transition-colors"
                >
                  <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
                  <span className="text-sm text-foreground/80">
                    {pdfFile
                      ? pdfFile.name
                      : "Drop a PDF here or click to browse"}
                  </span>
                  <input
                    id="pdf-upload"
                    type="file"
                    accept=".pdf"
                    className="sr-only"
                    disabled={isBusy}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      setPdfFile(f ?? null);
                      setErrorMessage(null);
                    }}
                  />
                </label>
              </TabsContent>
              <TabsContent
                value="text"
                className="mt-4"
                forceMount
                hidden={activeTab !== "text"}
              >
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <textarea
                    className="w-full min-h-[140px] rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                    placeholder="Paste your resume text here..."
                    value={pastedText}
                    onChange={(e) => {
                      setPastedText(e.target.value);
                      setErrorMessage(null);
                    }}
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
                          err instanceof Error
                            ? err.message
                            : "Failed to load sample resume.",
                        );
                      } finally {
                        setIsLoadingSample(false);
                      }
                    }}
                  >
                    {isLoadingSample ? "Loading..." : "Load Sample Resume"}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                size="sm"
                disabled={
                  isBusy ||
                  (activeTab === "upload"
                    ? !pdfFile?.size
                    : !pastedText.trim()) ||
                  (roleMode === "predefined"
                    ? !selectedJobTitle
                    : jdTab === "upload"
                      ? !jdPdfFile?.size
                      : !jdPastedText.trim())
                }
                onClick={handleAnalyze}
              >
                Analyze
              </Button>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>
                  {isBusy
                    ? "Analyzing..."
                    : "Add resume and target role or custom JD."}
                </span>
                {isBusy && (
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {errorMessage === CUSTOM_JD_FALLBACK_ERROR && (
            <div
              className="flex items-center gap-2 rounded-md border border-amber-500 bg-amber-500/10 px-4 py-3 text-amber-500"
              role="alert"
            >
              <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden />
              <p className="text-sm">{errorMessage}</p>
            </div>
          )}

        <ResumeAnalysisResultsSectionWithBoundary
          resumeText={resumeText}
          analysis={analysis}
          errorMessage={
            errorMessage === CUSTOM_JD_FALLBACK_ERROR ? null : errorMessage
          }
        />

        {analysis && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-border/60 bg-card/70 p-4 backdrop-blur">
              <h3 className="text-sm font-semibold">Update Extracted Skills</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Refine the extracted skills before we generate your roadmap.
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
                  disabled={isBusy}
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
                  disabled={isBusy || !skillDraft.trim()}
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

            {gapResult && (
              <>
                {gapResult.isFallback && (
                  <div
                    className="flex items-center gap-2 rounded-md border border-amber-500 bg-amber-500/10 px-4 py-3 text-amber-500 mb-6"
                    role="status"
                  >
                    <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden />
                    <p className="text-sm">
                      AI analysis is currently unavailable. Displaying rule-based
                      skill mapping and standard curriculum for this role.
                    </p>
                  </div>
                )}

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

