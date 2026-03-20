"use client";

import * as React from "react";

import { Card, CardContent } from "@/components/ui/card";

// Interview content is static JSON only, keyed by the UI-selected role title — never derived from the gap-analysis API.
import interviewQuestions from "@/data/interview_questions.json";

type Question = {
  type: string;
  question: string;
  focus: string;
};

export function RoleSpecificInterviewPrep({ role }: { role: string }) {
  const questions = (interviewQuestions as Record<string, Question[]>)[role];

  if (!questions || questions.length === 0) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
        <h2 className="text-base font-semibold text-zinc-100">
          Role-Specific Interview Prep
        </h2>
        <p className="mt-2 text-sm text-zinc-400">
          Check back soon for curated questions for this role!
        </p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-base font-semibold text-zinc-100">
        Role-Specific Interview Prep
      </h2>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {questions.map((q, idx) => (
          <Card
            key={`${q.type}-${idx}-${q.focus}`}
            className="bg-zinc-900/50 border-zinc-800"
          >
            <CardContent className="p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex rounded-full border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-500">
                  {q.type}
                </span>
              </div>

              <p className="mt-3 text-zinc-100 font-semibold text-sm">
                {q.question}
              </p>
              <p className="mt-2 text-zinc-400 text-sm italic">
                Focus: {q.focus}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

