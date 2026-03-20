import { generateObject } from "ai";
import { groq } from "@ai-sdk/groq";

import "@/lib/env";
import {
  ResumeAnalysisAiSchema,
  ResumeAnalysisOutputSchema,
} from "@/lib/schema";
import { keywordFallback } from "@/lib/keywordFallback";

/**
 * Runs resume analysis (Groq or keyword fallback) for use in API routes.
 * Used by /api/resume-analysis and by /api/analyze-gap when handling FormData.
 */
export async function runResumeAnalysis(resumeText: string): Promise<{
  output: import("@/lib/schema").ResumeAnalysisOutput;
  isFallback: boolean;
}> {
  try {
    const systemPrompt = `You are an elite Senior Technical Recruiter and Cybersecurity Talent Screener.
Your ONLY job is to extract an EXHAUSTIVE, granular list of technical skills, tools, frameworks, concepts, and certifications from the provided resume text.

CRITICAL EXTRACTION RULES:
1. Scan Line-by-Line: Do not summarize. Read every single bullet point in the "Experience" and "Projects" sections.
2. Explicit Skills: Capture everything listed in "Skills" or "Technical Proficiency" sections exactly as written (e.g., "C++", "React.js", "Docker").
3. Implicit/Correlated Skills: If a candidate mentions building a "MERN platform", you MUST extract "MongoDB", "Express.js", "React", and "Node.js". If they mention "AWS ECR", extract "AWS" and "Container Registry".
4. Security & Networking Concepts: Look closely for protocols, security concepts, and networking terms (e.g., "JWT", "OAuth", "SSE", "RBAC", "TCP/IP", "Row-level security", "CI/CD").
5. Granularity: Break down broad statements. If they say "Managed Linux servers (Ubuntu/RHEL)", extract "Linux", "Ubuntu", "RHEL", and "Server Administration".

Then recommend Palo Alto Networks certifications (PCNSA, PCNSE, PCCET, etc.) that align with the extracted skills. Use confidence scores 0-1 for overall and per-cert.`;

    const userPrompt = `Here is the candidate's resume text:\n\n${resumeText}\n\nExtract the exhaustive list of skills following the strict extraction rules, then recommend certifications.`;

    const result = await generateObject({
      model: groq("meta-llama/llama-4-scout-17b-16e-instruct"),
      schema: ResumeAnalysisAiSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.1,
    });

    const aiPayload = ResumeAnalysisAiSchema.parse(result.object);
    const uniqueSkills = Array.from(
      new Set(aiPayload.skills.map((s) => s.trim()).filter(Boolean)),
    );
    const output = ResumeAnalysisOutputSchema.parse({
      ...aiPayload,
      skills: uniqueSkills.length > 0 ? uniqueSkills : aiPayload.skills,
      isFallback: false,
    });
    return { output, isFallback: false };
  } catch (error) {
    console.error(
      "AI Generation Failed, triggering resume keyword fallback:",
      error,
    );
    const fallbackPayload = keywordFallback(resumeText);
    const output = ResumeAnalysisOutputSchema.parse({
      ...fallbackPayload,
      isFallback: true,
    });
    return { output, isFallback: true };
  }
}
