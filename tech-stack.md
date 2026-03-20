# Tech Stack (Production)

Documentation of what **Skill-Bridge** actually ships with in `skill-bridge/`. Out-of-scope or abandoned experiments are omitted.

---

## Frontend

- **Next.js 14** (App Router)
- **React 18**
- **TypeScript**
- **Tailwind CSS**
- **shadcn/ui-style primitives** (Button, Card, Tabs, Command-style list components, etc.)
- **Lucide Icons**

---

## AI & Data Pipeline

- **Vercel AI SDK** (`generateObject`, structured outputs)
- **Groq API** — model: **`meta-llama/llama-4-scout-17b-16e-instruct`**
- **Zod** — strict validation of AI payloads, gap analysis schemas, and env (`GROQ_API_KEY`)

---

## Utilities

- **pdfjs-dist** — server-side PDF text extraction (`src/lib/pdf-parser.ts`) for resume and job-description uploads in `/api/analyze-gap`
- **Local JSON catalogs** (no external DB): `jobs.json`, `courses.json`, `projects.json`, `interview_questions.json`, etc.

---

## Architecture Patterns

- **Modular pipeline:** Shared `runResumeAnalysis` + `route`-level gap analysis; clear separation between resume extraction and gap/roadmap generation
- **Session / client efficiency:** Resume text can be **SHA-256 hashed** and cached in **`sessionStorage`** (see `src/lib/hash.ts`) to skip redundant analysis calls for the same text during a browser session
- **Deterministic error fallbacks:** Keyword/rules path for resume analysis; `generateRuleBasedRoadmap` for gap analysis when Groq fails — with explicit handling when **custom JD** cannot use rule-based gap logic
- **Server-only secrets:** Env validated on the server; AI and PDF parsing run in **Node** runtime on API routes where required
