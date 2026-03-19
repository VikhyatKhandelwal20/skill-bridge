import * as React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import jobs from "@/data/jobs.json";
import { ResumeUploadAndAnalyze } from "./ResumeUploadAndAnalyze";

describe("Gap Analysis UI (Phase 3)", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
    vi.restoreAllMocks();
  });

  it("populates roles from jobs.json and renders gap cards from mocked /api/analyze-gap", async () => {
    const mockedAnalysis = {
      skills: [{ name: "TCP/IP", confidence: 0.8 }],
      confidenceScore: 0.8,
      recommendedCerts: [{ cert: "PCNSA", confidence: 0.6 }],
    };

    const mockedGap = {
      matchedSkills: ["Networking Fundamentals"],
      missingSkills: ["PAN-OS"],
      recommendedCourses: [
        {
          name: "PCNSA",
          provider: "Palo Alto Networks",
          track: "PANW Core Security",
          reason: "Helps cover missing PAN-OS fundamentals.",
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
      "Paste resume text here to bypass PDF upload...",
    ) as HTMLTextAreaElement;
    fireEvent.change(textarea, {
      target: { value: "TCP/IP Cisco ASA Wireshark" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Submit text" }));

    // Wait until the analysis section renders (select should appear).
    await waitFor(() => {
      expect(screen.getByText(/Confidence:\s*80%/)).toBeInTheDocument();
    });

    const selects = screen.getAllByRole("combobox");
    expect(selects.length).toBeGreaterThan(0);
    const roleSelect = selects[0] as HTMLSelectElement;

    // Validate that options exist from jobs.json.
    const optionTexts = Array.from(roleSelect.options).map(
      (o) => o.textContent,
    );
    expect(optionTexts).toContain(jobs[0].title);

    // Trigger gap analysis.
    fireEvent.change(roleSelect, { target: { value: jobs[0].title } });

    // Verify the three cards render mocked gap data.
    await waitFor(() => {
      expect(screen.getByText("Networking Fundamentals")).toBeInTheDocument();
      expect(screen.getByText("PAN-OS")).toBeInTheDocument();
      // Use fields that are unique to the gap-card itself.
      expect(
        screen.getByText(/Helps cover missing PAN-OS fundamentals\./),
      ).toBeInTheDocument();
    });
  });
});

