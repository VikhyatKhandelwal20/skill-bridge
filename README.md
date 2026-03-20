# Skill-Bridge Career Navigator

Skill-Bridge turns pasted resume text into an actionable, chronological learning roadmap for cybersecurity roles.
It intentionally avoids PDF parsing and relies on a strict text-area bypass + caching.

## Key UI flow

- `Hero` -> `About/How it Works` -> `Tool (Paste Text + Select Role)` -> `Results`
- Results keep `Matched Skills` + `Missing Skills` cards.
- The roadmap is rendered as a vertical `RoadmapTimeline` with each step showing `achievedSkills`.

## Architecture (high level)

- `Next.js 14` (App Router) + `Tailwind` + `shadcn/ui`
- AI: `Vercel AI SDK` + `Groq` structured outputs via Zod schemas
- Data: local JSON catalogs only:
  - `src/data/jobs.json`
  - `src/data/courses.json`

## Constraints / tradeoffs

- PDF parsing is intentionally out of scope for this MVP.
- Resume text is hashed with SHA-256 and cached in `sessionStorage` to reduce redundant Groq calls.
- No database or persistent session storage is used for learning checklists; roadmap progress is shown purely from the AI output (`achievedSkills`).
- **Rule-based fallbacks:** If Groq fails, `/api/resume-analysis` returns `keywordFallback()` with HTTP 200 and `isFallback: true`; `/api/analyze-gap` uses `generateRuleBasedRoadmap()` the same way. Both flows show an amber notice in the UI when `isFallback` is set.

## Environment

Create `skill-bridge/.env.local` with:

- `GROQ_API_KEY=...`

## Testing

- `npm test` runs `vitest` for schema + API + UI behavior.

