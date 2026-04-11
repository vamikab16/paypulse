"""
Scenario / what-if engine for PayPulse.

Lets users simulate different futures and compare them against
the baseline forecast. Supports five scenario types:

  1. "continue_trend" — extrapolate current trajectory
  2. "stabilize_now" — flatten delays at current level
  3. "accelerate_payments" — actively reduce delays (intervention)
  4. "revenue_drop" — simulate revenue loss → increased delays
  5. "custom" — user-defined delay adjustments

Each scenario returns a side-by-side comparison with the baseline forecast,
plus a narrative explaining the risk implications.
"""

import numpy as np
import pandas as pd

from src.data.schemas import SUPPLIER_NAMES, CONTRACTUAL_TERMS
from src.models.forecaster import improved_forecast
from src.detection.anomaly import detect_trend


SCENARIO_DEFINITIONS = {
    "continue_trend": {
        "name": "Current Trend Continues",
        "description": "What if payment delays keep increasing at the current rate?",
    },
    "stabilize_now": {
        "name": "Stabilize Payments Today",
        "description": "What if the company takes action to freeze payment delays at current levels?",
    },
    "accelerate_payments": {
        "name": "Accelerate Payments (Intervention)",
        "description": "What if NatWest intervenes and the business reduces supplier delays by 5-10 days over 6 weeks?",
    },
    "revenue_drop": {
        "name": "Revenue Drop (20%)",
        "description": "What if Meridian loses a major client, causing a 20% revenue decline?",
    },
    "custom": {
        "name": "Custom Scenario",
        "description": "Apply a custom delay adjustment to a specific supplier.",
    },
}


def run_scenario(
    df: pd.DataFrame,
    scenario_type: str,
    params: dict = None,
    horizon: int = 6,
) -> dict:
    """
    Run a what-if scenario and compare to baseline forecast.

    Args:
        df: Full payment history DataFrame.
        scenario_type: One of the supported scenario types.
        params: Scenario parameters:
            - For "revenue_drop": {"multiplier": 1.3} (default 1.3)
            - For "custom": {"adjustment": 5} (add N days to all)
                         or {"supplier_id": "S2", "adjustment": 10}
        horizon: Forecast horizon in weeks (default 6).

    Returns:
        dict with baseline forecast, scenario forecast, comparison summary,
        and risk assessment.
    """
    if params is None:
        params = {}

    supplier_ids = sorted(df["supplier_id"].unique())
    scenario_def = SCENARIO_DEFINITIONS.get(scenario_type, SCENARIO_DEFINITIONS["custom"])

    # Generate baseline forecasts for all suppliers
    baseline_forecasts = {}
    for sid in supplier_ids:
        fc = improved_forecast(df, sid, horizon)
        baseline_forecasts[sid] = fc["expected"]

    # Generate scenario forecasts based on type
    if scenario_type == "continue_trend":
        scenario_forecasts = _scenario_continue_trend(df, supplier_ids, horizon)
    elif scenario_type == "stabilize_now":
        scenario_forecasts = _scenario_stabilize(df, supplier_ids, horizon)
    elif scenario_type == "accelerate_payments":
        scenario_forecasts = _scenario_accelerate_payments(df, supplier_ids, horizon)
    elif scenario_type == "revenue_drop":
        multiplier = params.get("multiplier", 1.3)
        scenario_forecasts = _scenario_revenue_drop(
            df, supplier_ids, horizon, multiplier
        )
    elif scenario_type == "custom":
        scenario_forecasts = _scenario_custom(
            df, supplier_ids, horizon, params
        )
    else:
        scenario_forecasts = baseline_forecasts  # Fallback

    # Generate comparison summary
    comparison = _generate_comparison(
        baseline_forecasts, scenario_forecasts, scenario_type, params
    )

    # Generate weeks for charting
    max_week = int(df["week_number"].max())
    forecast_weeks = list(range(max_week + 1, max_week + 1 + horizon))

    return {
        "scenario_type": scenario_type,
        "scenario_name": scenario_def["name"],
        "scenario_description": scenario_def["description"],
        "forecast_weeks": forecast_weeks,
        "baseline_forecast": {
            sid: [round(v, 1) for v in vals]
            for sid, vals in baseline_forecasts.items()
        },
        "scenario_forecast": {
            sid: [round(v, 1) for v in vals]
            for sid, vals in scenario_forecasts.items()
        },
        "comparison_summary": comparison["summary"],
        "risk_delta": comparison["risk_delta"],
        "supplier_impacts": comparison["supplier_impacts"],
        "intervention_impact": comparison["intervention_impact"],
    }


