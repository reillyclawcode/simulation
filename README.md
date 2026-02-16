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
- Multi-branch comparison charts (GINI, civic trust, emissions, AI influence).
- 50-year timeline scrubber that keeps your relative position when switching branches.
- Structured AI summaries (headline + “Actions taken” bullets) explaining each snapshot.
- Local OpenAI summary support (optional):
  ```
  OPENAI_API_KEY=sk-...
  OPENAI_MODEL=gpt-4o-mini
  ```
  Never commit secrets; `.env.local` stays on your machine.

## Docs site
GitHub Pages publishes the contents of `docs/`. Update `docs/index.html` (static landing page) and push to main—the workflow takes care of the rest.

## Deployment ideas
- Host the dashboard on Vercel/Netlify (keep the API key in env vars).
- Wire additional datasets into `sim_state.py` and `dynamics.py` for more realism.
- Extend metrics (e.g., housing affordability, labor displacement) and add interactive filters.

PRs + ideas welcome.
