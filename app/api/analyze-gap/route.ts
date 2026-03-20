export const runtime = "nodejs";

import { z } from "zod";
import { generateObject } from "ai";
import { groq } from "@ai-sdk/groq";

import "@/lib/env";
import { GapAnalysisAiSchema, GapAnalysisSchema } from "@/lib/schema";
import type { GapAnalysisOutput } from "@/lib/schema";
import {
  generateRuleBasedRoadmap,
  CUSTOM_JD_FALLBACK_ERROR,
} from "@/lib/fallback";
import { extractPdfText } from "@/lib/pdf-parser";
import { runResumeAnalysis } from "@/lib/runResumeAnalysis";

import jobs from "@/data/jobs.json";
import courses from "@/data/courses.json";
import projects from "@/data/projects.json";

const BodySchema = z.object({
  userSkills: z.array(z.string()).min(1),
  /** Original resume body text for rule-based skill matching when AI fails. */
  resumeText: z.string().optional(),
  targetRole: z.string().min(1).optional(),
  targetJobTitle: z.string().min(1).optional(),
}).refine(
  (data) => !!(data.targetRole ?? data.targetJobTitle),
  { message: "Either targetRole or targetJobTitle is required." },
);

function normalize(s: string) {
  return s.trim().toLowerCase();
}

function tokenize(s: string): string[] {
  return normalize(s)
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/g)
    .filter(Boolean)
    .slice(0, 12);
}

function scoreProjectForSkill(
  project: {
    id: string;
    title: string;
    overview: string;
    targetSkills: string[];
  },
  missingSkill: string,
): number {
  const skillTokens = tokenize(missingSkill);
  if (skillTokens.length === 0) return 0;

  const hay = `${project.id} ${project.title} ${project.overview} ${project.targetSkills.join(" ")}`.toLowerCase();
  let score = 0;
  for (const t of skillTokens) {
    if (t.length <= 2) continue;
    if (hay.includes(t)) score += 1;
  }
  return score;
}

export async function POST(request: Request) {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return handleFormData(request);
  }

  const body = await request.json().catch(() => null);
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      { error: "Missing or invalid body (userSkills, targetRole or targetJobTitle)." },
      { status: 400 },
    );
  }

  const { userSkills, resumeText, targetRole, targetJobTitle } = parsed.data;
  const targetRoleTitle = targetRole ?? targetJobTitle ?? "";

  try {
    const gapResult = await runGapAnalysis({
      userSkills,
      targetRoleTitle,
      resumeText: resumeText?.trim() ?? userSkills.join(" "),
    });
    return Response.json(gapResult);
  } catch (thrown) {
    if (thrown instanceof Response) return thrown;
    throw thrown;
  }
}

async function handleFormData(request: Request): Promise<Response> {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return Response.json({ error: "Invalid form data." }, { status: 400 });
  }

  const targetRole =
    (formData.get("targetRole") as string | null)?.trim() ??
    (formData.get("targetJobTitle") as string | null)?.trim();
  const file = formData.get("file") as File | null;
  const text = (formData.get("text") as string | null)?.trim();
  const jdFile = formData.get("jdFile") as File | null;
  const jdText = (formData.get("jdText") as string | null)?.trim();

  const hasPredefinedRole = !!targetRole?.trim();
  const hasCustomJd =
    (jdFile && jdFile.size > 0) || !!(jdText && jdText.trim());

  if (!hasPredefinedRole && !hasCustomJd) {
    return Response.json(
      {
        error:
          "Provide either a predefined target role or a custom Job Description (upload PDF or paste text).",
      },
      { status: 400 },
    );
  }
  if (hasPredefinedRole && hasCustomJd) {
    return Response.json(
      {
        error:
          "Provide either a predefined role OR a custom JD, not both.",
      },
      { status: 400 },
    );
  }

  let customJdText: string | undefined;
  if (hasCustomJd) {
    if (jdFile && jdFile.size > 0) {
      try {
        const buffer = await jdFile.arrayBuffer();
        customJdText = await extractPdfText(new Uint8Array(buffer));
      } catch (err) {
        console.error("JD PDF extraction failed:", err);
        return Response.json(
          { error: "Job Description PDF extraction failed. Please upload a valid PDF." },
          { status: 400 },
        );
      }
    } else {
      customJdText = jdText ?? "";
    }
    if (!customJdText?.trim()) {
      return Response.json(
        { error: "No text could be extracted from the Job Description." },
        { status: 400 },
      );
    }
  }

  let resumeText: string;
  if (file && file.size > 0) {
    try {
      const buffer = await file.arrayBuffer();
      resumeText = await extractPdfText(new Uint8Array(buffer));
    } catch (err) {
      console.error("PDF extraction failed:", err);
      return Response.json(
        { error: "PDF extraction failed. Please upload a valid PDF." },
        { status: 400 },
      );
    }
  } else if (text) {
    resumeText = text;
  } else {
    return Response.json(
      { error: "Provide either a PDF file or pasted text for your resume." },
      { status: 400 },
    );
  }

  if (!resumeText.trim()) {
    return Response.json(
      { error: "No text could be extracted from the resume PDF." },
      { status: 400 },
    );
  }

  const { output: analysis } = await runResumeAnalysis(resumeText);
  try {
    const gapResult = await runGapAnalysis({
      userSkills: analysis.skills,
      targetRoleTitle: targetRole ?? "",
      resumeText,
      customJdText,
    });
    return Response.json(
      { analysis, gapResult, extractedText: resumeText },
      { status: 200 },
    );
  } catch (thrown) {
    if (thrown instanceof Response) return thrown;
    if (
      thrown instanceof Error &&
      thrown.message === CUSTOM_JD_FALLBACK_ERROR
    ) {
      return Response.json(
        { error: CUSTOM_JD_FALLBACK_ERROR },
        { status: 500 },
      );
    }
    throw thrown;
  }
}