def _scenario_continue_trend(
    df: pd.DataFrame, supplier_ids: list, horizon: int
) -> dict:
    """Extrapolate current trend for each supplier."""
    result = {}
    for sid in supplier_ids:
        trend_data = detect_trend(df, sid, lookback=6)
        slope = trend_data.get("slope_per_week", 0)
        current_delay = trend_data.get("current_delay", 0)

        # Project forward with the current slope
        forecasts = []
        for w in range(1, horizon + 1):
            projected = current_delay + slope * w
            forecasts.append(max(0, float(projected)))
        result[sid] = forecasts

    return result


def _scenario_stabilize(
    df: pd.DataFrame, supplier_ids: list, horizon: int
) -> dict:
    """Freeze delays at current level — flat line from today's value."""
    result = {}
    for sid in supplier_ids:
        supplier_data = df[df["supplier_id"] == sid].sort_values("week_number")
        current = float(supplier_data["payment_delay_days"].iloc[-1])
        result[sid] = [round(current, 1)] * horizon

    return result


def _scenario_accelerate_payments(
    df: pd.DataFrame, supplier_ids: list, horizon: int
) -> dict:
    """
    Simulate active intervention: gradually reduce delays toward
    contractual terms over the forecast horizon.

    Stretched suppliers get larger reductions. Already-healthy suppliers
    see minimal change. This models realistic NatWest intervention where
    a relationship manager works with the SME to restore payment discipline.
    """
    result = {}
    for sid in supplier_ids:
        supplier_data = df[df["supplier_id"] == sid].sort_values("week_number")
        current = float(supplier_data["payment_delay_days"].iloc[-1])
        terms = CONTRACTUAL_TERMS.get(sid, 21)

        # Calculate how much this supplier is over terms
        excess = max(0, current - terms)

        if excess <= 3:
            # Already near terms — small natural improvement
            forecasts = [max(terms - 1, current - 0.5 * w) for w in range(1, horizon + 1)]
        else:
            # Gradual reduction: recover ~60-70% of excess over horizon
            # More aggressive at start (quick wins), tapering off
            recovery_target = current - (excess * 0.65)
            forecasts = []
            for w in range(1, horizon + 1):
                # Exponential decay toward target
                progress = 1 - (0.55 ** w)
                projected = current - (current - recovery_target) * progress
                forecasts.append(max(terms * 0.9, round(projected, 1)))

        result[sid] = forecasts

    return result


def _scenario_revenue_drop(
    df: pd.DataFrame, supplier_ids: list, horizon: int, multiplier: float
) -> dict:
    """Simulate revenue drop by multiplying all forecast delays."""
    result = {}
    for sid in supplier_ids:
        fc = improved_forecast(df, sid, horizon)
        # Apply multiplier — more impact on already-stressed suppliers
        scaled = [v * multiplier for v in fc["expected"]]
        result[sid] = scaled

    return result


def _scenario_custom(
    df: pd.DataFrame, supplier_ids: list, horizon: int, params: dict
) -> dict:
    """Apply custom delay adjustment to one or all suppliers."""
    adjustment = params.get("adjustment", 5)
    target_supplier = params.get("supplier_id", None)

    result = {}
    for sid in supplier_ids:
        fc = improved_forecast(df, sid, horizon)
        if target_supplier is None or sid == target_supplier:
            adjusted = [max(0, v + adjustment) for v in fc["expected"]]
        else:
            adjusted = fc["expected"]
        result[sid] = adjusted

    return result


