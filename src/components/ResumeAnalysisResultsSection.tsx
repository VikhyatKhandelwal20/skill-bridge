"use client";

import * as React from "react";

import type { ResumeAnalysisOutput } from "@/lib/schema";

export interface ResumeAnalysisResultsSectionProps {
  analysis: ResumeAnalysisOutput | null;
  errorMessage?: string | null;
}

export function ResumeAnalysisResultsSection({
  analysis,
  errorMessage,
}: ResumeAnalysisResultsSectionProps) {
  if (errorMessage) {
    // Intentionally throw so ErrorBoundary can isolate LLM failures.
    throw new Error(errorMessage);
  }

  if (!analysis) {
    return (
      <div className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
        <h2 className="text-base font-semibold">AI Analysis Results</h2>
        <p className="mt-2 text-sm text-foreground/80">
          Upload your resume to generate skills, confidence scoring, and
          recommended PANW certification tracks.
        </p>
        <p className="mt-4 text-xs text-muted-foreground">
          Tip: analysis is cached by a SHA-256 hash in sessionStorage to avoid
          redundant Groq calls.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">AI Analysis Results</h2>
        <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
          Confidence: {(analysis.confidenceScore * 100).toFixed(0)}%
        </div>
      </div>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Top Skills</h3>
          <ul className="mt-3 space-y-2">
            {analysis.skills.map((s) => (
              <li key={s.name} className="flex items-center justify-between gap-3">
                <span className="text-sm">{s.name}</span>
                <span className="text-xs text-muted-foreground">
                  {(s.confidence * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3 className="text-sm font-semibold">Recommended Certs</h3>
          <ul className="mt-3 space-y-2">
            {analysis.recommendedCerts.map((c) => (
              <li key={c.cert} className="flex items-center justify-between gap-3">
                <span className="text-sm">{c.cert}</span>
                <span className="text-xs text-muted-foreground">
                  {(c.confidence * 100).toFixed(0)}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