async function runGapAnalysis(params: {
  userSkills: string[];
  targetRoleTitle: string;
  resumeText: string;
  customJdText?: string;
}): Promise<GapAnalysisOutput> {
  const { userSkills, targetRoleTitle, resumeText, customJdText } = params;

  const coursesList = JSON.stringify(courses, null, 2);
  const projectsList = JSON.stringify(projects, null, 2);
  const allowedCourseNames = (courses as { name: string }[]).map((c) => c.name);

  let systemPrompt: string;
  let userPrompt: string;

  if (customJdText?.trim()) {
    systemPrompt =
      `You are a career gap analyst for cybersecurity roles.\n\n` +
      `TASK: You must first extract the required technical skills from the custom Job Description below. Then compare them against the user's resume skills to find matched and missing skills.\n\n` +
      `Core requirements:\n` +
      `1) Semantic matching (not exact string matching).\n` +
      `2) Foundational prerequisites: recognize that foundational skills (e.g., TCP/IP, Linux) enable advanced concepts.\n` +
      `3) Vendor-agnostic mapping: map vendor concepts to broader skill areas.\n\n` +
      `Output targetSkills: the list of required skills you extracted from the Job Description. Use this for matchedSkills/missingSkills comparison.\n\n` +
      `Roadmap generation:\n` +
      `- Build a logical, chronological progression.\n` +
      `- Interleave {course, project, course, project...}.\n` +
      `- If step.type == "course": step.title MUST exactly match ONE "name" in courses.json.\n` +
      `- If step.type == "project": step.projectId MUST exactly match ONE id in projects.json.\n` +
      `- achievedSkills for each step MUST ONLY contain values from the final missingSkills array.\n\n` +
      `Allowed courses catalog (JSON):\n${coursesList}\n\n` +
      `Allowed projects catalog (JSON):\n${projectsList}\n\n` +
      `You MUST output data strictly matching the provided JSON schema.`;
    userPrompt =
      `Custom Job Description:\n${customJdText}\n\n` +
      `User's extracted resume skills: ${JSON.stringify(userSkills)}\n\n` +
      `Produce { targetSkills, matchedSkills, missingSkills, roadmap }. Extract targetSkills from the JD, then compare with user skills.`;
  } else {
    const job = (jobs as { title: string; targetSkills: string[] }[]).find(
      (j) => j.title === targetRoleTitle,
    );
    if (!job) {
      throw Response.json(
        { error: "Target job not found in jobs.json." },
        { status: 400 },
      );
    }

    const targetSkillsString = JSON.stringify(job.targetSkills);
    systemPrompt =
      `You are a career gap analyst for cybersecurity roles.\n\n` +
      `Core requirements:\n` +
      `1) Semantic matching (not exact string matching).\n` +
      `2) Foundational prerequisites: recognize that foundational skills (e.g., TCP/IP, Linux) enable advanced concepts (e.g., Architecture, Threat Hunting). Group prerequisites into broader job requirements.\n` +
      `3) Vendor-agnostic mapping: if the user mentions a vendor concept (e.g., Cisco ASA), count it as a match for the broader firewall concepts—even if the exact product name differs.\n\n` +
      `Guidance for semantic matching (examples):\n` +
      `- TCP/IP -> networking fundamentals\n` +
      `- BGP -> routing concepts / routing & switching fundamentals\n` +
      `- Cisco ASA -> firewall administration concepts (vendor-agnostic)\n` +
      `- Wireshark -> packet capture / troubleshooting / network analysis\n` +
      `- Linux admin -> operating system fundamentals for security workflows\n\n` +
      `How to fill arrays:\n` +
      `- matchedSkills must list the target job required skill concepts that the user satisfies conceptually.\n` +
      `- missingSkills must include ONLY the actual conceptual/technical gaps the user truly lacks.\n\n` +
      `Roadmap generation:\n` +
      `- Build a logical, chronological progression.\n` +
      `- The roadmap MUST START with a foundational course, then follow with a project to apply the knowledge, then repeat.\n` +
      `- Interleave {course, project, course, project...}.\n\n` +
      `Strictness rules:\n` +
      `- If step.type == "course": step.title MUST exactly match ONE "name" in courses.json. Do not invent course names.\n` +
      `- If step.type == "project": step.projectId MUST exactly match ONE id in projects.json. Do not invent project ids.\n` +
      `- You MUST NOT generate project titles/descriptions/journey steps. For project steps, you can only return projectId.\n` +
      `- When recommending a project, you MUST select the most relevant id from the provided projects catalog based on the missingSkills.\n` +
      `- achievedSkills for each step MUST ONLY contain values from the final missingSkills array.\n\n` +
      `Allowed courses catalog (JSON):\n${coursesList}\n\n` +
      `Allowed projects catalog (JSON):\n${projectsList}\n\n` +
      `You MUST output data strictly matching the provided JSON schema.`;
    userPrompt =
      `Target job: ${job.title}\n` +
      `Required skills for this job: ${targetSkillsString}\n\n` +
      `User's extracted skills: ${JSON.stringify(userSkills)}\n\n` +
      `Produce { targetSkills: [], matchedSkills, missingSkills, roadmap } following all strict rules. Since this is a predefined role, you MUST set targetSkills to an empty array []. Project steps must contain only projectId.`;
  }

  try {
    const result = await generateObject({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      schema: GapAnalysisAiSchema,
      system: systemPrompt,
      prompt: userPrompt,
    });

    const aiOutput = GapAnalysisAiSchema.parse(result.object);

    if (customJdText?.trim() && aiOutput.targetSkills.length === 0) {
      console.warn(
        "Custom JD provided but LLM returned empty targetSkills; using matchedSkills + missingSkills for display.",
      );
    }

    const missingSkillSet = new Set(aiOutput.missingSkills.map(normalize));

    type Project = (typeof projects)[number];
    const projectById = new Map<string, Project>(
      (projects as Project[]).map((p) => [p.id, p]),
    );

    const entryCourse =
      (courses as { name: string; level?: string }[]).find((c) => c.level === "entry") ??
      (courses as { name: string }[])[0];
    const fallbackCourseName = entryCourse?.name ?? allowedCourseNames[0];

    const hydratedSteps = aiOutput.roadmap.map((step, idx) => {
      const achievedSkills = step.achievedSkills.filter((s) =>
        missingSkillSet.has(normalize(s)),
      );

      if (step.type === "course") {
        const title = allowedCourseNames.includes(step.title)
          ? step.title
          : fallbackCourseName;

        return {
          stepNumber: step.stepNumber ?? idx + 1,
          type: "course",
          title,
          description: step.description,
          achievedSkills,
        };
      }

      const foundProject = projectById.get(step.projectId);
      if (foundProject) {
        return {
          stepNumber: step.stepNumber ?? idx + 1,
          type: "project",
          project: foundProject,
          achievedSkills,
        };
      }

      const replacementMissing =
        achievedSkills[0] ?? aiOutput.missingSkills[0] ?? "";
      const bestProject =
        (projects as Project[]).reduce<Project>((best, current) => {
          const s = scoreProjectForSkill(current, replacementMissing);
          const b = scoreProjectForSkill(best, replacementMissing);
          return s > b ? current : best;
        }, (projects as Project[])[0]);

      return {
        stepNumber: step.stepNumber ?? idx + 1,
        type: "project",
        project: bestProject,
        achievedSkills,
      };
    });

    const seenIds = new Set<string>();
    const uniqueRoadmap = hydratedSteps.filter((step) => {
      const id =
        step.type === "project" && step.project
          ? step.project.id
          : step.type === "course"
            ? step.title
            : "";
      if (!id || seenIds.has(id)) return false;
      seenIds.add(id);
      return true;
    });

    const hydrated = {
      matchedSkills: aiOutput.matchedSkills,
      missingSkills: aiOutput.missingSkills,
      targetSkills: aiOutput.targetSkills,
      roadmap: uniqueRoadmap,
      isFallback: false,
    };

    return GapAnalysisSchema.parse(hydrated);
  } catch (error) {
    console.error("AI Generation Failed, triggering fallback:", error);

    const resumeForFallback =
      resumeText?.trim() ? resumeText : userSkills.join(" ");

    try {
      return generateRuleBasedRoadmap(
        resumeForFallback,
        targetRoleTitle,
        customJdText,
      );
    } catch (fallbackErr) {
      if (
        fallbackErr instanceof Error &&
        fallbackErr.message === CUSTOM_JD_FALLBACK_ERROR
      ) {
        throw fallbackErr;
      }
      console.error("Rule-based fallback failed:", fallbackErr);
      throw Response.json(
        { error: "Gap analysis failed and fallback could not be generated." },
        { status: 500 },
      );
    }
  }
}