def _generate_comparison(
    baseline: dict, scenario: dict, scenario_type: str, params: dict
) -> dict:
    """Generate comparison summary, risk assessment, and intervention impact."""
    supplier_impacts = []
    baseline_critical = 0
    scenario_critical = 0
    total_baseline_delay = 0
    total_scenario_delay = 0

    for sid in baseline:
        base_end = baseline[sid][-1] if baseline[sid] else 0
        scen_end = scenario[sid][-1] if scenario[sid] else 0
        terms = CONTRACTUAL_TERMS.get(sid, 21)
        name = SUPPLIER_NAMES.get(sid, sid)

        total_baseline_delay += base_end
        total_scenario_delay += scen_end

        delta = scen_end - base_end

        # Check if supplier crosses critical threshold
        base_critical = base_end > terms + 15
        scen_critical = scen_end > terms + 15

        if base_critical:
            baseline_critical += 1
        if scen_critical:
            scenario_critical += 1

        impact = "worse" if delta > 2 else ("better" if delta < -2 else "similar")

        supplier_impacts.append({
            "supplier_id": sid,
            "supplier_name": name,
            "baseline_end": round(base_end, 1),
            "scenario_end": round(scen_end, 1),
            "delta": round(delta, 1),
            "impact": impact,
            "crosses_critical": scen_critical and not base_critical,
            "exits_critical": base_critical and not scen_critical,
        })

    n_suppliers = len(baseline) or 1
    avg_baseline = round(total_baseline_delay / n_suppliers, 1)
    avg_scenario = round(total_scenario_delay / n_suppliers, 1)

    # Overall risk delta
    if scenario_critical > baseline_critical:
        new_critical = scenario_critical - baseline_critical
        risk_delta_text = f"Overall risk INCREASES — {new_critical} additional supplier(s) would reach critical delay levels"
    elif scenario_critical < baseline_critical:
        improved = baseline_critical - scenario_critical
        risk_delta_text = f"Overall risk DECREASES — {improved} supplier(s) would move out of critical delay levels"
    else:
        risk_delta_text = "Overall risk level remains UNCHANGED under this scenario"

    # Risk labels
    if scenario_critical >= 3:
        risk_level_from = "AMBER" if baseline_critical < 3 else "RED"
        risk_level_to = "RED"
    elif scenario_critical >= 1:
        risk_level_from = "GREEN" if baseline_critical == 0 else "AMBER"
        risk_level_to = "AMBER"
    else:
        risk_level_from = "AMBER" if baseline_critical > 0 else "GREEN"
        risk_level_to = "GREEN"

    # Direction for frontend
    if risk_level_to == "RED" and risk_level_from != "RED":
        direction = "deteriorating"
    elif risk_level_to == "GREEN" and risk_level_from != "GREEN":
        direction = "improving"
    elif scenario_critical < baseline_critical:
        direction = "improving"
    elif scenario_critical > baseline_critical:
        direction = "deteriorating"
    else:
        direction = "stable"

    # Summary text — decision-focused
    worse_count = sum(1 for s in supplier_impacts if s["impact"] == "worse")
    better_count = sum(1 for s in supplier_impacts if s["impact"] == "better")
    crossing_count = sum(1 for s in supplier_impacts if s["crosses_critical"])
    exiting_count = sum(1 for s in supplier_impacts if s["exits_critical"])

    horizon_weeks = len(baseline[list(baseline.keys())[0]]) if baseline else 6

    if scenario_type == "continue_trend":
        summary = (
            f"Without intervention, {worse_count} of {len(supplier_impacts)} suppliers "
            f"would see worsening delays over {horizon_weeks} weeks. "
            f"{scenario_critical} supplier(s) would exceed critical thresholds."
        )
    elif scenario_type == "stabilize_now":
        summary = (
            f"Stabilizing payments at current levels holds {scenario_critical} "
            f"supplier(s) in critical territory but prevents further escalation. "
            f"Average delay remains at {avg_scenario:.0f} days."
        )
    elif scenario_type == "accelerate_payments":
        summary = (
            f"Active intervention reduces average delay from {avg_baseline:.0f}d to {avg_scenario:.0f}d. "
            f"{better_count} supplier(s) improve, "
            f"{exiting_count} exit critical territory. "
            f"Risk moves from {risk_level_from} to {risk_level_to}."
        )
    elif scenario_type == "revenue_drop":
        multiplier = params.get("multiplier", 1.3)
        pct = int((multiplier - 1) * 100)
        summary = (
            f"A {pct}% revenue decline pushes {scenario_critical} suppliers "
            f"into critical delay territory (vs {baseline_critical} under baseline). "
            f"{crossing_count} supplier(s) would newly breach critical thresholds."
        )
    else:
        adjustment = params.get("adjustment", 0)
        target = params.get("supplier_id")
        target_name = SUPPLIER_NAMES.get(target, "all suppliers") if target else "all suppliers"
        if adjustment >= 0:
            summary = (
                f"Adding {adjustment} days to {target_name} results in "
                f"{scenario_critical} suppliers exceeding critical thresholds "
                f"(vs {baseline_critical} under baseline)."
            )
        else:
            summary = (
                f"Reducing delays for {target_name} by {abs(adjustment)} days "
                f"brings {scenario_critical} suppliers above critical thresholds "
                f"(vs {baseline_critical} under baseline). "
                f"{exiting_count} supplier(s) exit critical territory."
            )

    # Intervention impact line — the key decision-support signal
    if direction == "improving":
        if risk_level_to == "GREEN":
            intervention_impact = "Risk contained: all suppliers return within acceptable thresholds."
        else:
            weeks_estimate = max(2, horizon_weeks - exiting_count)
            intervention_impact = f"Intervention window preserved: risk can be contained within {weeks_estimate}–{weeks_estimate + 2} weeks with sustained action."
        intervention_type = "positive"
    elif direction == "deteriorating":
        if risk_level_to == "RED":
            intervention_impact = "No action: risk escalates to critical levels. Immediate intervention required."
        else:
            intervention_impact = f"Risk trajectory worsening: {crossing_count} supplier(s) approaching critical thresholds."
        intervention_type = "negative"
    else:
        intervention_impact = "Risk level holds steady under this scenario. Monitor for changes."
        intervention_type = "neutral"

    return {
        "summary": summary,
        "risk_delta": f"{risk_delta_text}. Risk level: {risk_level_from} → {risk_level_to}",
        "supplier_impacts": supplier_impacts,
        "intervention_impact": {
            "text": intervention_impact,
            "type": intervention_type,
            "direction": direction,
        },
    }


