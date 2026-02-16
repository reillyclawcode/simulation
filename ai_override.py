"""Generate synthetic metric trajectories via OpenAI."""

import argparse
import json
import os
import time
from pathlib import Path

from openai import OpenAI

PROMPT_TEMPLATE = """
You are a forecasting assistant. Given the policy levers below, generate annual projections for the next {horizon} years (starting at {start_year}) for these metrics:
- gini (0-1)
- civic_trust (0-1)
- annual_emissions (gigatons CO2e)
- resilience_score (0-1)
- ai_influence (0-1)

Policy levers:
- civic_dividend_rate = {civic_dividend_rate}
- ai_charter = {ai_charter}
- climate_capex_share = {climate_capex_share}

Keep values in realistic ranges (gini 0.2-0.6, emissions 5-40 Gt, civic_trust/resilience/ai influence 0-1).
"""

SCHEMA = {
  "type": "object",
  "properties": {
    "start_year": {"type": "integer"},
    "data": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "year": {"type": "integer"},
          "gini": {"type": "number"},
          "civic_trust": {"type": "number"},
          "annual_emissions": {"type": "number"},
          "resilience_score": {"type": "number"},
          "ai_influence": {"type": "number"}
        },
        "required": [
          "year",
          "gini",
          "civic_trust",
          "annual_emissions",
          "resilience_score",
          "ai_influence"
        ],
        "additionalProperties": False
      }
    }
  },
  "required": ["start_year", "data"],
  "additionalProperties": False
}

TEXT_CONFIG = {
  "format": {
    "type": "json_schema",
    "name": "forecast",
    "schema": SCHEMA,
    "strict": True,
  }
}

MAX_RETRIES = 4
RETRY_DELAY = 5


def convert_entry(entry):
  return {
    "year": entry["year"],
    "population": {},
    "economy": {
      "gdp": 1.0,
      "gdp_growth": 0.0,
      "gini": entry["gini"],
      "civic_trust": entry["civic_trust"],
      "ai_influence": entry["ai_influence"],
    },
    "climate": {
      "annual_emissions": entry["annual_emissions"],
      "cumulative_emissions": 0.0,
      "resilience_score": entry["resilience_score"],
    },
    "governance": {},
  }


def main():
  parser = argparse.ArgumentParser(description="AI forecast generator")
  parser.add_argument("scenario", help="Path to scenario output JSON (existing runs)")
  parser.add_argument("--output", default="runs/ai_override.json")
  parser.add_argument("--start-year", type=int, default=2026)
  parser.add_argument("--horizon", type=int, default=50)
  args = parser.parse_args()

  api_key = os.environ.get("OPENAI_API_KEY")
  if not api_key:
    raise SystemExit("OPENAI_API_KEY not set")

  client = OpenAI(api_key=api_key)
  model = os.environ.get("OPENAI_MODEL", "gpt-4.1-mini")

  data = json.loads(Path(args.scenario).read_text())
  ai_runs = []
  total = len(data["runs"])

  for idx, run in enumerate(data["runs"], 1):
    branch = run["branch"]
    print(f"Generating forecast for branch {idx}/{total}...", flush=True)
    prompt = PROMPT_TEMPLATE.format(
      horizon=args.horizon,
      start_year=args.start_year,
      civic_dividend_rate=branch.get("civic_dividend_rate"),
      ai_charter=branch.get("ai_charter"),
      climate_capex_share=branch.get("climate_capex_share")
    )

    forecast = None
    for attempt in range(1, MAX_RETRIES + 1):
      try:
        response = client.responses.create(
          model=model,
          input=prompt + "\nReturn only valid JSON matching the schema.",
          text=TEXT_CONFIG,
          max_output_tokens=2048,
          temperature=0.4,
        )
        text = response.output_text
        forecast = json.loads(text)
        break
      except Exception as exc:
        print(f"⚠ Forecast attempt {attempt} failed: {exc}", flush=True)
        if attempt == MAX_RETRIES:
          raise
        time.sleep(RETRY_DELAY * attempt)

    print("✔ Forecast parsed", flush=True)
    trajectory = [convert_entry(entry) for entry in forecast["data"]]
    ai_runs.append({
      "branch": branch,
      "trajectory": trajectory,
      "final_metrics": trajectory[-1]["economy"] | trajectory[-1]["climate"]
    })

  Path(args.output).write_text(json.dumps({"scenario": "ai_override", "runs": ai_runs}, indent=2))


if __name__ == "__main__":
  main()
