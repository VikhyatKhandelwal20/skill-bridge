import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import jobs from "@/data/jobs.json";
import projects from "@/data/projects.json";
import { ResumeUploadAndAnalyze } from "./ResumeUploadAndAnalyze";

describe("Gap Analysis UI (Phase 3)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("populates roles from jobs.json and renders gap cards from mocked /api/analyze-gap", async () => {
    const mockedAnalysis = {
      skills: ["TCP/IP"],
      confidenceScore: 0.8,
      recommendedCerts: [{ cert: "PCNSA", confidence: 0.6 }],
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
    };

    const fetchMock = vi.fn(async (url: string) => {
      if (url.includes("/api/resume-analysis")) {
        return new Response(JSON.stringify(mockedAnalysis), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        });
      }
      if (url.includes("/api/analyze-gap")) {
        return new Response(JSON.stringify(mockedGap), {
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

    render(<ResumeUploadAndAnalyze />);

    const textarea = screen.getByPlaceholderText(
      "Paste your resume text here...",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "TCP/IP Cisco ASA Wireshark" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate roadmap" }));

    // Wait until the analysis section renders (select should appear).
    await waitFor(() => {
      expect(screen.getByText(/Confidence:\s*80%/)).toBeInTheDocument();
    });

    const roleCombo = screen.getByRole("combobox") as HTMLInputElement;
    fireEvent.change(roleCombo, { target: { value: jobs[0].title } });
    fireEvent.click(screen.getByText(jobs[0].title));

    // Verify the three cards render mocked gap data.
    await waitFor(() => {
      expect(screen.getByText("Networking Fundamentals")).toBeInTheDocument();
      expect(screen.getAllByText("PAN-OS").length).toBeGreaterThan(0);
      expect(
        screen.getByText(/Foundational course to start closing the gap\./),
      ).toBeInTheDocument();
    });
  });
});

