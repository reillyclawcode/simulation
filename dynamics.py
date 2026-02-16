"""
Calibrated transition functions for the future simulation prototype.

Sources / calibration references (illustrative, not predictive):
  - Emissions:  IEA World Energy Outlook 2024, IPCC AR6 WGIII pathways
  - GINI:       World Bank data (US ~0.39, Nordics ~0.27, global ~0.38)
  - Trust:      OECD Trust in Government 2024, Edelman Trust Barometer
  - Resilience: ND-GAIN Country Index, UNEP Adaptation Gap Report 2024
  - AI:         Stanford HAI AI Index 2025, McKinsey Global Survey on AI

Modelling choices:
  - Feedback loops: inequality erodes trust; low trust slows decarbonization;
    cumulative warming degrades resilience; high AI influence pressures inequality.
  - Diminishing returns: policy levers have log/sqrt-shaped effects near ceilings/floors.
  - S-curve: AI influence follows logistic adoption (slow start → rapid mid → saturation).
  - Stochastic shocks are sized to match historical disruptions (2008 GFC, 2020 COVID,
    2022 supply-chain crisis, extreme-weather actuarial data).
"""

from __future__ import annotations

import math
from dataclasses import replace
from random import gauss, random
from sim_state import State, Economy, Climate, Governance


# ------------------------------------------------------------------ #
#  Reference constants                                                 #
# ------------------------------------------------------------------ #

_START_YEAR = 2026

# GINI: realistic floor for high-redistribution societies (Nordics ~0.25-0.27)
_GINI_FLOOR = 0.24
# GINI: ceiling for extreme inequality (parts of Sub-Saharan Africa ~0.63)
_GINI_CEILING = 0.65

# Emissions: approximate 1.5 °C budget remaining from 2026 (Gt CO₂)
_CARBON_BUDGET_15C = 250.0
# Emissions: hard floor (heavy industry / agriculture residual, ~4-5 Gt)
_EMISSIONS_FLOOR = 3.0

# Resilience: natural ceiling given current technology
_RESILIENCE_CEILING = 0.92

# AI influence: logistic curve parameters
# L=0.85 (long-run saturation), k=0.11 (growth rate), t0=18 (inflection year 2044)
_AI_L = 0.85
_AI_K = 0.11
_AI_T0 = 18


# ------------------------------------------------------------------ #
#  Helper                                                              #
# ------------------------------------------------------------------ #

def _logistic(t: float, L: float = _AI_L, k: float = _AI_K, t0: float = _AI_T0) -> float:
    """Standard logistic function."""
    return L / (1.0 + math.exp(-k * (t - t0)))


# ------------------------------------------------------------------ #
#  Stochastic events                                                   #
# ------------------------------------------------------------------ #

def apply_stochastic_events(state: State, events: list[dict]) -> State:
    """Roll dice for each event; magnitudes calibrated to historical shocks."""
    for event in events:
        name = event.get("name", "")
        prob = event.get("probability_per_year", 0)
        if random() >= prob:
            continue

        if name == "supply_chain_shock":
            # Comparable to 2021-22 chip/shipping crisis
            severity = 0.6 + 0.8 * random()  # 0.6x–1.4x multiplier
            new_economy = replace(
                state.economy,
                gdp_growth=state.economy.gdp_growth - 0.012 * severity,
                gini=min(_GINI_CEILING, state.economy.gini + 0.004 * severity),
                civic_trust=max(0.0, state.economy.civic_trust - 0.018 * severity),
            )
            new_climate = replace(
                state.climate,
                resilience_score=max(0.0, state.climate.resilience_score - 0.012 * severity),
            )
            state = replace(state, economy=new_economy, climate=new_climate)

        elif name == "extreme_heat":
            # Comparable to 2023/2024 record-breaking heat seasons
            severity = 0.5 + random()  # 0.5x–1.5x
            warming_amplifier = 1.0 + 0.3 * (
                state.climate.cumulative_emissions / 3000.0
            )  # worse as planet warms
            eff = severity * warming_amplifier
            # Resilience absorbs some of the hit: better-adapted societies lose less
            resilience_buffer = 0.4 + 0.6 * (1.0 - state.climate.resilience_score)
            new_climate = replace(
                state.climate,
                annual_emissions=state.climate.annual_emissions * (1 + 0.012 * eff),
                resilience_score=max(0.05, state.climate.resilience_score - 0.018 * eff * resilience_buffer),
            )
            new_economy = replace(
                state.economy,
                civic_trust=max(0.0, state.economy.civic_trust - 0.006 * eff),
                gdp_growth=state.economy.gdp_growth - 0.003 * eff,
            )
            state = replace(state, climate=new_climate, economy=new_economy)

    return state


