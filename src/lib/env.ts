import { z } from "zod";

const EnvSchema = z.object({
  GROQ_API_KEY: z.string().min(1),
});

const parsed = EnvSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `${i.path.join(".")}: ${i.message}`)
    .join(", ");

  throw new Error(
    `Missing or invalid environment variables: ${issues}.`,
  );
}

export const GROQ_API_KEY = parsed.data.GROQ_API_KEY;

