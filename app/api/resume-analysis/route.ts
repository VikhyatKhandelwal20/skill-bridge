import { z } from "zod";

import { runResumeAnalysis } from "@/lib/runResumeAnalysis";

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

  const { output } = await runResumeAnalysis(parsed.data.resumeText);
  return Response.json(output);
}
