import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import jobs from "@/data/jobs.json";
import projects from "@/data/projects.json";
import { CUSTOM_JD_FALLBACK_ERROR } from "@/lib/fallback";
import { ResumeUploadAndAnalyze } from "./ResumeUploadAndAnalyze";

function getFetchUrl(input: string | Request): string {
  return typeof input === "string" ? input : input.url;
}

describe("ResumeUploadAndAnalyze (PDF + FormData architecture)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("Successfully submits pasted text and renders roadmap", async () => {
    const mockedAnalysis = {
      skills: ["TCP/IP", "Networking"],
      confidenceScore: 0.8,
      recommendedCerts: [{ cert: "PCNSA", confidence: 0.6 }],
      isFallback: false,
    };

    const mockedGap = {
      matchedSkills: ["Networking Fundamentals"],
      missingSkills: ["PAN-OS"],
      roadmap: [
        {
          stepNumber: 1,
          type: "course",
          title: "PCNSA",
          description: "Foundational course to start closing the gap.",
          achievedSkills: ["PAN-OS"],
        },
        {
          stepNumber: 2,
          type: "project",
          project: projects[0],
          achievedSkills: ["PAN-OS"],
        },
      ],
      isFallback: false,
    };

    const formDataResponse = {
      analysis: mockedAnalysis,
      gapResult: mockedGap,
      extractedText: "Sample resume text",
    };

    const fetchMock = vi.fn(async (input: string | Request) => {
      const url = getFetchUrl(input);
      if (url.includes("/api/analyze-gap")) {
        return new Response(JSON.stringify(formDataResponse), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/sample-resume")) {
        return new Response(JSON.stringify({ text: "sample" }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: "not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    });

    // @ts-expect-error - test-time override
    global.fetch = fetchMock;

    render(<ResumeUploadAndAnalyze initialTab="text" />);

    const textarea = screen.getByPlaceholderText(
      "Paste your resume text here...",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Sample resume text" } });

    fireEvent.click(screen.getByRole("combobox"));
    const roleSearch = screen.getByPlaceholderText("Search roles...");
    fireEvent.change(roleSearch, {
      target: { value: (jobs as { title: string }[])[0].title },
    });
    fireEvent.click(screen.getByText((jobs as { title: string }[])[0].title));

    const analyzeBtn = screen.getByRole("button", { name: "Analyze" });
    fireEvent.click(analyzeBtn);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalled();
    });

    const analyzeGapCall = fetchMock.mock.calls.find(([url]) =>
      getFetchUrl(url).includes("/api/analyze-gap"),
    );
    expect(analyzeGapCall).toBeDefined();
    const [, init] = analyzeGapCall!;
    expect(init?.body).toBeInstanceOf(FormData);
    const body = init?.body as FormData;
    expect(body.get("targetRole")).toBe((jobs as { title: string }[])[0].title);
    expect(body.get("text")).toBe("Sample resume text");

    await waitFor(() => {
      expect(screen.getByText("Networking Fundamentals")).toBeInTheDocument();
    });
    expect(screen.getByText("Chronological Roadmap")).toBeInTheDocument();
  });

  it("Triggers deterministic fallback when AI fails", async () => {
    const fetchMock = vi.fn(async () => {
      return new Response(
        JSON.stringify({ error: "Internal Server Error" }),
        { status: 500, headers: { "Content-Type": "application/json" } },
      );
    });

    // @ts-expect-error - test-time override
    global.fetch = fetchMock;

    render(<ResumeUploadAndAnalyze initialTab="text" />);

    const textarea = screen.getByPlaceholderText(
      "Paste your resume text here...",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, { target: { value: "Sample resume text" } });

    fireEvent.click(screen.getByRole("combobox"));
    const roleSearch = screen.getByPlaceholderText("Search roles...");
    fireEvent.change(roleSearch, {
      target: { value: (jobs as { title: string }[])[0].title },
    });
    fireEvent.click(screen.getByText((jobs as { title: string }[])[0].title));

    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(
      () => {
        expect(screen.getByText(/AI.*unavailable|rule-based/i)).toBeInTheDocument();
      },
      { timeout: 3000 },
    );
  });

  it("API returns error when Custom JD is used during AI fallback", async () => {
    const fetchMock = vi.fn(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({ error: CUSTOM_JD_FALLBACK_ERROR }),
          { status: 500, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );
    // @ts-expect-error - test-time override
    global.fetch = fetchMock;

    render(
      <ResumeUploadAndAnalyze
        initialTab="text"
        initialRoleMode="custom"
        initialJdText="sample jd"
      />,
    );
    fireEvent.change(
      screen.getByPlaceholderText("Paste your resume text here..."),
      { target: { value: "resume" } },
    );
    fireEvent.click(screen.getByRole("button", { name: "Analyze" }));

    await waitFor(() => {
      expect(screen.getByText(/Custom Job Descriptions require AI/)).toBeInTheDocument();
    });
  });
});
