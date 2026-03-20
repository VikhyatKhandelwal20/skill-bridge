"use client";

import * as React from "react";

import { ErrorBoundary } from "@/components/ErrorBoundary";
import { keywordFallback } from "@/lib/keywordFallback";

import type { ResumeAnalysisResultsSectionProps } from "./ResumeAnalysisResultsSection";
import { ResumeAnalysisResultsSection } from "./ResumeAnalysisResultsSection";

export function ResumeAnalysisResultsSectionWithBoundary(
  props: ResumeAnalysisResultsSectionProps & { resumeText: string },
) {
  const { resumeText, ...sectionProps } = props;
  const fallbackAnalysis = React.useMemo(
    () => ({
      ...keywordFallback(resumeText),
      isFallback: true as const,
    }),
    [resumeText],
  );

  return (
    <ErrorBoundary
      fallback={
        <ResumeAnalysisResultsSection
          analysis={fallbackAnalysis}
          errorMessage={null}
        />
      }
    >
      <ResumeAnalysisResultsSection {...sectionProps} />
    </ErrorBoundary>
  );
}

