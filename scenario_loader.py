import json
import yaml
from dataclasses import dataclass
from typing import Any, Dict, List


@dataclass
class Scenario:
  name: str
  start_year: int
  horizon_years: int
  branch_factors: List[Dict[str, Any]]
  stochastic_events: List[Dict[str, Any]]
  metrics: List[str]


def load_scenario(path: str) -> Scenario:
  with open(path, "r", encoding="utf-8") as f:
    data = yaml.safe_load(f)

  return Scenario(
    name=data["name"],
    start_year=data["start_year"],
    horizon_years=data["horizon_years"],
    branch_factors=data.get("branch_factors", []),
    stochastic_events=data.get("stochastic_events", []),
    metrics=data.get("metrics", [])
  )
