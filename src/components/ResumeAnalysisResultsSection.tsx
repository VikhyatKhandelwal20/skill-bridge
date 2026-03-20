"use client";

import * as React from "react";
import { TriangleAlert } from "lucide-react";

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
          Your analysis is saved during your session so you can explore
          different roles without re-uploading.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border/60 bg-card/70 p-6 backdrop-blur">
      {analysis.isFallback && (
        <div
          className="mb-4 flex items-center gap-2 rounded-md border border-amber-500 bg-amber-500/10 px-4 py-3 text-amber-500"
          role="status"
        >
          <TriangleAlert className="h-5 w-5 shrink-0" aria-hidden />
          <p className="text-sm">
            AI resume extraction is unavailable. Showing rule-based skills and
            cert suggestions derived from your pasted text.
          </p>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <h2 className="text-base font-semibold">AI Analysis Results</h2>
        <div className="rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-muted-foreground">
          Confidence: {(analysis.confidenceScore * 100).toFixed(0)}%
        </div>
      </div>

      <div className="mt-5">
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

