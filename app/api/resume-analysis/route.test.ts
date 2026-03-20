import { beforeAll, describe, expect, it, vi } from "vitest";

import {
  ResumeAnalysisAiSchema,
  ResumeAnalysisOutputSchema,
} from "@/lib/schema";

import { generateObject } from "ai";

vi.mock("ai", () => {
  return {
    generateObject: vi.fn(),
  };
});

describe("/api/resume-analysis", () => {
  beforeAll(() => {
    process.env.GROQ_API_KEY = process.env.GROQ_API_KEY ?? "test-key";
  });

  it("returns 200 and isFallback false when Groq succeeds", async () => {
    const mocked = {
      skills: ["TCP/IP"],
      confidenceScore: 0.8,
      recommendedCerts: [{ cert: "PCNSA", confidence: 0.6 }],
    };
    (generateObject as unknown as ReturnType<typeof vi.fn>).mockResolvedValue({
      object: mocked,
    });

    const { POST } = await import("./route");

    const req = new Request("http://localhost/api/resume-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resumeText: "TCP/IP firewall experience" }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    const parsed = ResumeAnalysisOutputSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(json.isFallback).toBe(false);
    expect(ResumeAnalysisAiSchema.safeParse(json).success).toBe(true);
  });

  it("returns 200 with keyword fallback when Groq throws", async () => {
    (generateObject as unknown as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error("Invalid API Key"),
    );

    const { POST } = await import("./route");

    const req = new Request("http://localhost/api/resume-analysis", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        resumeText: "PAN-OS NGFW administration and GlobalProtect",
      }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);
    const json = await res.json();
    const parsed = ResumeAnalysisOutputSchema.safeParse(json);
    expect(parsed.success).toBe(true);
    expect(json.isFallback).toBe(true);
    expect(Array.isArray(json.skills)).toBe(true);
    expect(json.skills.length).toBeGreaterThan(0);
  });
});
