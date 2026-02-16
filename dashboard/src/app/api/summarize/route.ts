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

  const {
    year, gini, civic_trust, emissions, resilience, ai_influence,
    inaction_gini, inaction_civic_trust, inaction_emissions, inaction_resilience, inaction_ai_influence,
  } = body;

  const hasInaction = inaction_gini !== undefined && inaction_gini !== null;

  const statusQuoBlock = hasInaction
    ? `
## Status Quo Projection
- Bullet 1 (2-3 sentences) describing the world in ${year} if current trends continue without deliberate intervention. Use the status-quo metrics below to paint a concrete picture of daily life, infrastructure, and social mood under inaction.
- Bullet 2 (2-3 sentences) contrasting the status-quo values with the action-branch values, highlighting what we gain (or lose) by acting. Reference specific metric deltas (e.g., "Without action GINI stays at ${inaction_gini?.toFixed(3)} vs ${gini?.toFixed(3)} with intervention").
- Bullet 3 (2-3 sentences) identifying the biggest risk of inaction — which metric degrades fastest and what second-order effects follow.
`
    : "";

  const statusQuoMetrics = hasInaction
    ? `
Status-quo (no-action) metrics at year ${year}:
- GINI (no action): ${inaction_gini?.toFixed(3)}
- Civic trust (no action): ${inaction_civic_trust?.toFixed(3)}
- Annual emissions (no action): ${inaction_emissions?.toFixed(2)}
- Resilience (no action): ${inaction_resilience?.toFixed(3)}
- AI influence (no action): ${inaction_ai_influence?.toFixed(3)}
`
    : "";

  const prompt = `Produce MARKDOWN in this exact structure so the dashboard can render readable sections:
## Summary
Paragraph 1 describing lived experience, infrastructure, mood, notable shifts (no bullet). Mention key metrics naturally in prose.

Paragraph 2 continuing the story, highlighting tensions or opportunities, again weaving in metrics.


## Baseline comparison
- Bullet 1 (2-3 sentences) comparing the current metrics to 2026 baseline values (use approximations like "GINI from ~0.38 to 0.32").
- Bullet 2 ...
${statusQuoBlock}
## Actions
- Bullet 1 (2-3 sentences) describing the intervention, why it was deployed, and signals that prompted it.
- Bullet 2 (optional third bullet) ...

## Impact
- Bullet 1 (2-3 sentences) tying a specific action to metric movement, citing the numeric values.
- Bullet 2 ...

## AI Influence
- Bullet 1 (2-3 sentences) explaining how the AI influence score (${ai_influence}) affects daily life, including guardrails or risks.
- Bullet 2 ...

## Food & Biosystems
- Bullet 1 (2-3 sentences) covering agrifood, nutrition security, or ecosystem resilience, tying to metrics or second-order effects.
- Bullet 2 ...

## Medicine & Healthspan
- Bullet 1 (2-3 sentences) about medical/bio advances (longevity, therapeutics, diagnostics) shifting population structure or trust.
- Bullet 2 ...

## Materials & Infrastructure
- Bullet 1 (2-3 sentences) about advanced materials, energy storage, or urban systems affecting emissions/resilience/productivity.
- Bullet 2 ...

## Quantum & Compute
- Bullet 1 (2-3 sentences) on quantum breakthroughs, compute policy, or edge AI impacting governance/economy.
- Bullet 2 ...

## Civic Life & Culture
- Bullet 1 (2-3 sentences) describing social cohesion, participatory tools, cultural reactions to the above trends.
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
${statusQuoMetrics}
Rules:
1. Summary must read like a short report (no numbered lists) and include sensory/contextual cues.
2. Every bullet must mention at least one plausible driver/cause and reference the relevant metric value.
3. Keep the tone human and observational — vary sentence structure.
4. Do not reuse wording between sections; vary which domains you spotlight and keep language uncanned.
5. Next Steps must explicitly reference the metric value it aims to improve or protect (e.g., "Civic trust is 0.42, so...").
6. The Status Quo Projection section is critical — paint a vivid picture of what life looks like without intervention, using the no-action metrics, and make the contrast with the action branch tangible and concrete.`;

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
