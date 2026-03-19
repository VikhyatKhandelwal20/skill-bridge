"use client";

import { Compass } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent } from "@/components/ui/card";
import type { RoadmapStep } from "@/lib/schema";

export function RoadmapTimeline({ roadmap }: { roadmap: RoadmapStep[] }) {
  const sorted = roadmap.slice().sort((a, b) => a.stepNumber - b.stepNumber);

  return (
    <div className="relative border-l-2 border-zinc-800 pl-7">
      <div className="space-y-6">
        {sorted.map((step, idx) => (
          <div key={`timeline-${step.stepNumber}`} className="relative">
            {step.type === "course" ? (
              <div className="absolute -left-[41px] top-2 flex h-7 w-7 items-center justify-center rounded-full border-2 border-amber-500 bg-zinc-950 text-[11px] font-bold text-amber-400">
                {step.stepNumber}
              </div>
            ) : (
              <div className="absolute -left-[45px] top-2 flex h-9 w-9 items-center justify-center rounded-full border-2 border-amber-400 bg-zinc-900 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                <Compass className="h-4 w-4 text-amber-400" aria-hidden />
              </div>
            )}

            {step.type === "course" ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4">
                <p className="text-xs uppercase tracking-wide text-amber-500">
                  Step {step.stepNumber}
                </p>
                <p className="mt-1 text-sm font-semibold text-zinc-100">
                  Course: {step.title}
                </p>
                <p className="mt-2 text-sm text-zinc-400">{step.description}</p>
                {step.achievedSkills.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {step.achievedSkills.map((s) => (
                      <span
                        key={s}
                        className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200"
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <Card className="bg-zinc-900/50 border border-zinc-800 transition-colors hover:border-amber-500/50">
                <CardContent className="p-4">
                  <p className="text-xs uppercase tracking-wide text-amber-500">
                    Milestone {step.stepNumber}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-100">
                    {step.project.title}
                  </p>
                  <p className="mt-2 text-sm text-zinc-400">
                    {step.project.overview}
                  </p>

                  {step.achievedSkills.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {step.achievedSkills.map((s) => (
                        <span
                          key={s}
                          className="rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-xs text-amber-200"
                        >
                          {s}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-4">
                    <Accordion collapsible>
                      <AccordionItem value={`journey-${step.stepNumber}`}>
                        <AccordionTrigger value={`journey-${step.stepNumber}`}>
                          View Implementation Journey
                        </AccordionTrigger>
                        <AccordionContent value={`journey-${step.stepNumber}`}>
                          <div className="mt-2 space-y-4">
                            {step.project.journeySteps
                              .slice()
                              .sort((a, b) => a.stepNumber - b.stepNumber)
                              .map((js) => (
                                <div
                                  key={`${step.project.id}-${js.stepNumber}`}
                                  className="flex gap-3 rounded-lg border border-zinc-800 bg-zinc-900/30 p-3"
                                >
                                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-500 text-xs font-semibold text-black">
                                    {js.stepNumber}
                                  </span>
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-zinc-100">
                                      {js.name}
                                    </p>
                                    <p className="mt-1 text-xs text-zinc-400">
                                      {js.instruction}
                                    </p>
                                    <p className="mt-2 text-xs italic text-amber-200/90">
                                      {js.learningOutcome}
                                    </p>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </div>
                </CardContent>
              </Card>
            )}

            {idx !== sorted.length - 1 && <div className="h-2" />}
          </div>
        ))}
      </div>
    </div>
  );
}

