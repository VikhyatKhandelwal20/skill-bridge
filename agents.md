# Skill-Bridge AI Architecture (`agents.md`)

## Overview

Skill-Bridge uses a **multi-stage AI pipeline** built with the **Vercel AI SDK** and **Groq’s** hosted `meta-llama/llama-4-scout-17b-16e-instruct` model. Each stage is a distinct “agent”: structured prompts, strict **Zod** schemas, and server-side execution (Next.js App Router API routes / shared libs) keep outputs predictable and safe for the UI. When the provider fails, **deterministic fallbacks** preserve core functionality—especially for predefined roles.

---

## Agent 1: The Resume Extraction Agent

**Persona:** Framed as an **elite Senior Technical Recruiter and talent screener** in the system prompt.

**Responsibility:** Turn raw resume text (from pasted text or PDF-extracted text) into a **structured resume analysis**: exhaustive `skills[]`, overall `confidenceScore`, and `recommendedCerts[]`.

**Determinism:** Calls use **`temperature: 0.1`** so extraction stays stable and less prone to skipping “minor” skills or over-summarizing.

**Extraction strategy (prompt):**

- **Line-by-line:** Emphasis on Experience and Projects bullets, not a single summary paragraph.
- **Explicit skills:** Names from dedicated skills sections are captured as written.
- **Implicit / correlated skills:** Examples like MERN → MongoDB, Express.js, React, Node.js; AWS ECR → AWS, container registry concepts.
- **Security & networking:** Protocols and patterns (e.g. JWT, OAuth, RBAC, TCP/IP, CI/CD).
- **Granularity:** Broad phrases are split (e.g. “Ubuntu/RHEL servers” → Linux, Ubuntu, RHEL, server administration).

**Post-processing:** Skills are **trimmed and de-duplicated** (`Set`) before the response is merged into the full `ResumeAnalysisOutput` (including `isFallback` when not using AI).

**Implementation:** `src/lib/runResumeAnalysis.ts` (`generateObject` + `ResumeAnalysisAiSchema`); consumed by `/api/resume-analysis` and the **FormData** path in `/api/analyze-gap`.

---

## Agent 2: The Gap Analysis & Roadmap Agent

**Responsibility:** Given a **flat list of user skills** (from Agent 1) and a **target**, produce **matched skills**, **missing skills**, optional **`targetSkills`** (for custom JD flows), and a **chronological `roadmap`** that only references real catalog entries.

**Two target modes:**

1. **Predefined role:** `jobs.json` supplies canonical `targetSkills` for the role title; the model compares resume skills to that baseline semantically (not literal string equality only).
2. **Custom job description (JD):** Text or PDF-derived JD is injected; the model must **extract required skills from the JD** into `targetSkills` (required in schema; use `[]` when not applicable per provider strict JSON rules), then compute matched/missing and the roadmap against that extracted set.

**Strict JSON / schema:**

- Outputs are validated with **Zod** (`GapAnalysisAiSchema` → hydrated `GapAnalysisSchema`).
- **Course steps:** `title` must match a **`courses.json`** `name`.
- **Project steps:** Only **`projectId`** from the model; the server **hydrates** full project objects from **`projects.json`**.
- **Roadmap hygiene:** Duplicate course titles / project IDs are removed with a **seen-id** pass after hydration.

**Implementation:** `app/api/analyze-gap/route.ts` — `runGapAnalysis` + `generateObject` with dynamic system/user prompts for predefined vs custom JD.

---

## The Deterministic Fallback System (No-AI)

**Goal:** If **Groq** errors, times out, or returns invalid structured data, users still get a usable result where possible—**without** inventing new course or project records.

**Resume analysis fallback:** `keywordFallback()` in `src/lib/keywordFallback.ts` — rule- and keyword-driven skills and cert suggestions from resume text; response is marked `isFallback: true`.

**Gap analysis fallback:** `generateRuleBasedRoadmap()` in `src/lib/fallback.ts` — uses **substring / includes-style matching** of predefined role skills against normalized resume text, picks a catalog project (by `associatedRoles` / defaults), and builds a roadmap from **real** prerequisite courses + project. The UI shows an **amber banner** when `isFallback` is true.

**Custom JD + AI failure:** Rule-based gap logic **cannot** infer JD skills reliably, so the API returns a **specific error** (`CUSTOM_JD_FALLBACK_ERROR`) and the UI explains that the user should retry AI or choose a **predefined role** for rule-based fallback.

Together, this yields **high reliability for predefined roles** and **clear expectations** when AI is required (custom JD).
