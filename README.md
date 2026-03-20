# Skill-Bridge: Cybersecurity Career Gap Analyzer

## Candidate Name
Vikhyat Khandelwal

## Video Link
https://vimeo.com/1175433681?share=copy&fl=sv&fe=ci#t=0

## Scenario Chosen
2. Skill-Bridge Career Navigator

## Estimated Time Spent
5.5-6 hours

---

## Quick Start

**Prerequisites:** Node.js 18+, npm/pnpm, and a free Groq API Key.

**Setup & Run:**
```bash
npm install
# Rename .env.example to .env.local and populate GROQ_API_KEY
npm run dev
```

**Tests:**
```bash
npm run test
# Runs the Vitest suite covering happy paths and AI fallback edge cases
```

---

## AI Disclosure

**Were AI assistants used?**
Yes. The workflow involved a structured collaboration between Gemini, Cursor, and Claude. Gemini was used for conceptual planning and architectural reasoning — translating requirements into structured design decisions. Cursor acted on those decisions, handling code generation and UI scaffolding. Claude was brought in as a final review layer, evaluating the collective output for correctness, schema consistency, and edge case coverage. Throughout, AI was treated as an accelerant for execution, not a replacement for architectural judgment.

**How were suggestions verified?**
AI output was never accepted passively. Suggestions were stress-tested by posing contradictory scenarios, cross-questioning the rationale, and occasionally routing output through a secondary model for an independent read. All logic was ultimately validated through Vitest unit tests, and TypeScript/Zod schemas were used to enforce structural correctness at the boundary between the application and the LLM.

**Examples of suggestions that were rejected or modified:**

1. **PDF Parsing:** When Next.js server-side Webpack conflicts arose with the PDF parser, the suggested resolution was to drop PDF support entirely and simplify scope. This was rejected. A raw text bypass was implemented as a temporary unblocking measure, and native PDF parsing via `pdfjs-dist` was subsequently implemented correctly.

2. **Fallback Logic:** The proposed API failure fallback was a static, hardcoded list of foundational courses — a "happy path" shortcut. This was replaced with a rule-based fallback that performs string-matching against synthetic `courses.json` and `projects.json` datasets, keyed to predefined job roles. The result is a fallback that remains dynamic and contextually relevant regardless of API availability.

3. **Schema Strictness:** Zod's `.optional()` fields were initially suggested to prevent crashes when the LLM omitted data. This was rejected after confirming that Groq's structured JSON mode enforces strict schemas at the root level — optional fields trigger a 400 error. Fields were kept required, with the LLM instructed to return empty arrays `[]` for absent data rather than omitting keys entirely.

---

## Tradeoffs & Prioritization

**What was cut to stay within the 4–6 hour constraint?**

- **UI Complexity:** The interface is a single-page application. A multi-route dashboard with dedicated views per flow was out of scope.
- **Infrastructure:** A separate Python microservice for document parsing was considered but avoided. `pdfjs-dist` was integrated directly into the Next.js server layer for a leaner setup with no additional runtime dependency.
- **Synthetic Data:** The `jobs`, `courses`, and `projects` datasets were intentionally kept small. The priority was pipeline logic and correctness, not dataset breadth.
- **Persistence & Auth:** There is no database or authentication layer. Session state is managed in local React state, with SHA-256 hashing used for identity handling.

**What would be built next with more time?**

- **User Telemetry:** Persisting user progress over time to track learning journeys. Abandonment signals (e.g., dropped courses) would feed back into the recommendation engine to improve the relevance of suggestions over time.
- **Live Job Data:** Replacing the static job descriptions with real-time scraped data, removing the current dependency on manual copy/paste of job postings.

**Known Limitations:**

- **LLM Extraction Quality:** The model occasionally misses niche skills or produces weak correlations between resume content and job requirements. This is partially mitigated by the manual "Edit/Update Skills" toggle exposed in the UI, which allows correction before the gap analysis runs.
- **PDF Compatibility:** `pdfjs-dist` extracts text layers only. Scanned or image-based PDFs will not parse correctly, as OCR is not part of the current pipeline.