def get_available_scenarios() -> list:
    """Return list of available scenario types with descriptions."""
    return [
        {
            "type": key,
            "name": val["name"],
            "description": val["description"],
        }
        for key, val in SCENARIO_DEFINITIONS.items()
    ]


if __name__ == "__main__":
    from src.data.generator import generate_payment_data

    df = generate_payment_data()

    print("=" * 70)
    print("  SCENARIO ENGINE — WHAT-IF ANALYSIS")
    print("=" * 70)

    scenarios = [
        ("continue_trend", {}),
        ("stabilize_now", {}),
        ("accelerate_payments", {}),
        ("revenue_drop", {"multiplier": 1.3}),
        ("custom", {"adjustment": 10, "supplier_id": "S2"}),
        ("custom", {"adjustment": -8, "supplier_id": "S2"}),
    ]

    for stype, sparams in scenarios:
        result = run_scenario(df, stype, sparams)
        print(f"\n{'─' * 60}")
        print(f"  SCENARIO: {result['scenario_name']}")
        print(f"  {result['scenario_description']}")
        print(f"{'─' * 60}")
        print(f"\n  Summary: {result['comparison_summary']}")
        print(f"  Risk: {result['risk_delta']}")
        print(f"  Intervention: {result['intervention_impact']['text']}")

        # Show S2 comparison
        s2_base = result["baseline_forecast"].get("S2", [])
        s2_scen = result["scenario_forecast"].get("S2", [])
        print(f"\n  S2 (BetaLogistics) comparison:")
        print(f"    Baseline:  {s2_base}")
        print(f"    Scenario:  {s2_scen}")
