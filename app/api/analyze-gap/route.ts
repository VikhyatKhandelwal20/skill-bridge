import { z } from "zod";
import { generateObject } from "ai";
import { groq } from "@ai-sdk/groq";

import "@/lib/env";
import { GapAnalysisAiSchema, GapAnalysisSchema } from "@/lib/schema";

import jobs from "@/data/jobs.json";
import courses from "@/data/courses.json";
import projects from "@/data/projects.json";

export const runtime = "nodejs";

const BodySchema = z.object({
  userSkills: z.array(z.string()).min(1),
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

function scoreCourseForSkill(
  course: { name: string; provider: string; track: string },
  missingSkill: string,
): number {
  const skillTokens = tokenize(missingSkill);
  if (skillTokens.length === 0) return 0;
  const hay = `${course.name} ${course.provider} ${course.track}`.toLowerCase();
  let score = 0;
  for (const t of skillTokens) {
    if (t.length <= 2) continue;
    if (hay.includes(t)) score += 1;
  }
  return score;
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

function buildFallbackGapAnalysis(params: {
  userSkills: string[];
  targetJobTitle: string;
  targetSkills: string[];
}): z.infer<typeof GapAnalysisSchema> {
  type Course = (typeof courses)[number];
  type Project = (typeof projects)[number];

  const allowedCourseNames = (courses as Course[]).map((c) => c.name);
  const userSet = new Set(params.userSkills.map(normalize));

  // Deterministic fallback: exact-ish overlap for matched/missing.
  const matchedSkills = params.targetSkills.filter((s) =>
    userSet.has(normalize(s)),
  );
  const missingSkills = params.targetSkills.filter(
    (s) => !userSet.has(normalize(s)),
  );

  const missingSelected =
    missingSkills.length > 0
      ? missingSkills.slice(0, 3)
      : params.targetSkills.slice(0, 3);

  const entryCourse =
    (courses as Course[]).find((c) => c.level === "entry") ?? (courses as Course[])[0];

  const fallbackCourseName =
    entryCourse?.name ?? allowedCourseNames[0] ?? "Foundational Learning";

  const pickCourseFor = (missingSkill: string) => {
    let best: Course | null = null;
    let bestScore = -1;
    for (const c of courses as Course[]) {
      const score = scoreCourseForSkill(
        { name: c.name, provider: c.provider, track: c.track },
        missingSkill,
      );
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    return best?.name ?? fallbackCourseName;
  };

  const pickProjectFor = (missingSkill: string) => {
    let best: Project | null = null;
    let bestScore = -1;
    for (const p of projects as Project[]) {
      const score = scoreProjectForSkill(
        {
          id: p.id,
          title: p.title,
          overview: p.overview,
          targetSkills: p.targetSkills,
        },
        missingSkill,
      );
      if (score > bestScore) {
        bestScore = score;
        best = p;
      }
    }
    return best ?? (projects as Project[])[0];
  };

  const roadmap: Array<z.infer<typeof GapAnalysisSchema>["roadmap"][number]> = [];
  let stepNumber = 1;

  for (let i = 0; i < missingSelected.length; i++) {
    const missingSkill = missingSelected[i];

    const courseTitle =
      i === 0 ? fallbackCourseName : pickCourseFor(missingSkill);

    const hydratedCourseTitle = allowedCourseNames.includes(courseTitle)
      ? courseTitle
      : fallbackCourseName;

    roadmap.push({
      stepNumber,
      type: "course",
      title: hydratedCourseTitle,
      description:
        i === 0
          ? `Start with a foundational course that builds the prerequisite concepts needed for ${missingSkill}.`
          : `Use this course to learn the key concepts required for ${missingSkill}.`,
      achievedSkills: [missingSkill],
    });
    stepNumber += 1;

    const project = pickProjectFor(missingSkill);
    roadmap.push({
      stepNumber,
      type: "project",
      project,
      achievedSkills: [missingSkill],
    });
    stepNumber += 1;
  }

  if (roadmap.length === 0) {
    roadmap.push({
      stepNumber: 1,
      type: "course",
      title: fallbackCourseName,
      description: `Start with a foundational course to close the biggest gap.`,
      achievedSkills: missingSelected.length ? [missingSelected[0]] : [],
    });
  }

  return { matchedSkills, missingSkills, roadmap };
}

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
  const projectsList = JSON.stringify(projects, null, 2);

  const allowedCourseNames = (courses as { name: string }[]).map((c) => c.name);

  const userSkillsString = JSON.stringify(userSkills);
  const targetSkillsString = JSON.stringify(job.targetSkills);

  const systemPrompt =
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

  try {
    const result = await generateObject({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      schema: GapAnalysisAiSchema,
      system: systemPrompt,
      prompt:
        `Target job: ${job.title}\n` +
        `Required skills for this job: ${targetSkillsString}\n\n` +
        `User's extracted skills: ${userSkillsString}\n\n` +
        `Produce { matchedSkills, missingSkills, roadmap } following all strict rules. Project steps must contain only projectId.`,
    });

    const aiOutput = GapAnalysisAiSchema.parse(result.object);

    const missingSkillSet = new Set(aiOutput.missingSkills.map(normalize));

    type Project = (typeof projects)[number];
    const projectById = new Map<string, Project>(
      (projects as Project[]).map((p) => [p.id, p]),
    );

    const entryCourse =
      (courses as { name: string; level?: string }[]).find((c) => c.level === "entry") ??
      (courses as { name: string }[])[0];
    const fallbackCourseName = entryCourse?.name ?? allowedCourseNames[0];

    const hydratedRoadmap = aiOutput.roadmap.map((step, idx) => {
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

      // Deterministic replacement if the model returns an unknown projectId.
      const replacementMissing = achievedSkills[0] ?? aiOutput.missingSkills[0] ?? "";
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

    const hydrated = {
      matchedSkills: aiOutput.matchedSkills,
      missingSkills: aiOutput.missingSkills,
      roadmap: hydratedRoadmap,
    };

    return Response.json(GapAnalysisSchema.parse(hydrated));
  } catch (error) {
    // Log details for server-side debugging without leaking provider internals.
    console.error("GAP ANALYSIS ERROR:", error);

    const fallback = buildFallbackGapAnalysis({
      userSkills,
      targetJobTitle: targetRoleTitle,
      targetSkills: job.targetSkills,
    });

    return Response.json(fallback, { status: 200 });
  }
}
