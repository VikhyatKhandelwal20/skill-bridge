import { z } from "zod";
import { generateObject } from "ai";
import { groq } from "@ai-sdk/groq";

import "@/lib/env";
import { ResumeAnalysisOutputSchema } from "@/lib/schema";

export const runtime = "nodejs";

const BodySchema = z.object({
  resumeText: z.string().min(1),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Missing or invalid `resumeText`." },
      { status: 400 },
    );
  }

  try {
    const { resumeText } = parsed.data;

    const result = await generateObject({
      model: groq("llama-3.3-70b-versatile"),
      schema: ResumeAnalysisOutputSchema,
      system:
        "You are a career navigator for Palo Alto Networks cybersecurity roles. " +
        "Analyze the user's resume text and output JSON that matches the provided schema exactly. " +
        "Use confidence scores between 0 and 1.",
      prompt:
        `Resume text:\n\n${resumeText}\n\n` +
        "Extract the most relevant skills and recommend Palo Alto Networks certification(s) that align to the user's skills and goals.",
    });

    // `generateObject` should already conform to schema, but keep a defensive check.
    const output = ResumeAnalysisOutputSchema.parse(result.object);
    return Response.json(output);
  } catch {
    // Avoid leaking provider internals.
    return Response.json(
      { error: "Groq resume analysis failed." },
      { status: 502 },
    );
  }
}