# ------------------------------------------------------------------ #
#  Civic dividend → GINI & trust                                       #
# ------------------------------------------------------------------ #

def apply_civic_dividend(state: State, rate_override: float | None = None) -> State:
    """
    Redistribution lever.  rate ∈ [0, 0.15] typically.

    Effects on GINI:
      - AI-driven automation pressure pushes GINI up (+0.002 to +0.005/yr
        depending on ai_influence).
      - Dividend counters this; effect = 0.001 + 0.045*rate, with diminishing
        returns as GINI approaches the Nordic floor (~0.24).

    Effects on civic trust:
      - Small direct boost: people who see tangible dividends trust more.
      - Scaled by distance from ceiling (diminishing returns).
    """
    rate = rate_override if rate_override is not None else state.governance.civic_dividend_rate

    # --- GINI dynamics ---
    ai_inequality_pressure = 0.002 + 0.004 * state.economy.ai_influence
    raw_dividend_effect = 0.001 + 0.065 * rate  # strong enough that 10% rate outpaces AI pressure
    # diminishing returns near the floor
    dist_to_floor = max(0.001, state.economy.gini - _GINI_FLOOR) / 0.16
    dividend_effect = raw_dividend_effect * min(1.0, dist_to_floor)
    gini_delta = ai_inequality_pressure - dividend_effect + gauss(0, 0.0008)
    new_gini = max(_GINI_FLOOR, min(_GINI_CEILING, state.economy.gini + gini_delta))

    # --- Trust from dividends ---
    base_trust_boost = 0.004 + 0.040 * rate  # tangible dividends build real trust
    dist_to_ceiling = max(0.01, 1.0 - state.economy.civic_trust)
    trust_gain = base_trust_boost * min(1.0, dist_to_ceiling / 0.5)

    new_economy = replace(
        state.economy,
        gini=new_gini,
        civic_trust=min(1.0, state.economy.civic_trust + trust_gain),
    )
    return replace(state, economy=new_economy)


# ------------------------------------------------------------------ #
#  AI charter → trust & governance                                     #
# ------------------------------------------------------------------ #

def apply_ai_charter(state: State, enabled: bool | None = None) -> State:
    """
    Transparency / governance lever.
    Charter ON: small trust boost from transparency + accountability.
    Also funds Transition OS, which improves policy effectiveness downstream.
    """
    charter = enabled if enabled is not None else state.governance.ai_charter
    if not charter:
        return state

    new_governance = replace(state.governance, transition_os_funded=True)

    # Transparency yields a meaningful trust dividend
    trust_boost = 0.006 * max(0.1, 1.0 - state.economy.civic_trust)
    new_economy = replace(
        state.economy,
        civic_trust=min(1.0, state.economy.civic_trust + trust_boost),
    )
    return replace(state, governance=new_governance, economy=new_economy)


# ------------------------------------------------------------------ #
#  Economy evolution — GDP growth + AI influence                        #
# ------------------------------------------------------------------ #

