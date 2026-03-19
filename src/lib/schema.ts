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

// Gap analysis: user skills vs target job → matched, missing, recommended courses.
const RecommendedCourseSchema = z.object({
  name: z.string().min(1),
  // Groq's json_schema validator requires all properties to be listed in `required`
  // for item objects. We keep these as required strings (empty string allowed)
  // so the schema is structurally compatible.
  provider: z.string(),
  track: z.string(),
  reason: z.string(),
});

export const GapAnalysisSchema = z.object({
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  recommendedCourses: z.array(RecommendedCourseSchema),
});

export type GapAnalysisOutput = z.infer<typeof GapAnalysisSchema>;

