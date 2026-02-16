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

  const prompt = `Produce MARKDOWN in this exact structure so the dashboard can render readable sections:
## Summary
Paragraph 1 describing lived experience, infrastructure, mood, notable shifts (no bullet). Mention key metrics naturally in prose.

Paragraph 2 continuing the story, highlighting tensions or opportunities, again weaving in metrics. End with a sentence that tees up the detailed sections.

## Actions
- Bullet 1 (2-3 sentences) describing the intervention, why it was deployed, and signals that prompted it.
- Bullet 2 (optional third bullet) ...

## Impact
- Bullet 1 (2-3 sentences) tying a specific action to metric movement, citing the numeric values.
- Bullet 2 ...

## AI Influence
- Bullet 1 (2-3 sentences) explaining how the AI influence score (${ai_influence}) affects daily life, including guardrails or risks.
- Bullet 2 ...

## Next Steps
- Bullet 1 (2-3 sentences) recommending a move tied to the metric under the most stress or with spare capacity, citing the metric value.
- Bullet 2 ...
Use the metrics below to ground every paragraph/bullet with concrete numbers or comparisons:
- Year: ${year}
- GINI: ${gini}
- Civic trust: ${civic_trust}
- Annual emissions: ${emissions}
- Resilience: ${resilience}
- AI influence: ${ai_influence}
Domain context requirements:
- Weave in at least two frontier domains per summary (pick from: medicine/bio, advanced materials/manufacturing, quantum/compute, agrifood, space/geoengineering, social/civic tech).
- Describe how those domains plausibly influence or respond to the metrics (e.g., longevity therapies shifting population structure, quantum labs stressing governance).
Rules:
1. Summary must read like a short report (no numbered lists) and include sensory/contextual cues.
2. Every bullet must mention at least one plausible driver/cause and reference the relevant metric value.
3. Keep the tone human and observational—vary sentence structure.
4. Do not reuse wording between sections; vary which domains you spotlight from call to call.
5. Next Steps must explicitly reference the metric value it aims to improve or protect (e.g., "Civic trust is 0.42, so...").`;

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
