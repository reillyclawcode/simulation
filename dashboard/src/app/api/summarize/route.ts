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
    branch_number, branch_label, branch_tier, branch_intensity,
  } = body;

  const hasInaction = inaction_gini !== undefined && inaction_gini !== null;

  const branchContext = branch_number
    ? `\nBranch context:
- Branch: #${branch_number}
- Policy settings: ${branch_label || "unknown"}
- Scenario tier: ${branch_tier || "unknown"} (${branch_intensity ?? 0}% intervention intensity)
- This means the branch represents a "${branch_tier}" scenario. Frame the entire report through this lens — a ${branch_tier?.toLowerCase()} branch should feel qualitatively different from a status quo or bold action branch. Make the scenario tier's influence explicit in the Summary paragraphs.\n`
    : "";

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
Paragraph 1 opening with the branch number, scenario tier (e.g., "Branch 3 — Strong action"), and its policy settings. Then describe lived experience, infrastructure, mood, notable shifts. Explain how this scenario tier shapes the world differently than alternatives. Mention key metrics naturally in prose.

Paragraph 2 continuing the story, highlighting tensions or opportunities specific to this intervention level, again weaving in metrics.


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

## Employment, Economy & the Wealth Gap
Use the ground-truth context below to describe how the employment landscape, wealth distribution, and labor market have evolved by year ${year} under this branch's policy settings. Reference the GINI metric (${gini}) and civic trust (${civic_trust}) and connect to real structural conditions.
- Bullet 1 (2-3 sentences) on unemployment, gig work, AI co-pilot adoption and how the branch's interventions (or lack thereof) have shifted the balance. Reference that 2026 started with 3.7% headline unemployment masking 38% gig/contract work and 46% AI co-pilot adoption.
- Bullet 2 (2-3 sentences) on wealth concentration and housing affordability. In 2026 the top 1% owned 32% of wealth and housing consumed 40%+ of median income. Describe how this branch's GINI trajectory (${gini}) reflects progress or regression.
- Bullet 3 (2-3 sentences) on automation displacement, care economy growth, and green jobs. 30% of tasks were automatable, care roles growing 2:1 demand-to-supply, green jobs at 12%/yr. How does this branch handle the transition? Reference TransitionOS as the reskilling platform modeling these dynamics.

## Energy & Data Infrastructure
Use the ground-truth context below to describe the energy and compute landscape at year ${year}. Connect to the emissions metric (${emissions}) and resilience (${resilience}).
- Bullet 1 (2-3 sentences) on renewables and grid composition. In 2026, solar+wind hit 42% of grid but intermittency required gas peakers. VPPs were the missing orchestration layer. How has this progressed by ${year}?
- Bullet 2 (2-3 sentences) on data center power consumption and orbital compute. Data centers consumed 4.5% of global electricity in 2026; SpaceX/Lumen Orbit had prototype LEO server constellations. Describe the Earth-vs-space compute tradeoff at ${year}.
- Bullet 3 (2-3 sentences) on fusion timeline and its implications. Commonwealth Fusion and TAE showed net energy gain in labs, commercial plants projected 2033-2035. If we're past that horizon, describe the impact; if not, describe remaining barriers.

## The Political Climate
Use the ground-truth context below to describe governance and political dynamics at year ${year}. Connect to civic trust (${civic_trust}) and AI influence (${ai_influence}).
- Bullet 1 (2-3 sentences) on AI regulation fragmentation. In 2026 the EU AI Act was enforcing, US relied on executive orders, China had its own framework. Describe how regulatory coordination has evolved or fractured by ${year}.
- Bullet 2 (2-3 sentences) on institutional trust and citizen assemblies. OECD Trust in Government was 0.42 in 2026 (our simulation's starting value). 14 national-level sortition assemblies had binding recommendations. How does this branch's civic trust of ${civic_trust} reflect these trends?
- Bullet 3 (2-3 sentences) on climate policy traction and Global South demands. 67% supported carbon pricing in 2026, IRA drove $400B+ in clean energy. The G77 introduced a Digital Non-Aligned Movement. Describe the geopolitical balance at ${year}.

## Space Colonies
Use the ground-truth context below to describe off-world developments at year ${year}. Connect to resilience (${resilience}) and emissions (${emissions}) where relevant.
- Bullet 1 (2-3 sentences) on lunar presence. Artemis III landed humans on the Moon in 2025, Lunar Gateway orbiting, China's ILRS on the far side. Lunar industrial zone planned for 2032. Describe the state of lunar operations at ${year}.
- Bullet 2 (2-3 sentences) on Mars progress. SpaceX Starship uncrewed cargo runs underway, Mars Surface Habitat co-designed by NASA/ESA. Radiation, life support, and ISRU were unsolved in 2026. Where do things stand at ${year}?
- Bullet 3 (2-3 sentences) on space governance and O'Neill cylinders. The Outer Space Treaty was outdated, Artemis Accords had 40+ signatories but not China/Russia. Blue Origin funding rotating habitat research. Describe the governance and settlement picture at ${year}.

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
${branchContext}
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
6. The Status Quo Projection section is critical — paint a vivid picture of what life looks like without intervention, using the no-action metrics, and make the contrast with the action branch tangible and concrete.
7. The four world-state sections (Employment, Energy, Political, Space) MUST each have exactly 3 bullets grounded in the 2026 starting facts provided and evolved to the simulation year. These are the most important context sections — give them rich, specific content.`;

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
