# Simulation Toolkit

Branch futures, track the metrics that matter, and visualize the trade-offs.

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
The dashboard now renders five AI-authored sections for any year you scrub to:
- **Summary** – two paragraphs painting the lived reality at that timestamp.
- **Actions** – bullets explaining which levers were pulled and why.
- **Impact** – bullets tying those moves back to GINI, trust, emissions, resilience, and AI influence values.
- **AI influence** – bullets narrating how automation/copilots are affecting daily life and where guardrails are needed.
- **Next steps** – metric-referenced recommendations for improving or protecting the trajectory.

Run the UI locally with `npm run dev` (see below) and set `OPENAI_API_KEY` so `/api/summarize` can call the Responses API. Each request stays under 5 seconds thanks to schema-constrained prompts + retries.


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
- AI narrative stack: Summary, Actions, Impact, AI Influence, and Next Steps — each rendered as readable paragraphs/bullets.
- Local OpenAI support (Responses API). Create an `.env.local` with your key/model and keep it out of git.

## Docs site
GitHub Pages publishes the contents of `docs/`. Update `docs/index.html` (static landing page) and push to main—the workflow takes care of the rest.

## Deployment ideas
- Host the dashboard on Vercel/Netlify (keep the API key in env vars).
- Wire additional datasets into `sim_state.py` and `dynamics.py` for more realism.
- Extend metrics (e.g., housing affordability, labor displacement) and add interactive filters.

PRs + ideas welcome.
