import { z } from "zod";
import { generateObject } from "ai";
import { groq } from "@ai-sdk/groq";

import "@/lib/env";
import { GapAnalysisSchema } from "@/lib/schema";

import jobs from "@/data/jobs.json";
import courses from "@/data/courses.json";

export const runtime = "nodejs";

const BodySchema = z.object({
  userSkills: z.array(z.string()).min(1),
  targetRole: z.string().min(1).optional(),
  targetJobTitle: z.string().min(1).optional(),
}).refine(
  (data) => !!(data.targetRole ?? data.targetJobTitle),
  { message: "Either targetRole or targetJobTitle is required." },
);

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Missing or invalid body (userSkills, targetRole or targetJobTitle)." },
      { status: 400 },
    );
  }

  const { userSkills, targetRole, targetJobTitle } = parsed.data;
  const targetRoleTitle = targetRole ?? targetJobTitle ?? "";

  const job = (jobs as { title: string; targetSkills: string[] }[]).find(
    (j) => j.title === targetRoleTitle,
  );
  if (!job) {
    return Response.json(
      { error: "Target job not found in jobs.json." },
      { status: 400 },
    );
  }

  const coursesList = JSON.stringify(courses, null, 2);

  const systemPrompt =
    `You are a career gap analyst. Compare the user's skills to the target job's required skills. ` +
    `Output matchedSkills (skills the user has that the job needs), missingSkills (skills the job needs that the user lacks), ` +
    `and recommendedCourses: an array of course objects from the provided list ONLY that address the user's missing skills. ` +
    `Each course object must have: name (string), provider (string), track (string), and reason (string). ` +
    `If any field is not applicable, return an empty string for it. ` +
    `You must ONLY recommend courses from this provided list. Do not invent course names.\n\n` +
    `Allowed courses list (JSON):\n${coursesList}`;

  try {
    const result = await generateObject({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      schema: GapAnalysisSchema,
      system: systemPrompt,
      prompt:
        `Target job: ${job.title}\n` +
        `Required skills for this job: ${JSON.stringify(job.targetSkills)}\n\n` +
        `User's extracted skills: ${JSON.stringify(userSkills)}\n\n` +
        `Compare and output matchedSkills, missingSkills, and recommendedCourses (only from the allowed list).`,
    });

    const output = GapAnalysisSchema.parse(result.object);
    return Response.json(output);
  } catch (error) {
    // Log details for server-side debugging without leaking provider internals.
    console.error("GAP ANALYSIS ERROR:", error);
    return Response.json(
      { error: "Gap analysis failed." },
      { status: 500 },
    );
  }
}
