import { z } from "zod";

const RecommendedCertSchema = z.object({
  cert: z.string().min(1),
  confidence: z.number().min(0).max(1),
});

/** Fields the resume LLM is allowed to return (no client-only flags). */
export const ResumeAnalysisAiSchema = z.object({
  skills: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      "Exhaustive, flat list of all technical skills, tools, protocols, and concepts found in the resume.",
    ),
  confidenceScore: z.number().min(0).max(1),
  recommendedCerts: z.array(RecommendedCertSchema).min(1),
});

export type ResumeAnalysisAiOutput = z.infer<typeof ResumeAnalysisAiSchema>;

/** Full resume analysis payload returned to the client (includes fallback marker). */
export const ResumeAnalysisOutputSchema = ResumeAnalysisAiSchema.extend({
  isFallback: z.boolean().optional().default(false),
});

export type ResumeAnalysisOutput = z.infer<
  typeof ResumeAnalysisOutputSchema
>;

// --- Hydrated catalog schemas (frontend rendering) ---

export const JourneyStepSchema = z.object({
  stepNumber: z.number(),
  name: z.string(),
  instruction: z.string(),
  learningOutcome: z.string(),
});

export const ProjectCatalogSchema = z.object({
  id: z.string(),
  title: z.string(),
  associatedRoles: z.array(z.string()),
  targetSkills: z.array(z.string()),
  prerequisiteCourses: z.array(z.string()),
  overview: z.string(),
  journeySteps: z.array(JourneyStepSchema),
});

// --- AI output schemas (what Groq is allowed to return) ---
// Project steps ONLY contain `projectId` (no titles/descriptions/steps).
export const RoadmapCourseStepAiSchema = z.object({
  stepNumber: z.number(),
  type: z.literal("course"),
  title: z.string().describe(
    "Name of the course from courses.json (must match an existing course.name).",
  ),
  description: z.string().describe("Why do this, or what do you build?"),
  achievedSkills: z.array(z.string()).describe(
    "List of missingSkills unlocked after completing this step.",
  ),
});

export const RoadmapProjectStepAiSchema = z.object({
  stepNumber: z.number(),
  type: z.literal("project"),
  projectId: z.string().describe(
    "Most relevant project id from projects.json (must match an existing projects[].id).",
  ),
  achievedSkills: z.array(z.string()).describe(
    "List of missingSkills unlocked after completing this step.",
  ),
});

export const RoadmapStepAiSchema = z.discriminatedUnion("type", [
  RoadmapCourseStepAiSchema,
  RoadmapProjectStepAiSchema,
]);

export const GapAnalysisAiSchema = z.object({
  matchedSkills: z.array(z.string()).describe(
    "Semantic and conceptual matches between user skills and target role.",
  ),
  missingSkills: z.array(z.string()).describe(
    "The actual conceptual and technical gaps.",
  ),
  targetSkills: z.array(z.string()).describe(
    "Required. List of technical skills extracted from the custom JD. If NO custom JD is provided, you MUST return an empty array [].",
  ),
  roadmap: z.array(RoadmapStepAiSchema).describe(
    "Chronological interleaving of courses and projectId-selected projects.",
  ),
});

export type GapAnalysisAiOutput = z.infer<typeof GapAnalysisAiSchema>;

// --- Hydrated output schemas (sent to frontend) ---

export const RoadmapCourseStepSchema = RoadmapCourseStepAiSchema;

export const RoadmapProjectStepSchema = z.object({
  stepNumber: z.number(),
  type: z.literal("project"),
  project: ProjectCatalogSchema,
  achievedSkills: z.array(z.string()),
});

export const RoadmapStepSchema = z.discriminatedUnion("type", [
  RoadmapCourseStepSchema,
  RoadmapProjectStepSchema,
]);

export const GapAnalysisSchema = z.object({
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  targetSkills: z.array(z.string()).optional(),
  roadmap: z.array(RoadmapStepSchema),
  /** True when rule-based logic was used (e.g., Groq unavailable or invalid output). */
  isFallback: z.boolean().optional().default(false),
});

export type RoadmapStep = z.infer<typeof RoadmapStepSchema>;
export type GapAnalysisOutput = z.infer<typeof GapAnalysisSchema>;

