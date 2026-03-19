import { z } from "zod";

const SkillSchema = z.object({
  name: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

const RecommendedCertSchema = z.object({
  cert: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

// Output contract for the resume analysis LLM call.
export const ResumeAnalysisOutputSchema = z.object({
  skills: z.array(SkillSchema).min(1),
  confidenceScore: z.number().min(0).max(1),
  recommendedCerts: z.array(RecommendedCertSchema).min(1),
});

export type ResumeAnalysisOutput = z.infer<
  typeof ResumeAnalysisOutputSchema
>;

