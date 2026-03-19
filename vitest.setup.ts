import "@testing-library/jest-dom/vitest";

// Avoid env.ts throwing during tests that import server routes.
if (!process.env.GROQ_API_KEY) {
  process.env.GROQ_API_KEY = "test-key";
}

