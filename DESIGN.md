# 1. Skill-Bridge Design (`DESIGN.md`)

## 1.1 Problem Statement

Hiring has a consistent gap: candidates submit unstructured resumes (bullet points, experience narratives, and mixed-skill mentions), while employers evaluate against structured role expectations (job families, required technical competencies, and learning prerequisites). This mismatch is especially painful in fast-moving environments where skills evolve and where roles require both foundational concepts and hands-on project experience.

Skill-Bridge bridges this gap by mapping unstructured resume content into:
1. **Predefined role targets** sourced from `jobs.json`, or
2. **Custom Job Descriptions (JDs)** provided by the user (upload PDF or paste text),

and then generating a **chronological learning roadmap** that interleaves:
- foundational courses from `courses.json`, and
- applied lab projects from `projects.json`.

---

## 1.2 Architecture & Tech Stack

Skill-Bridge is built as a Next.js App Router application using a strict, structured AI pipeline:

- **Next.js App Router** for UI and API routes
- **Vercel AI SDK** (`generateObject`) to request strictly-structured outputs from the model
- **Groq API** using `meta-llama/llama-4-scout-17b-16e-instruct` for fast, high-throughput inference
- **Zod** schemas for boundary validation and schema compatibility
- **pdfjs-dist** for server-side PDF text extraction (resume and custom JD ingestion through `/api/analyze-gap`)

### 1.2.1 Multi-Agentic Responsibilities

The app’s “multi-agentic” nature comes from separation of responsibilities:
- 1. Resume extraction (**Agent 1**)
- 2. Gap analysis & roadmap generation (**Agent 2**)
- 3. Deterministic fallback for robustness (**System-level fallback**)

### 1.2.2 Data Sources

Data is primarily sourced from **local JSON catalogs** and remains deterministic after hydration:
- `jobs.json` (role targets)
- `courses.json` (course names + catalog metadata)
- `projects.json` (project catalog + prerequisite courses)
- `interview_questions.json` (frequently asked role-specific interview questions)

### 1.2.3 Developer Experience & Project Management
To ensure high code quality and prevent scope creep within the strict 4–6 hour timebox, this project was built using structured developer workflows:
- **Task Tracking (`tasks.md` & `project.md`):** Used to break down the scenario requirements into atomic, sequential implementation steps. This ensured that core requirements (like the deterministic fallback) were prioritized over superficial UI polish.
- **Decision Log (`tradeoffs.md`):** Maintained to capture architectural pivots in real-time (such as abandoning a Python PDF microservice in favor of a native Node.js parser to save time).
- **AI Guardrails (`.cursorrules`):** Engineered strict rules for the AI coding assistant (Cursor/Gemini) to enforce Next.js App Router conventions, mandate strict TypeScript/Zod typings, and prevent the AI from generating hallucinated dependencies or insecure code. This ensured the AI acted as an accelerator rather than a liability.

---

## 1.3 AI Application & Data Integration

### 1.3.1 Multi-Agentic Flow

Skill-Bridge implements a pipeline aligned to evaluation pillars:

#### 1.3.1.1 Agent 1: Resume Extraction Agent

- **Input:** Resume text (pasted text, or PDF-extracted text)
- **Output:** Exhaustive flat `skills[]`, overall `confidenceScore`, and `recommendedCerts[]`
- **Core behavior:**
  - Deterministic prompt strategy (low temperature) to reduce missed “minor but important” skills
  - Line-by-line scanning emphasis to avoid summarization
  - Explicit and implicit/correlated skill extraction (e.g., MERN → MongoDB/Express/React/Node.js)
  - Deduplication to prevent noisy duplicates before downstream analysis

#### 1.3.1.2 Agent 2: Gap Analysis & Roadmap Agent

- **Input:** `skills[]` from Agent 1 and a role target:
  - Predefined role (`jobs.json`), or
  - Custom JD (user-uploaded via FormData; extracted on the server with `pdfjs-dist`)
- **Output:**
  - `matchedSkills[]`
  - `missingSkills[]`
  - (For custom JD flows) `targetSkills[]` extracted directly from the JD
  - A strictly-structured `roadmap[]` that references only valid catalog items
- **Data integration and hydration:**
  - Model returns roadmap steps with only:
    - Course `title` values (must match `courses.json`)
    - Project `projectId` values (must match `projects.json`)
  - Server-side hydration converts these IDs/names into rich objects for UI rendering
  - De-duplication ensures no repeated courses/projects across final roadmap

### 1.3.2 Strict JSON Schema Enforcement

Both AI stages are executed via Vercel AI SDK structured generation and then validated by Zod:
1. AI output must match the declared root keys and types.
2. Any malformed output triggers the fallback system.
3. This prevents the UI from rendering partial or hallucinated catalog data.

### 1.3.3 Server-Side PDF Parsing

When a user uploads a custom JD PDF (or resume PDF in supported flows), parsing is done in Node via `pdfjs-dist`. The extracted text is then fed into the pipeline; no parsed document artifacts are persisted.

---

## 1.4 Technical Rigor & The Deterministic Fallback

Skill-Bridge prioritizes uptime and predictable behavior through a robust fallback system.

### 1.4.1 When Fallback Triggers

Fallback activates under conditions such as:
- Groq provider errors
- Timeouts or transient API failures
- Invalid structured output that fails Zod parsing

### 1.4.2 How the Fallback Works (No-AI / Rule-Based)