def evolve_economy(state: State) -> State:
    """
    GDP growth:
      - Base trend: starts ~2.8%, gradually declines to ~2.0% (mature economy).
      - AI productivity boost: proportional to rate-of-change of AI influence.
      - Climate drag: cumulative warming reduces output (~-0.3% per °C-equivalent).
      - Noise: business-cycle fluctuations.

    AI influence:
      - Logistic S-curve calibrated to Stanford HAI projections.
      - Charter pushes the curve ~3pp higher (more controlled adoption).
      - Without charter: adoption is slightly slower initially (less trust) but
        more volatile.
    """
    years_elapsed = state.year - _START_YEAR

    # --- GDP growth ---
    maturity_drag = 0.008 * (years_elapsed / 50.0)  # economy matures
    base_growth = 0.028 - maturity_drag

    # AI productivity: proportional to current level (more AI = more productivity)
    ai_prod_boost = 0.012 * state.economy.ai_influence

    # Climate drag: cumulative emissions proxy for warming
    warming_proxy = state.climate.cumulative_emissions / 2500.0
    climate_drag = 0.003 * warming_proxy * warming_proxy

    # Trust effect: low trust → regulatory friction, less cooperation
    trust_factor = 0.5 + 0.5 * state.economy.civic_trust  # range 0.5–1.0

    growth = (base_growth + ai_prod_boost - climate_drag) * trust_factor
    growth += gauss(0, 0.005)  # business-cycle noise
    gdp = state.economy.gdp * (1 + growth)

    # --- AI influence (logistic S-curve) ---
    # Target from logistic curve
    charter_shift = -2.0 if state.governance.ai_charter else 0.0  # charter accelerates by ~2y
    charter_lift = 0.03 if state.governance.ai_charter else 0.0
    os_lift = 0.015 if state.governance.transition_os_funded else 0.0
    target_ai = _logistic(years_elapsed, _AI_L + charter_lift + os_lift, _AI_K, _AI_T0 + charter_shift)

    # Smooth toward target (can't jump instantly)
    ai_speed = 0.25 + 0.1 * state.economy.civic_trust  # higher trust = faster adoption
    new_ai = state.economy.ai_influence + ai_speed * (target_ai - state.economy.ai_influence)
    new_ai += gauss(0, 0.003)
    new_ai = max(0.0, min(1.0, new_ai))

    new_economy = replace(
        state.economy,
        gdp=gdp,
        gdp_growth=growth,
        ai_influence=new_ai,
    )
    return replace(state, economy=new_economy)


# ------------------------------------------------------------------ #
#  Civic trust — secular trends + feedback loops                       #
# ------------------------------------------------------------------ #

def evolve_trust(state: State) -> State:
    """
    Civic trust has its own dynamics beyond what dividends and charters add:
      - Secular decline: polarization, misinformation (~-0.003/yr baseline).
      - Inequality drag: high GINI erodes social cohesion.
      - Resilience signal: visible progress on adaptation builds confidence.
      - AI disruption: rapid AI change without governance reduces trust.
    """
    # Secular decline (polarization/misinformation) — moderated by AI governance
    secular = -0.002 if state.governance.ai_charter else -0.003

    # Inequality drag: accelerates when GINI passes 0.40
    ineq_drag = -0.010 * max(0.0, state.economy.gini - 0.35)

    # Resilience signal: seeing visible climate adaptation builds confidence
    resilience_boost = 0.008 * max(0.0, state.climate.resilience_score - 0.30)

    # AI disruption: fast-changing AI without governance erodes trust
    years_elapsed = state.year - _START_YEAR
    if years_elapsed > 0:
        # How fast is AI growing? (derivative of logistic is steepest mid-curve)
        ai_change_rate = max(0.0, state.economy.ai_influence - 0.12) / max(1, years_elapsed) * 10
        charter_buffer = 0.6 if state.governance.ai_charter else 0.0
        ai_disruption = -0.008 * max(0.0, ai_change_rate - 0.3 - charter_buffer)
    else:
        ai_disruption = 0.0

    net_change = secular + ineq_drag + resilience_boost + ai_disruption
    net_change += gauss(0, 0.004)

    # Diminishing returns near 0 and 1
    if net_change > 0:
        net_change *= max(0.05, 1.0 - state.economy.civic_trust)
    else:
        net_change *= max(0.05, state.economy.civic_trust)

    new_trust = max(0.0, min(1.0, state.economy.civic_trust + net_change))
    new_economy = replace(state.economy, civic_trust=new_trust)
    return replace(state, economy=new_economy)


