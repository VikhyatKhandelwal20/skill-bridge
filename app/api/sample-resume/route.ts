import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export const runtime = "nodejs";

export async function GET() {
  try {
    const filePath = path.join(
      process.cwd(),
      "src",
      "data",
      "sample_resume.txt",
    );
    const text = await fs.readFile(filePath, "utf8");
    return NextResponse.json({ text });
  } catch (error) {
    console.error("SAMPLE RESUME LOAD ERROR:", error);
    return NextResponse.json(
      { error: "Failed to load sample resume." },
      { status: 500 },
    );
  }
}