If the AI stage fails, the system routes to deterministic logic:
1. **Resume extraction fallback:** Keyword/rule engine (`keywordFallback()`) produces a deterministic `skills[]` and certification suggestions based on resume text.
2. **Gap analysis fallback:** Rule-based roadmap generator (`generateRuleBasedRoadmap()`) creates a roadmap for **predefined roles** using:
   - Rule/keyword matching against the role’s known target skills
   - Prerequisite courses and selected project hydration from the static catalog

### 1.4.3 UI Resilience & Error Boundaries

While the deterministic fallback protects the API and AI pipeline, the frontend is protected by React Error Boundaries (Next.js `error.tsx` conventions).
- If a catastrophic rendering error occurs (e.g., malformed data somehow bypassing Zod validation), the Error Boundary catches the crash.
- Instead of "white-screening" the application, it gracefully unmounts the broken component tree and displays a user-friendly error state.
- This two-tiered approach—API-level fallbacks and UI-level error boundaries—ensures a highly resilient, enterprise-grade user experience.

### 1.4.4 Guarantee of Availability for Predefined Roles

For predefined role flows, the deterministic system is designed to keep the app usable even when AI fails—ensuring the core UX remains available with a valid roadmap and without requiring users to retry indefinitely.

For custom JDs, fallback behavior is intentionally more conservative: if AI fails while extracting required JD skills, the system returns a specific, user-friendly error explaining that custom JD processing requires AI for reliable skill extraction.

---

## 1.5 Responsible AI & Security

Skill-Bridge is designed to avoid unnecessary data retention and minimize risk:

### 1.5.1 No Database Persistence

No user resume content (including PII-like text found in resumes) is stored in a database.

### 1.5.2 In-Memory Processing & Session Efficiency

Resumes are processed in memory during the request lifecycle:
- PDF parsing occurs on the server as text is extracted.
- The pipeline operates on extracted text and generates output for the UI.

For performance, the app can temporarily cache analysis identity using **SHA-256 hashing**:
- Resume identity is hashed and cached in **browser session storage** to reduce redundant API calls during the same session.

---

## 1.6 Testing Strategy & Quality Assurance

To satisfy the requirement for basic quality and reliability, Skill-Bridge includes a targeted test suite (built with Vitest/React Testing Library) focusing on pipeline resilience rather than superficial UI rendering.

### 1.6.1 Test Scope & Techniques

#### 1.6.1.1 Happy Path Testing

- **End-to-End Analysis:** Tests simulate a successful AI generation cycle, verifying that the API accepts the payload, Vercel AI SDK interacts properly with the mocked Groq provider, and the returned data successfully parses through the strict Zod `GapAnalysisSchema`.
- **Validation:** Ensures that `isFallback` is correctly set to `false` and that the generated roadmap accurately hydrates IDs into full course/project objects.

#### 1.6.1.2 Edge Case & Fallback Testing

- **API Failure Simulation:** The most critical test mocks a catastrophic failure from the Groq API (e.g., simulating a 500 Internal Server Error or a 400 Bad Request due to schema strictness).
- **Graceful Degradation:** The test asserts that the application catches the error, aborts the AI flow, successfully invokes the deterministic `generateRuleBasedRoadmap()` engine, and returns a valid 200 response with `isFallback` set to `true`. This guarantees the core UX never breaks for predefined roles.

#### 1.6.1.3 Input Validation

- **Zod Checks:** Guards both user forms and backend logic, catching missing files or text and blocking bad submissions up front.

#### 1.6.1.4 Minimal Data

- **Empty Resume Handling:** Confirms that submitting an empty or near-empty resume shows a friendly error rather than breaking the flow.

#### 1.6.1.5 Unusual Characters

- **Unicode & Symbols:** Runs with text containing non-standard symbols to ensure parsing and skill extraction do not break.

#### 1.6.1.6 Rapid Submissions

- **Quick Repeats:** Sends the same data in quick succession to confirm caching works and results remain stable.

#### 1.6.1.7 Custom JD Error Paths

- **JD-Only Failures:** Sends hard-to-parse job descriptions and checks that the app explains when custom JD analysis can't run without AI.

#### 1.6.1.8 UI Safeguards

- **Error Boundaries:** Simulates bad data to confirm the UI shows error messages instead of crashing or blanking out.

### 1.6.2 Security Posture

- No secrets are embedded in client code.
- Only server-side routes access the Groq key via validated environment variables.
- API failures are handled gracefully to prevent leaking stack traces or sensitive debugging details to users.

## 1.7 Future Enhancements
While this prototype successfully demonstrates the core mechanics of AI-driven career gap analysis, a production-grade version would benefit from the following architectural and feature expansions:

- **User Telemetry & Adaptive Learning:** Implement a persistent database (e.g., PostgreSQL) to track user progress through their generated roadmaps. By monitoring completion rates and user feedback, the system could employ collaborative filtering to recommend the highest-yield courses and projects based on historical success data.
- **Live Market Data Integration:** Transition from a static `jobs.json` catalog to dynamic web scraping or direct API integrations with job boards (e.g., LinkedIn, Indeed). This would allow the system to analyze real-time market trends and weight skills based on current employer demand.
- **Advanced Document Ingestion (OCR):** Upgrade the ingestion pipeline from basic text extraction (`pdfjs-dist`) to a multimodal or OCR-based approach (e.g., AWS Textract or Gemini 1.5 Pro Vision) to accurately parse scanned, image-based resumes and complex, multi-column layouts.
- **Conversational Mentorship (Agentic UI):** Extend the AI pipeline using an orchestration framework like LangGraph to support conversational follow-ups. After generating the roadmap, users could interact with a persistent “Mentor Agent” to ask clarifying questions about specific courses or request alternative project ideas.

