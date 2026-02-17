import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Try local runs folder first (dev), fall back to public/data (Vercel)
const LOCAL_RUNS_DIR = path.join(process.cwd(), "..", "runs");
const PUBLIC_RUNS_FILE = path.join(process.cwd(), "public", "data", "runs.json");

export async function GET(_request: NextRequest) {
  try {
    // Try local runs directory first (for local development)
    try {
      const files = await fs.readdir(LOCAL_RUNS_DIR);
      const jsonFiles = files.filter((file) => file.endsWith(".json"));

      if (jsonFiles.length > 0) {
        const latest = jsonFiles.sort((a, b) => b.localeCompare(a))[0];
        const data = await fs.readFile(path.join(LOCAL_RUNS_DIR, latest), "utf-8");
        return NextResponse.json(JSON.parse(data));
      }
    } catch {
      // Local runs folder doesn't exist, try public folder
    }

    // Fall back to public/data/runs.json (for Vercel deployment)
    const data = await fs.readFile(PUBLIC_RUNS_FILE, "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error("Failed to load runs", error);
    return NextResponse.json({ runs: [] });
  }
}
