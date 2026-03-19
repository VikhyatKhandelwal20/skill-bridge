import type { ResumeAnalysisOutput } from "@/lib/schema";

import jobs from "@/data/jobs.json";
import courses from "@/data/courses.json";

function normalize(text: string) {
  return text.toLowerCase();
}

function clamp01(n: number) {
  return Math.max(0, Math.min(1, n));
}

type Job = (typeof jobs)[number];
type Course = (typeof courses)[number];

const certKeywordRules: Array<{
  certName: string;
  keywords: string[];
}> = [
  {
    certName: "PCNSA",
    keywords: [
      "pan-os",
      "panos",
      "next-gen firewall",
      "ngfw",
      "security policy",
      "firewall",
      "globalprotect",
      "global protect",
    ],
  },
  {
    certName: "PCNSE",
    keywords: [
      "threat prevention",
      "threat prevention",
      "segmentation",
      "microsegmentation",
      "wildfire",
      "url filtering",
      "dlp",
      "applied threat intelligence",
      "api",
      "panorama",
      "logging",
    ],
  },
  {
    certName: "PCCET",
    keywords: [
      "architecture",
      "design",
      "panorama",
      "high availability",
      "ha",
      "templates",
      "deployment",
      "integration",
    ],
  },
];

function findCourseByName(certName: string): Course | undefined {
  return (courses as Course[]).find((c) => c.name === certName);
}

export function keywordFallback(resumeText: string): ResumeAnalysisOutput {
  const text = normalize(resumeText);

  // 1) Skills: extract matched "targetSkills" from our jobs list.
  const skillHits = new Map<string, number>();
  for (const job of jobs as Job[]) {
    for (const skill of job.targetSkills) {
      if (text.includes(skill.toLowerCase())) {
        skillHits.set(skill, (skillHits.get(skill) ?? 0) + 1);
      }
    }
  }

  const maxSkillHits = Math.max(1, ...Array.from(skillHits.values()));
  const topSkills = Array.from(skillHits.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 7)
    .map(([name]) => name);

  // If we didn't match anything, provide a minimal baseline.
  const skills = topSkills.length
    ? topSkills
    : ["security fundamentals", "threat awareness"];

  // Produce an overall confidence score without per-skill confidence.
  const skillConfidence = clamp01(maxSkillHits / (maxSkillHits + 2));

  // 2) Certs: use keyword rules mapped to PANW cert tracks (then fallback).
  const certCounts = certKeywordRules.map((rule) => {
    let count = 0;
    for (const kw of rule.keywords) {
      if (text.includes(kw.toLowerCase())) count += 1;
    }
    return { certName: rule.certName, count };
  });

  const maxCertCount = Math.max(1, ...certCounts.map((c) => c.count));
  const matchedCerts = certCounts
    .filter((c) => c.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 4)
    .map((c) => {
      const course = findCourseByName(c.certName);
      return {
        cert: course?.name ?? c.certName,
        confidence: clamp01(c.count / maxCertCount),
      };
    });

  if (matchedCerts.length > 0) {
    return {
      skills,
      confidenceScore: clamp01(skillConfidence * 0.9),
      recommendedCerts: matchedCerts,
    };
  }

  // Final fallback: pick two generic certs from our course list.
  const generic = (courses as Course[])
    .filter((c) =>
      ["CompTIA Security+", "GIAC Security Essentials (GSEC)"].includes(
        c.name,
      ),
    )
    .slice(0, 2)
    .map((c) => ({
      cert: c.name,
      confidence: 0.25,
    }));

  return {
    skills,
    confidenceScore: 0.3,
    recommendedCerts: generic.length
      ? generic
      : [{ cert: "CompTIA Security+", confidence: 0.25 }],
  };
}

