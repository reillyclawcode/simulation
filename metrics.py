from __future__ import annotations

from sim_state import State


def gini_index(state: State) -> float:
  return state.economy.gini


def civic_trust(state: State) -> float:
  return state.economy.civic_trust


def annual_emissions(state: State) -> float:
  return state.climate.annual_emissions


def resilience_score(state: State) -> float:
  return state.climate.resilience_score


def ai_influence(state: State) -> float:
  return state.economy.ai_influence


METRICS = {
  "gini": gini_index,
  "civic_trust": civic_trust,
  "annual_emissions": annual_emissions,
  "resilience_score": resilience_score,
  "ai_influence": ai_influence,
}
