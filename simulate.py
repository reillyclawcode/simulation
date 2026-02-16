"""Minimal CLI runner for future simulation prototype."""

from __future__ import annotations

import argparse
import json
import random
from itertools import product
from pathlib import Path

from sim_state import State, Population, Economy, Climate, Governance
from scenario_loader import load_scenario
from dynamics import (
    apply_civic_dividend, apply_ai_charter, evolve_climate, evolve_economy,
    evolve_trust, apply_stochastic_events,
)
from metrics import METRICS


def initial_state(start_year: int) -> State:
  """
  Calibrated to real-world estimates for 2026:
    - GDP: indexed to 1.0 (≈$105T global)
    - GDP growth: 2.8% (IMF World Economic Outlook 2025 projection)
    - GINI: 0.39 (World Bank; close to US/OECD average for mixed economy)
    - Civic trust: 0.42 (OECD Trust Survey 2024: ~42% trust government)
    - AI influence: 0.12 (early diffusion: GPT-era ~3yr old, enterprise adoption ~15-20%)
    - Emissions: 37.4 Gt CO₂ (IEA WEO 2024: 36.8 Gt in 2024 + ~0.6 Gt growth)
    - Cumulative: 1680 Gt (from pre-industrial; ~1500 by 2020 + ~180 since)
    - Resilience: 0.35 (ND-GAIN index global avg normalized; most nations under-adapted)
    - Population shares: UN World Population Prospects 2024 (global)
  """
  return State(
    year=start_year,
    population=Population(total=8.1, working_age=0.65, youth=0.26, elderly=0.09),
    economy=Economy(gdp=1.0, gdp_growth=0.028, gini=0.39, civic_trust=0.42, ai_influence=0.12),
    climate=Climate(annual_emissions=37.4, cumulative_emissions=1680.0, resilience_score=0.35),
    governance=Governance(ai_charter=False, civic_dividend_rate=0.02, transition_os_funded=False)
  )


def apply_branch_levers(state: State, branch_choice: dict) -> State:
  state = apply_civic_dividend(state, branch_choice.get("civic_dividend_rate"))
  state = apply_ai_charter(state, branch_choice.get("ai_charter"))
  state = evolve_climate(state, branch_choice.get("climate_capex_share", 0.2))
  return state


def simulate_branch(base_state: State, scenario, branch_choice):
  trajectory = []
  state = base_state

  for year_delta in range(scenario.horizon_years):
    state = state.advance_year()
    state = apply_branch_levers(state, branch_choice)
    state = evolve_economy(state)
    state = evolve_trust(state)
    state = apply_stochastic_events(state, scenario.stochastic_events)
    trajectory.append(state)

  final_metrics = {
    metric: METRICS[metric](trajectory[-1])
    for metric in scenario.metrics
    if metric in METRICS
  }

  return {
    "branch": branch_choice,
    "trajectory": [s.to_dict() for s in trajectory],
    "final_metrics": final_metrics
  }


def main():
  parser = argparse.ArgumentParser(description="Future simulation prototype runner")
  parser.add_argument("scenario", help="Path to scenario YAML file")
  parser.add_argument("--output", default="runs/latest.json", help="Where to write the result JSON")
  args = parser.parse_args()

  scenario = load_scenario(args.scenario)
  base_state = initial_state(scenario.start_year)

  branch_axes = [
    (factor["lever"], factor["options"])
    for factor in scenario.branch_factors
  ]

  branch_choices = []
  for combo in product(*[opts for _, opts in branch_axes]):
    branch_choice = {}
    for (lever, options), value in zip(branch_axes, combo):
      branch_choice[lever] = value
    branch_choices.append(branch_choice)

  runs = []
  for branch_choice in branch_choices:
    run = simulate_branch(base_state, scenario, branch_choice)
    runs.append(run)

  Path(args.output).parent.mkdir(parents=True, exist_ok=True)
  with open(args.output, "w", encoding="utf-8") as f:
    json.dump({"scenario": scenario.name, "runs": runs}, f, indent=2)

  print(f"Wrote {len(runs)} runs to {args.output}")


if __name__ == "__main__":
  main()
