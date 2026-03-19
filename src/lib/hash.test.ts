import {
  getCachedResumeAnalysis,
  getOrCreateCachedResumeAnalysis,
  getResumeAnalysisCacheKey,
  hashResumeText,
  setCachedResumeAnalysis,
} from "./hash";

describe("hash utilities", () => {
  it("hashResumeText is deterministic (SHA-256 hex)", async () => {
    // SHA-256("hello") = 2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824
    const result = await hashResumeText("hello");
    expect(result).toBe(
      "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
    );
  });

  it("setCachedResumeAnalysis stores and getCachedResumeAnalysis retrieves", async () => {
    const resumeText = "some resume text";
    const cacheValue = { foo: "bar" };

    await setCachedResumeAnalysis(resumeText, cacheValue);
    const cached = await getCachedResumeAnalysis<typeof cacheValue>(
      resumeText,
    );

    expect(cached).toEqual(cacheValue);
  });

  it("getOrCreateCachedResumeAnalysis calls compute only on cache miss", async () => {
    const resumeText = "another resume text";
    const value = { answer: 42 };

    const compute = vi.fn(async () => value);

    // Cache miss: compute should run.
    const first = await getOrCreateCachedResumeAnalysis(resumeText, compute);
    expect(first).toEqual(value);
    expect(compute).toHaveBeenCalledTimes(1);

    // Cache hit: compute should not run again.
    const second = await getOrCreateCachedResumeAnalysis(resumeText, compute);
    expect(second).toEqual(value);
    expect(compute).toHaveBeenCalledTimes(1);
  });

  it("getResumeAnalysisCacheKeyFromHash format includes prefix", async () => {
    const resumeText = "key format test";
    const key = await getResumeAnalysisCacheKey(resumeText);
    expect(key).toMatch(/^skill-bridge:resume-analysis:v1:/);
  });
});

