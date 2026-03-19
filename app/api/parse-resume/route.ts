import { PDFParse } from "pdf-parse";
import { z } from "zod";

export const runtime = "nodejs";

const UploadSchema = z.object({
  // In Next.js route handlers, `File` comes from the Web runtime and its
  // identity can vary; validate by shape instead of `instanceof File`.
  file: z
    .any()
    .refine(
      (value) =>
        typeof value === "object" &&
        value !== null &&
        typeof (value as { arrayBuffer?: unknown }).arrayBuffer === "function",
      { message: "Invalid file upload object." },
    ),
});

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("resume");

    const parsed = UploadSchema.safeParse({ file });
    if (!parsed.success) {
      return Response.json(
        { error: "Invalid upload payload." },
        { status: 400 },
      );
    }

    const arrayBuffer = await parsed.data.file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const pdf = new PDFParse({ data: buffer });
    const textResult = await pdf.getText();
    await pdf.destroy();

    const text = (textResult.text ?? "").trim();
    if (!text) {
      return Response.json(
        { error: "Could not extract text from the resume PDF." },
        { status: 400 },
      );
    }

    return Response.json({ text });
  } catch {
    return Response.json(
      { error: "Failed to parse resume PDF." },
      { status: 400 },
    );
  }
}

