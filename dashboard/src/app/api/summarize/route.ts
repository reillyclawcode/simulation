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

  const prompt = `Summarize this simulation snapshot in five labeled sections (Summary, Actions, Impact, AI Influence, Next Steps). Follow this format exactly:
Summary:
- two paragraphs describing the world at this year: start with the lived experience (infrastructure, mood, notable shifts) and weave in the key metrics without listing them. End with a single sentence that teases what to look for in the detailed sections below.
Actions:
- formatted as markdown bullets ("- "), 2-3 bullets where each bullet is 2-3 sentences describing the policy/intervention, why it was used, and the contextual signals that prompted it
Impact:
- formatted as markdown bullets, 2-3 bullets where each bullet is 2-3 sentences explaining how a specific action moved one or more metrics, citing the metric values
AI Influence:
- formatted as markdown bullets, 2-3 bullets where each bullet is 2-3 sentences explaining how the AI influence score (${ai_influence}) is affecting daily life, including guardrails or risks
Next Steps:
- formatted as markdown bullets, 2-3 bullets where each bullet is 2-3 sentences tied to the metric under the most stress or with spare capacity, citing the metric value
Use the metrics below to ground your answer and provide concrete numbers or comparisons whenever possible:
- Year: ${year}
- GINI: ${gini}
- Civic trust: ${civic_trust}
- Annual emissions: ${emissions}
- Resilience: ${resilience}
- AI influence: ${ai_influence}
Rules:
1. Summary should read like a short report rather than a metric list—describe scenes, stakeholders, and moods while still grounding in numbers.
2. Every bullet in Actions, Impact, AI Influence, and Next Steps must contain at least one plausible driver/cause (e.g., budget shifts, social response) and link back to the numeric metrics above.
3. Keep the tone human and observational—avoid robotic phrasing or repeated sentence templates.
4. Do not repeat the same phrasing between sections—tailor each explanation to the current data.
5. Next Steps must reference the specific metric value it aims to improve or protect (e.g., "Civic trust is 0.42, so...").`;

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
