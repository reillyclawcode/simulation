import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export async function POST(request: NextRequest) {
  if (!openai) {
    return NextResponse.json({ error: "OPENAI_API_KEY not configured" }, { status: 500 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "aborted" });
  }
  const { year, gini, civic_trust, emissions, resilience, ai_influence } = body;

  const prompt = `Summarize this simulation snapshot in two parts:
1. A concise 2-3 sentence summary people can grasp immediately.
2. A bullet list (2-3 items) describing the likely actions/policies that led here.
Data:
- Year: ${year}
- GINI: ${gini}
- Civic trust: ${civic_trust}
- Annual emissions: ${emissions}
- Resilience: ${resilience}
- AI influence: ${ai_influence}
Focus on what this means for daily life, AI adoption, and governance. Explain whether the AI influence score is helping or hurting communities.`;

  try {
    const completion = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        { role: "system", content: "You are a civic analyst who explains simulation results in clear, human terms." },
        { role: "user", content: prompt }
      ]
    });

    const text = completion.choices[0]?.message?.content?.trim() || "";
    return NextResponse.json({ summary: text });
  } catch (error) {
    console.error("Failed to generate summary", error);
    return NextResponse.json({ error: "LLM summary failed" }, { status: 500 });
  }
}
