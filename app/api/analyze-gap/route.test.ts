import { beforeAll, describe, expect, it, vi } from "vitest";

import { GapAnalysisSchema } from "@/lib/schema";
import jobs from "@/data/jobs.json";

import { generateObject } from "ai";

vi.mock("ai", () => {
  return {
    generateObject: vi.fn(),
  };
});

describe("/api/analyze-gap", () => {
  beforeAll(() => {
    // Ensure env.ts doesn't throw at import-time.
    process.env.GROQ_API_KEY = process.env.GROQ_API_KEY ?? "test-key";
  });

  it("returns 200 and matches GapAnalysisSchema for valid payload", async () => {
    const mockedGap = {
      matchedSkills: ["Networking Fundamentals"],
      missingSkills: ["PAN-OS"],
      recommendedCourses: [
        {
          name: "PCNSA",
          provider: "Palo Alto Networks",
          track: "PANW Core Security",
          reason: "Helps cover the missing PAN-OS fundamentals.",
        },
      ],
    };

    // @ts-expect-error generateObject is mocked
    (generateObject as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      object: mockedGap,
    });

    const { POST } = await import("./route");

    const target = (jobs as { title: string }[])[0]?.title;
    expect(target).toBeTruthy();

    const req = new Request("http://localhost/api/analyze-gap", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userSkills: ["TCP/IP", "Cisco ASA", "Wireshark"],
        targetRole: target,
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const json = await res.json();
    const parsed = GapAnalysisSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(json).toEqual(parsed.data);
  });
});

