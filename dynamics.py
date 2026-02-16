"""Simplified transition functions for prototype purposes."""

from __future__ import annotations

from dataclasses import replace
from random import gauss
from sim_state import State, Economy, Climate, Governance


def apply_civic_dividend(state: State, rate_override: float | None = None) -> State:
  rate = rate_override if rate_override is not None else state.governance.civic_dividend_rate
  gini_delta = 0.015 * rate / 0.05  # normalize to baseline
  trust_delta = 0.02 * rate / 0.05

  new_economy = replace(
    state.economy,
    gini=max(0.15, state.economy.gini - gini_delta),
    civic_trust=min(1.0, state.economy.civic_trust + trust_delta)
  )

  return replace(state, economy=new_economy)


def apply_ai_charter(state: State, enabled: bool | None = None) -> State:
  charter = enabled if enabled is not None else state.governance.ai_charter
  if not charter:
    return state

  new_governance = replace(state.governance, transition_os_funded=True)
  new_economy = replace(state.economy, civic_trust=min(1.0, state.economy.civic_trust + 0.01))

  return replace(state, governance=new_governance, economy=new_economy)


def evolve_economy(state: State) -> State:
  noise = gauss(0, 0.006)
  growth = state.economy.gdp_growth + noise
  gdp = state.economy.gdp * (1 + growth)
  new_economy = replace(state.economy, gdp=gdp, gdp_growth=growth)
  return replace(state, economy=new_economy)


def evolve_climate(state: State, climate_capex_share: float = 0.2) -> State:
  decarb = 0.03 * climate_capex_share / 0.2
  new_emissions = max(0, state.climate.annual_emissions * (1 - decarb))
  new_climate = replace(
    state.climate,
    annual_emissions=new_emissions,
    cumulative_emissions=state.climate.cumulative_emissions + new_emissions,
    resilience_score=min(1.0, state.climate.resilience_score + 0.01 * climate_capex_share)
  )
  return replace(state, climate=new_climate)
