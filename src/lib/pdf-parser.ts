import fs from "fs";
import * as pdfjsLib from "pdfjs-dist/legacy/build/pdf.mjs";

// FIX: Satisfy the worker validation check with a valid path.
// Even on the server, this prevents the "workerSrc not specified" crash.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "pdfjs-dist/legacy/build/pdf.worker.mjs";

/**
 * Extracts text from a PDF file
 * @param input - file path OR buffer
 * @returns Extracted text content
 */
export async function extractPdfText(
  input: string | Uint8Array,
): Promise<string> {
  try {
    const data =
      typeof input === "string"
        ? new Uint8Array(fs.readFileSync(input))
        : input;

    const loadingTask = pdfjsLib.getDocument({
      data,
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
    });

    const pdf = await loadingTask.promise;
    let fullText = "";

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();

      const pageText = textContent.items
        // @ts-expect-error TextItem shape varies across pdfjs-dist versions
        .map((item) => item.str)
        .join(" ");

      fullText += `\n\n--- Page ${i} ---\n\n${pageText}`;
    }

    return fullText.trim();
  } catch (err: unknown) {
    console.error("PDF Parsing Error Details:", err);
    const message = err instanceof Error ? err.message : String(err);
    throw new Error("PDF extraction failed: " + message);
  }
}
