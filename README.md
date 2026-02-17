# Simulation Toolkit

Fifty-year "what-if" engine combining policy levers (civic dividends, AI charters, climate capex) with AI-authored narratives. Fan out branches, track structural metrics (GINI, trust, emissions, resilience, AI influence), and read how medicine, food systems, materials, quantum labs, and civic culture evolve along each path.

Based on the blog post: [Running every future sim until the answer shows up](https://reillyclawcode.github.io/clawcodeblog/posts/2026-02-15-future-simulation/)

## Live links

- **Live dashboard: https://simulation-brown.vercel.app/**
- GitHub repo: https://github.com/reillyclawcode/simulation
- Docs landing page: https://reillyclawcode.github.io/simulation/

## Related projects

- [TransitionOS](https://github.com/reillyclawcode/transitionOS) — Interactive workforce transition dashboard. Explore 20 occupations, reskilling paths ranked by ROI, income bridges powered by Civic Dividends, and 10-year cohort projections across three policy scenarios. The operational layer for the Transition OS concept modeled in this simulation.
- [AI Civilization Research Paper](https://reillyclawcode.github.io/clawcodeblog/research/ai-civilization/) — Full 26-page paper laying out the theory and implementation roadmap that both this simulation and TransitionOS implement.
- [Clawcode Blog](https://reillyclawcode.github.io/clawcodeblog/) — All posts and research.

## What's inside

```
simulation/
├── sim_state.py           # immutable dataclasses (Population, Economy, Climate, Governance)
├── dynamics.py            # calibrated transition functions with feedback loops & stochastic events
├── scenario.yaml          # defines horizon (50 yrs), levers, stochastic events, metrics
├── simulate.py            # CLI orchestrator → writes runs/latest.json
├── metrics.py             # scoring functions (GINI, trust, emissions, resilience, AI influence)
├── scenario_loader.py     # YAML → Scenario dataclass
├── ai_override.py         # optional OpenAI override pass for hallucinated trajectories
├── runs/                  # gitignored outputs (JSON)
└── dashboard/             # Next.js 16 / React / Tailwind / Recharts interactive dashboard
    └── src/app/
        ├── page.tsx       # main dashboard (branch explorer, charts, lab notes, export)
        ├── globals.css    # glassmorphism theme, custom slider, scrollbar styles
        ├── layout.tsx     # root layout with metadata
        └── api/
            ├── runs/route.ts      # serves simulation JSON to the frontend
            └── summarize/route.ts # OpenAI-powered narrative generation
```

## Simulation engine

### Calibrated dynamics (`dynamics.py`)

All transition functions are calibrated against real-world reference data (illustrative, not predictive):

| Metric | 2026 start value | Source | Modelling approach |
|--------|-----------------|--------|-------------------|
| **GINI** | 0.39 | World Bank | AI automation pressure vs. civic dividend redistribution; diminishing returns near Nordic floor (0.24) |
| **Civic trust** | 0.42 | OECD Trust Survey 2024 | Secular decline from polarization, inequality drag, resilience signal feedback, AI disruption penalty |
| **Emissions** | 37.4 Gt CO₂ | IEA World Energy Outlook 2024 | Capex-driven decarbonization × technology learning curves × GDP pressure × trust effectiveness |
| **Resilience** | 0.35 | ND-GAIN Index | sqrt-diminishing investment gains vs. quadratic cumulative-warming degradation |
| **AI influence** | 0.12 | Stanford HAI AI Index 2025 | Logistic S-curve (inflection ~2044); charter shifts curve earlier and higher |

Key design choices:

- **Feedback loops** — inequality erodes trust; low trust slows decarbonization via NIMBYism; cumulative warming degrades resilience; high AI influence pressures inequality unless offset by dividends.
- **Diminishing returns** — policy levers use log/sqrt-shaped effects near ceilings and floors. You can't push GINI below ~0.24 or resilience above ~0.92.
- **S-curve AI adoption** — logistic function calibrated so AI influence starts slow (~0.12 in 2026), accelerates through the 2030s–2040s, and saturates around 0.82–0.85 by the 2070s.
- **Stochastic shocks** — supply chain shocks (10%/year) and extreme heat events (20%/year) add realistic volatility. Extreme heat severity scales with cumulative warming; resilient societies absorb shocks better.

### Policy levers (3 axes × 12 branches)

| Lever | Options | Effect |
|-------|---------|--------|
| Civic dividend rate | 2%, 5%, 10% | Reduces GINI, builds trust; 10% can outpace AI inequality pressure |
| AI charter | OFF / ON | Boosts trust via transparency, funds Transition OS, accelerates controlled AI adoption |
| Climate capex share | 15%, 25% | Drives decarbonization rate and resilience investment |

Branches are the cartesian product: 3 × 2 × 2 = **12 branches**, ordered from least intervention (Branch 1: status quo) to most intervention (Branch 12: bold action).

### Composite trajectory score

Each snapshot is scored 0–100 across five dimensions, averaged equally:

| Component | Formula | What it rewards |
|-----------|---------|-----------------|
| Equality | `1 − GINI` | Lower inequality |
| Civic trust | raw trust value | Higher social cohesion |
| Resilience | raw resilience score | Better adaptation capacity |
| Decarbonization | `1 − (emissions / baseline_emissions)` | Emission reductions vs. 2027 baseline |
| AI governance | `clamp01(trust / 0.65 − max(0, ai − trust − 0.1) × 2.5)` | Governance readiness (trust strength) minus penalty when AI outpaces trust |

The AI governance component blends two signals: **readiness** (how strong are institutions, measured by `trust / 0.65`) and a **gap penalty** (when AI influence exceeds trust by more than 0.1). This prevents early years from scoring 100 just because AI hasn't grown yet — a society with 42% trust gets ~65, not a free perfect score.

Rating thresholds: **0–34** Critical · **35–49** Under stress · **50–64** Mixed signals · **65–79** Promising · **80–100** Thriving

## Dashboard features

### Core

- **Visual branch picker** — 12-card grid with color-coded intervention intensity badges (Status quo → Bold action), intensity bar, and lever settings at a glance. Branches are ordered from least to most intervention with a legend explaining the tiers.
- **Timeline scrubber** — drag through 50 years; all metrics, charts, and scores update instantly. Scroll-wheel is blocked to prevent accidental API calls. **Year persists when switching branches** so you can compare the same point in time across different policy mixes.
- **Per-metric mini-charts** — five individual AreaCharts (GINI, Trust, Emissions, Resilience, AI) each with their own Y-axis scale for legibility.
- **Metric snapshot cards** — current values with delta arrows vs. 2027 baseline.
- **Composite score breakdown** — overall score, rating badge, progress bar, and per-component breakdown with plain-English explanations.

### Comparison views

- **Action vs. inaction** — automatic comparison against the minimum-intervention branch (or maximum-intervention if you're on the status quo branch). Five overlay charts + divergence summary.
- **Branch overlay** — pick any two branches and overlay all five metric trajectories on shared charts.

### AI narrative

- **Generate report** button produces a structured markdown report via OpenAI (one API call per click).
- **Branch-aware context** — the report identifies the selected branch number, scenario tier (Status quo / Minimal / Moderate / Strong / Bold action), policy settings, and intervention intensity. The AI frames the entire narrative through the lens of that scenario.
- **Auto-clear on branch switch** — selecting a new branch immediately clears the previous summary and aborts any in-flight API request, so stale reports never linger from a different branch.
- **Branch header** — a context bar above the report shows the branch number, scenario tier badge, lever settings, and year at a glance.
- Parsed into styled sections: Summary, Baseline comparison, Status quo projection, Actions, Impact, Employment/economy/wealth gap, Energy/data infrastructure, Political climate, Space colonies, AI influence, Food & biosystems, Medicine & healthspan, Materials & infrastructure, Quantum & compute, Civic life & culture, Next steps.
- The four world-state sections (Employment, Energy, Political, Space) are generated dynamically by the AI, grounded in 2026 real-world starting facts and evolved to the selected simulation year using the branch's metric values.

### Lab notes & export

- **Save to lab notes** — bookmark any snapshot to `localStorage` with a custom title and annotation.
- **Lab notes panel** — slide-over drawer listing all saved notes. Restore (jumps to that branch + year), export as `.md`, or delete.
- **Export .md** — download the current snapshot as a Markdown file with all metrics, composite score, and AI summary.

### Content sections

- **"What the simulations teach"** — five insight cards from the blog post.
- **"Three things that never leave the best futures"** — cultural care, shared upside, transparent governance.
- **"Three things that never leave the worst futures"** — unchecked concentration, erosion of shared truth, ecological neglect.
- **"Running it again"** — notable runs illustrating emergent patterns.
- **"Bringing it back to now"** — closing context with links to TransitionOS and the Research Paper.

## Requirements

- Python 3.11+
- Node.js 20+

## Quickstart

### 1. Run the simulator

```bash
cd simulation
python simulate.py scenario.yaml --output runs/latest.json
```

Fans out all 12 lever combinations for 50 years, applies stochastic events, and writes trajectories + final scores to JSON.

### 2. Launch the dashboard

```bash
cd dashboard
npm install          # first time only
cp .env.local.example .env.local   # add your OPENAI_API_KEY
npm run dev          # visit http://localhost:3000
```

### 3. (Optional) AI-generated trajectory override

```bash
python ai_override.py runs/latest.json --output runs/ai_override.json --horizon 50
```

Uses OpenAI to hallucinate 50-year metric curves per branch for extra narrative realism.

## Configuration

Create `dashboard/.env.local`:

```
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini   # or gpt-4o, gpt-4-turbo, etc.
```

Keep this file out of git (it's already in `.gitignore`).

## To-do / roadmap

### Real-time data integration

Connect each metric to publicly available data APIs so the simulation starts from real, current values rather than hardcoded estimates:

| Metric | Candidate API / data source | Notes |
|--------|----------------------------|-------|
| **GINI Index** | [World Bank Open Data API](https://data.worldbank.org/indicator/SI.POV.GINI) | Query `/v2/country/WLD/indicator/SI.POV.GINI?format=json` for latest global GINI. Updated annually. |
| **Civic trust** | [OECD Trust in Government API](https://data.oecd.org/gga/trust-in-government.htm) / [Edelman Trust Barometer](https://www.edelman.com/trust-barometer) | OECD provides SDMX endpoints; Edelman publishes annual PDFs (would need scraping or manual entry). |
| **Annual emissions** | [Global Carbon Budget API](https://globalcarbonbudget.org/) / [Climate TRACE](https://climatetrace.org/api) / [EDGAR](https://edgar.jrc.ec.europa.eu/) | Climate TRACE has a REST API with country-level and sector-level CO₂ data. EDGAR JRC provides downloadable datasets. |
| **Resilience score** | [ND-GAIN Country Index API](https://gain.nd.edu/our-work/country-index/) | Publicly downloadable CSVs. Could build an ingestion script that normalizes to 0–1. |
| **AI influence** | [Stanford HAI AI Index](https://aiindex.stanford.edu/) / [OECD AI Policy Observatory](https://oecd.ai/) | No direct REST API; annual report data could be ingested from their GitHub datasets. |

**Implementation plan:**

1. Create a `data_sources/` module with one fetcher per metric (e.g., `fetch_gini()`, `fetch_emissions()`).
2. Add a `--live` flag to `simulate.py` that pulls current values before building the initial state.
3. Cache responses locally (24h TTL) to avoid hammering APIs.
4. Add a `/api/live-metrics` endpoint in the dashboard that shows real vs. simulated values side-by-side.
5. Display a "last updated" badge on the dashboard when live data is active.

### Additional planned features

- [ ] **Scenario editor UI** — adjust lever ranges and stochastic event probabilities from the dashboard instead of editing YAML.
- [ ] **Monte Carlo mode** — run N simulations per branch with different random seeds, show confidence intervals on charts.
- [ ] **Additional metrics** — housing affordability, labor displacement rate, energy access index, biodiversity index.
- [ ] **Time-series comparison** — overlay real historical data (2000–2026) behind the simulated projections so users can see where the simulation diverges from reality.
- [ ] **Shareable snapshots** — generate a unique URL for any lab note that others can view without running the app locally.
- [ ] **Webhook/CI integration** — auto-regenerate simulation data on push, deploy updated dashboard via Vercel/Netlify.
- [ ] **Multi-region support** — run separate simulations for different geographies (US, EU, Global South) with region-specific initial conditions.

## Deployment ideas

- Host the dashboard on Vercel/Netlify (keep the API key in env vars).
- Wire additional datasets into `sim_state.py` and `dynamics.py` for more realism.
- Extend metrics and add interactive filters.

PRs + ideas welcome.
