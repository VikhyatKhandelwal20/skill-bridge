export const SESSION_STORAGE_PREFIX = "skill-bridge:resume-analysis:v1";

async function sha256Hex(text: string): Promise<string> {
  // Browser path (preferred): uses Web Crypto.
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(text);
    const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
    return Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  }

  // Server path: fall back to Node's crypto if Web Crypto isn't available.
  // Use plain "crypto" to keep Next/Webpack compatible.
  const nodeCrypto = await import("crypto");
  return nodeCrypto.createHash("sha256").update(text, "utf8").digest("hex");
}

export async function getResumeTextHash(resumeText: string): Promise<string> {
  return sha256Hex(resumeText);
}

// Preferred name for hashing resume text (SHA-256 hex).
export const hashResumeText = getResumeTextHash;

export async function getResumeAnalysisCacheKey(
  resumeText: string,
): Promise<string> {
  const hash = await getResumeTextHash(resumeText);
  return getResumeAnalysisCacheKeyFromHash(hash);
}

export function getResumeAnalysisCacheKeyFromHash(
  resumeTextHash: string,
): string {
  return `${SESSION_STORAGE_PREFIX}:${resumeTextHash}`;
}

export async function getCachedResumeAnalysis<T>(
  resumeText: string,
): Promise<T | null> {
  if (typeof window === "undefined") return null;
  if (!window.sessionStorage) return null;

  const key = await getResumeAnalysisCacheKey(resumeText);
  const raw = window.sessionStorage.getItem(key);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    // If cache is corrupted, ignore it and let the caller re-compute.
    return null;
  }
}

export async function setCachedResumeAnalysis<T>(
  resumeText: string,
  value: T,
): Promise<void> {
  if (typeof window === "undefined") return;
  if (!window.sessionStorage) return;

  const key = await getResumeAnalysisCacheKey(resumeText);
  window.sessionStorage.setItem(key, JSON.stringify(value));
}

/**
 * Wrap an AI call with sessionStorage caching keyed by SHA-256(resumeText).
 * This prevents redundant Groq requests within the same browser tab.
 */
export async function getOrCreateCachedResumeAnalysis<T>(
  resumeText: string,
  compute: () => Promise<T>,
): Promise<T> {
  const cached = await getCachedResumeAnalysis<T>(resumeText);
  if (cached) return cached;

  const value = await compute();
  await setCachedResumeAnalysis(resumeText, value);
  return value;
}

