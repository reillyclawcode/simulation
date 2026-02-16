# Simulation Toolkit

Fifty-year “what-if” engine combining policy levers (civic dividends, AI charters, climate capex) with AI-authored narratives. Fan out branches, track structural metrics (GINI, trust, emissions, resilience, AI influence), and read how medicine, food systems, materials, quantum labs, and civic culture evolve along each path.

## Live links
- GitHub repo: https://github.com/reillyclawcode/simulation
- Docs landing page: https://reillyclawcode.github.io/simulation/

## What's inside
```
simulation/
├── sim_state.py         # dataclasses for population, economy, climate, governance
├── dynamics.py          # transition functions (civic dividends, AI charters, climate capex)
├── scenario.yaml        # defines horizon (50 years), levers, metrics
├── simulate.py          # CLI orchestrator -> writes runs/*.json
├── metrics.py           # scoring functions (GINI, trust, emissions, resilience, AI influence)
├── runs/                # gitignored outputs (JSON)
└── dashboard/           # Next.js/Tailwind UI with AI summaries
```

## AI-generated trajectories (stopgap data)
Need believable curves before the real datasets land? Run the OpenAI override pass to hallucinate 50-year metrics per branch:
```bash
cd simulation
python3 ai_override.py runs/baseline.json --output runs/ai_override.json --horizon 50
```
This script reads the deterministic `runs/baseline.json`, prompts the OpenAI Responses API with a JSON schema, and writes `runs/ai_override.json` (ignored by git). Set `OPENAI_API_KEY` (and optionally `OPENAI_MODEL`) in your shell before running.

## Narrative dashboard (AI summaries)
Every timeline scrub now pulls a markdown-formatted report from the `/api/summarize` endpoint. The prompt enforces the following layout so the UI can render readable sections:
- `## Summary` – two prose paragraphs describing lived reality (infrastructure, mood, tensions) with metrics woven into the narrative.
- `## Baseline comparison` – bullets that contrast the current year vs. 2026 (e.g., “GINI from ~0.38 ➝ 0.32, emissions +3 Gt”).
- `## Actions` / `## Impact` – 2-3 sentence bullets describing interventions and how they moved the metrics.
- `## AI Influence`, `## Food & Biosystems`, `## Medicine & Healthspan`, `## Materials & Infrastructure`, `## Quantum & Compute`, `## Civic Life & Culture` – domain-specific callouts tying frontier tech and social responses back to the numbers.
- `## Next Steps` – metric-referenced recommendations for where to steer the branch next.

Because the output is markdown, the dashboard parser preserves paragraphs, sections, and bullets exactly—no more wall-of-text summaries. Just start `npm run dev`, set `OPENAI_API_KEY` (and optional `OPENAI_MODEL`), and Turbopack will hot-reload as you scrub through the years.


## Requirements
- Python 3.11+
- Node.js 20+

## Run the simulator (50-year horizon)
```bash
cd simulation
python3 simulate.py scenario.yaml --output runs/baseline.json
```
This fans out every lever combination (civic dividend rates, AI charter toggle, climate capex mix) for 50 years, tracks the metrics each year, and stores trajectories + final scores in `runs/baseline.json`.

## Launch the dashboard
```bash
cd dashboard
npm install         # first time only
npm run dev         # visit http://localhost:3000
```
Features:
- Branch comparison cards plus timeline scrubber (stay anchored to the same percentile when you hop branches).
- Metric deck that updates in real time (GINI, civic trust, emissions, resilience, AI influence).
- AI narrative stack spanning Summary, Baseline comparison, Actions, Impact, AI Influence, Food, Medicine, Materials, Quantum, Civic Life, and Next Steps.
- Local OpenAI support (Responses API). Create an `.env.local` with your key/model and keep it out of git.

## Docs site
GitHub Pages publishes the contents of `docs/`. Update `docs/index.html` (static landing page) and push to main—the workflow takes care of the rest.

## Deployment ideas
- Host the dashboard on Vercel/Netlify (keep the API key in env vars).
- Wire additional datasets into `sim_state.py` and `dynamics.py` for more realism.
- Extend metrics (e.g., housing affordability, labor displacement) and add interactive filters.

PRs + ideas welcome.
