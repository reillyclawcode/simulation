from __future__ import annotations

from dataclasses import dataclass, replace
from typing import Dict, Any


@dataclass(frozen=True)
class Population:
  total: float
  working_age: float
  youth: float
  elderly: float


@dataclass(frozen=True)
class Economy:
  gdp: float
  gdp_growth: float
  gini: float
  civic_trust: float
  ai_influence: float


@dataclass(frozen=True)
class Climate:
  annual_emissions: float
  cumulative_emissions: float
  resilience_score: float


@dataclass(frozen=True)
class Governance:
  ai_charter: bool
  civic_dividend_rate: float
  transition_os_funded: bool


@dataclass(frozen=True)
class State:
  year: int
  population: Population
  economy: Economy
  climate: Climate
  governance: Governance

  def to_dict(self) -> Dict[str, Any]:
    return {
      "year": self.year,
      "population": self.population.__dict__,
      "economy": self.economy.__dict__,
      "climate": self.climate.__dict__,
      "governance": self.governance.__dict__,
    }

  def advance_year(self) -> "State":
    return replace(self, year=self.year + 1)
