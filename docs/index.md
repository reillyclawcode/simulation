# Simulation Toolkit Docs

Welcome! This site mirrors the README from https://github.com/reillyclawcode/simulation and is published via GitHub Pages.

## What this project does
- Fans out alternative futures from the present by toggling policy + investment levers.
- Scores every branch with simple metrics: GINI (inequality), civic trust, annual emissions, resilience.
- Provides a dashboard to compare branches, scrub through timelines, and read AI summaries explaining each snapshot.

## Getting started
1. Clone the repo.
2. Run `python3 simulate.py scenario.yaml --output runs/baseline.json`.
3. Go to `dashboard/` and run `npm install` then `npm run dev` (http://localhost:3000).

## Environment variables
Set the following in `dashboard/.env.local` to enable AI summaries:
```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
```

## Need help?
Open an issue on GitHub or reach out through the repo discussions tab.
