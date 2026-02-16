import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const RUNS_DIR = path.join(process.cwd(), "..", "runs");

export async function GET(_request: NextRequest) {
  try {
    const files = await fs.readdir(RUNS_DIR);
    const jsonFiles = files.filter((file) => file.endsWith(".json"));

    if (jsonFiles.length === 0) {
      return NextResponse.json({ runs: [] });
    }

    const latest = jsonFiles.sort((a, b) => b.localeCompare(a))[0];
    const data = await fs.readFile(path.join(RUNS_DIR, latest), "utf-8");
    return NextResponse.json(JSON.parse(data));
  } catch (error) {
    console.error("Failed to load runs", error);
    return NextResponse.json({ error: "Failed to load runs" }, { status: 500 });
  }
}
