import jobs from "@/data/jobs.json";
import courses from "@/data/courses.json";
import projects from "@/data/projects.json";

import { GapAnalysisSchema, type GapAnalysisOutput } from "@/lib/schema";

type JobRow = { title: string; targetSkills: string[] };
type CourseRow = { name: string; level?: string };
type ProjectRow = (typeof projects)[number];

/** Error message when custom JD is used but AI fails (no rule-based fallback possible). */
export const CUSTOM_JD_FALLBACK_ERROR =
  "AI analysis is currently unavailable. Custom Job Descriptions require AI to extract skills. Please try again later or select a Predefined Role from the dropdown to use our rule-based fallback.";

/**
 * Deterministic gap analysis + roadmap when AI is unavailable.
 * Skills: substring match of each target skill against normalized resume text.
 * Roadmap: project's prerequisite courses (from catalog) then the associated lab project.
 * When customJdText is provided, throws instead (no rule-based fallback for custom JDs).
 */
export function generateRuleBasedRoadmap(
  resumeText: string,
  roleTitle: string,
  customJdText?: string | null,
): GapAnalysisOutput {
  if (customJdText?.trim()) {
    throw new Error(CUSTOM_JD_FALLBACK_ERROR);
  }

  const normalizedResume = resumeText.toLowerCase();

  const job = (jobs as JobRow[]).find((j) => j.title === roleTitle);
  if (!job) {
    throw new Error("Target job not found in jobs.json.");
  }

  const matchedSkills: string[] = [];
  const missingSkills: string[] = [];

  for (const skill of job.targetSkills) {
    if (normalizedResume.includes(skill.toLowerCase())) {
      matchedSkills.push(skill);
    } else {
      missingSkills.push(skill);
    }
  }

  const projectList = projects as ProjectRow[];
  const selectedProject =
    projectList.find((p) => p.associatedRoles.includes(roleTitle)) ??
    projectList[0];

  const allowedCourseNames = (courses as CourseRow[]).map((c) => c.name);
  const entryCourse =
    (courses as CourseRow[]).find((c) => c.level === "entry") ??
    (courses as CourseRow[])[0];
  const fallbackCourseName =
    entryCourse?.name ?? allowedCourseNames[0] ?? "PCNSA";

  const roadmap: GapAnalysisOutput["roadmap"] = [];
  let stepNumber = 1;

  for (const courseName of selectedProject.prerequisiteCourses) {
    const title = allowedCourseNames.includes(courseName)
      ? courseName
      : fallbackCourseName;

    roadmap.push({
      stepNumber,
      type: "course",
      title,
      description: `Complete ${title} to build prerequisite knowledge before the hands-on lab.`,
      achievedSkills: ["Foundational knowledge"],
    });
    stepNumber += 1;
  }

  roadmap.push({
    stepNumber,
    type: "project",
    project: selectedProject,
    achievedSkills: [...selectedProject.targetSkills],
  });

  return GapAnalysisSchema.parse({
    matchedSkills,
    missingSkills,
    roadmap,
    isFallback: true,
  });
}