# ------------------------------------------------------------------ #
#  Climate evolution — emissions + resilience                          #
# ------------------------------------------------------------------ #

def evolve_climate(state: State, climate_capex_share: float = 0.2) -> State:
    """
    Emissions:
      - Decarbonization rate depends on capex AND technology learning curves.
      - Low capex (15%): ~1–1.5%/yr decline (current-policies pathway).
      - High capex (25%): ~3–4%/yr decline (stated-policies to net-zero).
      - Technology learning accelerates decarbonization over time.
      - GDP growth creates upward emission pressure.
      - Hard floor at ~3 Gt (heavy industry/agriculture residual).

    Resilience:
      - Investment builds capacity with sqrt-diminishing returns.
      - Cumulative warming (emissions proxy) degrades resilience quadratically.
      - Civic trust amplifies effectiveness (cooperative societies adapt better).
    """
    years_elapsed = state.year - _START_YEAR

    # --- Emissions ---
    # Base decarbonization rate from capex
    capex_normalized = climate_capex_share / 0.25  # 0.6x at 15%, 1.0x at 25%
    base_decarb = 0.008 + 0.030 * capex_normalized  # 0.8%–3.8%/yr

    # Technology learning: accelerates over time (solar/wind/storage cost curves)
    tech_learning = 1.0 + 0.5 * (years_elapsed / 50.0)  # 1.0x → 1.5x

    # Transition OS funding improves coordination → +15% effectiveness
    policy_bonus = 1.15 if state.governance.transition_os_funded else 1.0

    # Trust effect: low trust → NIMBYism, slower deployment
    trust_effectiveness = 0.6 + 0.4 * state.economy.civic_trust

    effective_decarb = base_decarb * tech_learning * policy_bonus * trust_effectiveness

    # GDP growth creates emission pressure (economic activity → energy demand)
    # But decoupling increases over time (energy intensity declining ~2%/yr)
    decoupling = 1.0 - 0.6 * min(1.0, years_elapsed / 30.0)  # approaches 40% decoupled
    gdp_pressure = max(0.0, state.economy.gdp_growth) * 0.15 * decoupling

    net_emission_change = -effective_decarb + gdp_pressure + gauss(0, 0.003)
    new_emissions = max(
        _EMISSIONS_FLOOR,
        state.climate.annual_emissions * (1.0 + net_emission_change),
    )
    new_cumulative = state.climate.cumulative_emissions + new_emissions

    # --- Resilience ---
    # Investment gain: sqrt diminishing returns
    investment_gain = 0.011 * math.sqrt(capex_normalized) * trust_effectiveness

    # Warming degradation: quadratic in cumulative emissions
    # 3500 Gt ≈ ~2.5°C warming — point of serious systemic stress
    warming_frac = new_cumulative / 3500.0
    warming_drag = 0.003 * warming_frac * warming_frac

    # Ceiling effect
    dist_to_ceiling = max(0.01, _RESILIENCE_CEILING - state.climate.resilience_score)
    effective_gain = investment_gain * min(1.0, dist_to_ceiling / 0.4)

    resilience_delta = effective_gain - warming_drag + gauss(0, 0.003)
    # Soft floor at 0.05: even collapsed societies retain some basic resilience
    new_resilience = max(0.05, min(_RESILIENCE_CEILING, state.climate.resilience_score + resilience_delta))

    new_climate = replace(
        state.climate,
        annual_emissions=round(new_emissions, 4),
        cumulative_emissions=round(new_cumulative, 4),
        resilience_score=round(new_resilience, 6),
    )
    return replace(state, climate=new_climate)
