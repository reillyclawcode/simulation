# Simulation Toolkit

This repo contains a working prototype for exploring branching futures:

1. **Python engine** that fans out from a starting year, applies different policy levers, and records metrics (GINI, civic trust, emissions, resilience).
2. **Next.js dashboard** (`dashboard/`) that reads the generated runs, visualizes branch outcomes, and lets you scrub through individual timelines. An optional AI summary (OpenAI) explains each snapshot in plain language.

## Folder structure

```
simulation/
├── dynamics.py            # deterministic + stochastic transitions
├── metrics.py             # metric functions
├── scenario_loader.py     # YAML loader for scenario configs
├── scenario.yaml          # sample scenario (dividend, AI charter, climate capex)
├── sim_state.py           # dataclass definitions for state
├── simulate.py            # CLI runner (writes runs/*.json)
├── runs/                  # generated output files (gitignored)
└── dashboard/             # Next.js visualization app
```

## Requirements
- Python 3.11+
- Node.js 20+

## Running the simulator
```bash
cd simulation
python3 simulate.py scenario.yaml --output runs/baseline.json
```
This generates every combination of the levers in `scenario.yaml` (3×2×2 = 12 runs) and stores the trajectories + final metrics in `runs/baseline.json`.

## Visualizing the results
```bash
cd simulation/dashboard
npm install              # first time only
npm run dev              # launches http://localhost:3000
```
Features:
- Outcome comparison charts (GINI, civic trust, emissions) per branch.
- Timeline scrubber showing the exact year while you move the slider.
- AI-generated summary of the selected snapshot. Set an OpenAI key to enable it:
  ```
  OPENAI_API_KEY=sk-...
  OPENAI_MODEL=gpt-4o-mini   # optional override
  ```
  (Add those to `dashboard/.env.local`.)

## GitHub Pages (docs)
The repo includes a `docs/` folder (static landing page) and `.github/workflows/pages.yml`. Whenever you push to `main`, GitHub Pages will publish the documentation site so others can read about the project even if they’re not running the code locally.

## Next steps
- Hook real world datasets into the initial state.
- Add stochastic event handling + pruning strategies.
- Deploy the dashboard (Vercel or similar) with authenticated access to run archives.

PRs + ideas welcome.
