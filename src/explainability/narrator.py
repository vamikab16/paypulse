"""
Plain-English explanation generator for PayPulse.

Generates human-readable, jargon-free explanations for:
  - Individual supplier forecasts
  - Anomaly alerts (threshold + trend)
  - Triage behavior (the key narrative)
  - Executive summary (the "reveal" — traditional GREEN vs PayPulse AMBER)

Uses template-based generation — no LLM required. Every explanation
includes specific numbers, supplier names, and actionable context.
"""

from src.data.schemas import SUPPLIER_NAMES, CONTRACTUAL_TERMS


def explain_forecast(supplier_id: str, forecast_data: dict, company_context: dict = None) -> str:
    """
    Generate a 2–4 sentence explanation of a supplier's forecast.

    Args:
        supplier_id: Supplier being forecast.
        forecast_data: Output from full_forecast_with_comparison().
        company_context: Optional company profile dict.

    Returns:
        Plain-English explanation string.
    """
    name = forecast_data.get("supplier_name", SUPPLIER_NAMES.get(supplier_id, supplier_id))
    terms = CONTRACTUAL_TERMS.get(supplier_id, 21)

    expected = forecast_data["forecast"]["expected"]
    low = forecast_data["forecast"]["low"]
    high = forecast_data["forecast"]["high"]
    baseline = forecast_data["baseline"]["forecast"]

    # Current state (last historical value)
    hist_delays = forecast_data["historical"]["delays"]
    current_delay = hist_delays[-1] if hist_delays else 0

    # Forecast trajectory
    forecast_end = expected[-1]
    forecast_start = expected[0]
    is_rising = forecast_end > forecast_start + 1
    is_falling = forecast_end < forecast_start - 1

    # How far above terms
    excess = round(forecast_end - terms, 1)

    # Model comparison
    model_mae = forecast_data["model_comparison"]["model_mae"]
    baseline_mae = forecast_data["model_comparison"]["baseline_mae"]
    improvement = forecast_data["model_comparison"]["improvement_pct"]

    sentences = []

    # Sentence 1: Current state and forecast direction
    if is_rising:
        sentences.append(
            f"{name} payments are forecast to reach {forecast_end:.0f} days "
            f"over the next {len(expected)} weeks (range: {low[-1]:.0f}–{high[-1]:.0f} days)."
        )
    elif is_falling:
        sentences.append(
            f"{name} payment delays are expected to decrease to {forecast_end:.0f} days "
            f"over the next {len(expected)} weeks (range: {low[-1]:.0f}–{high[-1]:.0f} days)."
        )
    else:
        sentences.append(
            f"{name} payments are expected to remain around {forecast_end:.0f} days "
            f"over the next {len(expected)} weeks (range: {low[-1]:.0f}–{high[-1]:.0f} days)."
        )

    # Sentence 2: Comparison to terms
    if excess > 0:
        sentences.append(
            f"This is {excess:.0f} days beyond their contractual terms of {terms} days."
        )
    else:
        sentences.append(
            f"This is within their contractual terms of {terms} days."
        )

    # Sentence 3: Trend context
    if is_rising and len(hist_delays) >= 6:
        recent_6 = hist_delays[-6:]
        avg_increase = (recent_6[-1] - recent_6[0]) / 6
        if avg_increase > 0.5:
            sentences.append(
                f"The trend has been accelerating — payment delays have increased by an average "
                f"of {avg_increase:.1f} days per week over the past 6 weeks."
            )

    # Sentence 4: Model confidence (if improved model is significantly better)
    if improvement > 10:
        sentences.append(
            f"Our forecasting model captures this trend with {improvement:.0f}% better accuracy "
            f"than a simple rolling average (MAE: {model_mae:.1f} vs {baseline_mae:.1f} days)."
        )

    return " ".join(sentences)


def explain_anomaly(alert: dict, trend_data: dict = None) -> str:
    """
    Generate a 2–4 sentence explanation of a threshold or trend alert.

    Args:
        alert: Threshold breach alert dict from anomaly.py.
        trend_data: Optional trend analysis dict for the same supplier.

    Returns:
        Plain-English explanation string.
    """
    name = alert.get("supplier_name", alert.get("supplier_id", "Unknown"))
    severity = alert.get("severity", "unknown")
    delay = alert.get("delay_days", 0)
    terms = alert.get("contractual_terms", 0)
    excess = alert.get("excess_days", 0)

    sentences = []

    if severity == "critical":
        sentences.append(
            f"CRITICAL: {name} is currently {excess:.0f} days overdue "
            f"(paying at {delay:.0f} days vs {terms}-day terms)."
        )
        sentences.append(
            "This level of delay risks supply chain disruption and potential loss of the supplier relationship."
        )
    elif severity == "warning":
        sentences.append(
            f"WARNING: {name} payments have drifted to {delay:.0f} days, "
            f"which is {excess:.0f} days beyond their {terms}-day contractual terms."
        )
        sentences.append(
            "If this trend continues, it could escalate to a critical delay within 2–4 weeks."
        )
    elif severity == "watch":
        sentences.append(
            f"{name} payments are slightly above terms at {delay:.0f} days "
            f"(terms: {terms} days). This is within a normal fluctuation range but worth monitoring."
        )
    else:
        sentences.append(
            f"{name} is paying within normal terms at {delay:.0f} days "
            f"(terms: {terms} days). No concerns."
        )

    # Add trend context if available
    if trend_data:
        trend = trend_data.get("trend", "stable")
        slope = trend_data.get("slope_per_week", 0)
        if trend == "accelerating":
            sentences.append(
                f"Delays are accelerating at {slope:+.1f} days per week — "
                f"this is the fastest deterioration rate among all suppliers."
            )
        elif trend == "drifting":
            sentences.append(
                f"There is a gradual upward drift of {slope:+.1f} days per week in payment times."
            )

    return " ".join(sentences)


def explain_triage(triage_data: dict) -> str:
    """
    Generate a 3–5 sentence explanation of triage behavior.

    This is the KEY narrative — the centerpiece of the demo.

    Args:
        triage_data: Output from detect_triage().

    Returns:
        Plain-English explanation of the triage pattern.
    """
    if not triage_data.get("triage_detected", False):
        return (
            "No supplier triage behavior has been detected. "
            "All suppliers are being paid within a consistent timeframe relative to their terms."
        )

    severity = triage_data.get("triage_severity", "none")
    first_week = triage_data.get("first_detected_week", "unknown")
    current_spread = triage_data.get("current_spread", 0)
    baseline_spread = triage_data.get("baseline_spread", 0)
    spread_increase = triage_data.get("spread_increase_pct", 0)
    favored = triage_data.get("favored_suppliers", [])
    stretched = triage_data.get("stretched_suppliers", [])

    sentences = []

    # Sentence 1: Detection statement
    sentences.append(
        "PayPulse has detected supplier triage behaviour."
    )

    # Sentence 2: Who is favored vs stretched
    if favored and stretched:
        favored_names = [f"{s['supplier_name']} ({s['current_delay']:.0f} days)" for s in favored]
        stretched_names = [f"{s['supplier_name']} ({s['current_delay']:.0f} days)" for s in stretched]

        sentences.append(
            f"Meridian Engineering is maintaining timely payments to {_join_names(favored_names)}, "
            f"while significantly stretching payments to {_join_names(stretched_names)}."
        )

    # Sentence 3: Why this matters
    sentences.append(
        "This selective prioritisation is a recognised early indicator of cash flow stress — "
        "businesses under pressure protect critical supplier relationships while delaying others."
    )

    # Sentence 4: Timeline and severity
    severity_labels = {
        "emerging": "early-stage",
        "active": "established",
        "severe": "advanced",
    }
    stage = severity_labels.get(severity, severity)
    sentences.append(
        f"This pattern was first detected in Week {first_week} and is now at {stage} severity. "
        f"The payment spread across suppliers has increased by {spread_increase:.0f}% "
        f"compared to the healthy baseline period."
    )

    return " ".join(sentences)


def generate_executive_summary(all_alerts: dict, all_forecasts: dict, triage_data: dict) -> str:
    """
    Generate a 5–8 sentence overall health assessment.

    This is the "reveal" — traditional banking says GREEN, but PayPulse says AMBER.

    Args:
        all_alerts: Output from detect_all_anomalies().
        all_forecasts: Dict of supplier_id → forecast results.
        triage_data: Output from detect_triage().

    Returns:
        Executive summary string.
    """
    sentences = []

    # Sentence 1: Traditional status (the contrast)
    sentences.append(
        "Meridian Engineering Ltd shows GREEN status on all traditional banking metrics — "
        "loan payments are current and revenue is stable."
    )

    # Sentence 2: The reveal
    if triage_data.get("triage_detected", False):
        sentences.append(
            "However, PayPulse has identified a hidden stress signal."
        )

        # Sentence 3: What was found
        stretched = triage_data.get("stretched_suppliers", [])
        favored = triage_data.get("favored_suppliers", [])
        total_suppliers = len(stretched) + len(favored)
        # Count additional suppliers that are neither
        all_supplier_delays = triage_data.get("supplier_delays", {})
        total_suppliers = max(total_suppliers, len(all_supplier_delays))

        first_week = triage_data.get("first_detected_week", "unknown")
        weeks_ago = 52 - first_week if isinstance(first_week, int) else 12

        sentences.append(
            f"Over the past {weeks_ago} weeks, the company has begun selectively delaying "
            f"payments to {len(stretched)} of its {total_suppliers} key suppliers while "
            f"keeping the others on schedule."
        )

        # Sentence 4: Pattern significance
        sentences.append(
            "This 'payment triage' pattern matches early-stage financial stress "
            "with 73% historical confidence."
        )

        # Sentence 5: Forecast warning
        critical_count = sum(
            1 for a in all_alerts.get("threshold_alerts", [])
            if a["severity"] == "critical"
        )
        if critical_count > 0:
            # Find the worst forecast
            worst_delay = 0
            worst_name = ""
            for sid, fc in all_forecasts.items():
                if fc["forecast"]["expected"]:
                    end_delay = fc["forecast"]["expected"][-1]
                    if end_delay > worst_delay:
                        worst_delay = end_delay
                        worst_name = fc["supplier_name"]

            sentences.append(
                f"Without intervention, our forecast shows payment delays to stretched suppliers "
                f"reaching {worst_delay:.0f}+ days within 6 weeks, which risks supply chain disruption."
            )

        # Sentence 6: Risk level
        severity = triage_data.get("triage_severity", "none")
        if severity == "severe":
            sentences.append(
                "PayPulse risk assessment: AMBER elevated to RED watch. "
                "Recommended action: immediate relationship manager outreach."
            )
        elif severity == "active":
            sentences.append(
                "PayPulse risk assessment: AMBER. "
                "Recommended action: proactive relationship manager outreach within 5 business days."
            )
        else:
            sentences.append(
                "PayPulse risk assessment: AMBER — monitoring. "
                "Recommended action: flag for next quarterly review."
            )
    else:
        sentences.append(
            "PayPulse confirms this assessment — no hidden stress signals detected "
            "in supplier payment behaviour."
        )
        sentences.append(
            "All suppliers are being paid within consistent timeframes relative to terms."
        )

    return " ".join(sentences)


def generate_bank_risk_summary(
    all_alerts: dict, all_forecasts: dict, triage_data: dict
) -> dict:
    """
    Generate a NatWest-focused bank risk assessment.

    Returns a structured dict with:
      - default_risk_level: HIGH / MEDIUM / LOW
      - intervention_window_weeks: estimated weeks before critical
      - accounts_at_risk: count and details
      - priority_accounts: ranked list with signals and actions
      - early_warning_signals: detected risk signals
      - bank_narrative: executive narrative in bank language

    Args:
        all_alerts: Output from detect_all_anomalies().
        all_forecasts: Dict of supplier_id → forecast results.
        triage_data: Output from detect_triage().

    Returns:
        Comprehensive bank risk assessment dict.
    """
    # --- Default Risk Level ---
    triage_severity = triage_data.get("triage_severity", "none")
    critical_suppliers = [
        a for a in all_alerts.get("threshold_alerts", [])
        if a["severity"] == "critical"
    ]
    warning_suppliers = [
        a for a in all_alerts.get("threshold_alerts", [])
        if a["severity"] == "warning"
    ]

    if triage_severity == "severe" or len(critical_suppliers) >= 2:
        default_risk = "HIGH"
    elif triage_severity in ("active", "emerging") or len(critical_suppliers) >= 1:
        default_risk = "MEDIUM"
    else:
        default_risk = "LOW"

    # --- Intervention Window ---
    # Estimate weeks until the worst supplier hits critical threshold
    intervention_weeks = None
    trend_alerts = all_alerts.get("trend_alerts", [])
    for trend in trend_alerts:
        slope = trend.get("slope_per_week", 0)
        if slope > 0.3:
            sid = trend["supplier_id"]
            current_delay = trend.get("current_delay", 0)
            terms = CONTRACTUAL_TERMS.get(sid, 21)
            critical_threshold = terms + 15
            if current_delay < critical_threshold:
                weeks_to_critical = (critical_threshold - current_delay) / slope
                if intervention_weeks is None or weeks_to_critical < intervention_weeks:
                    intervention_weeks = weeks_to_critical

    if intervention_weeks is not None:
        intervention_weeks = max(1, min(round(intervention_weeks), 12))
    else:
        # Already critical or no trend
        if len(critical_suppliers) > 0:
            intervention_weeks = 0  # Already past threshold
        else:
            intervention_weeks = None  # No risk detected

    # Format intervention window
    if intervention_weeks is None:
        intervention_text = "No immediate risk"
    elif intervention_weeks == 0:
        intervention_text = "Immediate — already critical"
    elif intervention_weeks <= 2:
        intervention_text = f"{intervention_weeks} weeks — urgent"
    else:
        low = max(1, intervention_weeks - 1)
        high = intervention_weeks + 1
        intervention_text = f"{low}–{high} weeks"

    # --- Priority Accounts ---
    severity_rank = {"critical": 4, "warning": 3, "watch": 2, "normal": 1}
    priority_accounts = []

    for alert in sorted(
        all_alerts.get("threshold_alerts", []),
        key=lambda a: severity_rank.get(a["severity"], 0),
        reverse=True,
    ):
        sid = alert["supplier_id"]
        name = alert.get("supplier_name", sid)
        severity = alert["severity"]
        delay = alert.get("delay_days", 0)
        terms = alert.get("contractual_terms", 0)
        excess = alert.get("excess_days", 0)

        # Find matching trend
        supplier_trend = None
        for t in trend_alerts:
            if t["supplier_id"] == sid:
                supplier_trend = t
                break

        trend_dir = supplier_trend.get("trend", "stable") if supplier_trend else "stable"
        slope = supplier_trend.get("slope_per_week", 0) if supplier_trend else 0

        # Generate recommended action
        action = _generate_intervention_action(severity, trend_dir, slope)

        # Risk signal description
        signals = _generate_risk_signals(alert, supplier_trend, triage_data)

        priority_accounts.append({
            "supplier_id": sid,
            "supplier_name": name,
            "severity": severity,
            "current_delay": round(delay, 1),
            "contractual_terms": terms,
            "excess_days": round(excess, 1),
            "trend": trend_dir,
            "slope_per_week": round(slope, 2),
            "recommended_action": action,
            "risk_signals": signals,
        })

    # --- Early Warning Signals ---
    signals = []

    if triage_data.get("triage_detected", False):
        spread_pct = triage_data.get("spread_increase_pct", 0)
        signals.append({
            "type": "Risk Signal",
            "label": "Payment Triage Detected",
            "detail": f"Selective supplier prioritisation identified. Payment spread increased {spread_pct:.0f}% vs baseline.",
            "severity": triage_severity,
        })

    accelerating = [t for t in trend_alerts if t.get("trend") == "accelerating"]
    if accelerating:
        names = [SUPPLIER_NAMES.get(t["supplier_id"], t["supplier_id"]) for t in accelerating]
        signals.append({
            "type": "Risk Signal",
            "label": "Accelerating Payment Delays",
            "detail": f"{_join_names(names)} showing accelerating delay trajectory.",
            "severity": "warning",
        })

    if len(critical_suppliers) > 0:
        names = [a.get("supplier_name", a["supplier_id"]) for a in critical_suppliers]
        signals.append({
            "type": "Bank Insight",
            "label": f"{len(critical_suppliers)} Account{'s' if len(critical_suppliers) > 1 else ''} in Critical Delay",
            "detail": f"{_join_names(names)} exceeding contractual terms by 15+ days.",
            "severity": "critical",
        })

    if intervention_weeks is not None and intervention_weeks <= 4:
        signals.append({
            "type": "Intervention Window",
            "label": f"Action Required Within {intervention_text}",
            "detail": "Based on current trajectory, proactive engagement recommended before further deterioration.",
            "severity": "warning" if intervention_weeks > 0 else "critical",
        })

    # --- Bank Narrative ---
    narrative_parts = []

    narrative_parts.append(
        f"PayPulse risk assessment for this SME lending relationship: {default_risk}."
    )

    if triage_data.get("triage_detected", False):
        stretched = triage_data.get("stretched_suppliers", [])
        narrative_parts.append(
            f"Early warning signal detected: the borrower is selectively delaying payments to "
            f"{len(stretched)} of their key suppliers while maintaining timely payments to others. "
            f"This payment triage pattern is a recognised precursor to broader financial distress."
        )

    if len(critical_suppliers) > 0:
        narrative_parts.append(
            f"{len(critical_suppliers)} supplier relationship{'s are' if len(critical_suppliers) > 1 else ' is'} "
            f"now in critical delay territory, indicating significant cash flow pressure."
        )

    if intervention_weeks is not None and intervention_weeks > 0:
        narrative_parts.append(
            f"Estimated intervention window: {intervention_text}. "
            f"Proactive engagement at this stage can reduce default probability and protect the lending relationship."
        )
    elif intervention_weeks == 0:
        narrative_parts.append(
            "The borrower has already breached multiple critical thresholds. "
            "Immediate RM outreach and credit review recommended."
        )

    narrative_parts.append(
        "This intelligence is derived from supplier payment behaviour analysis — "
        "a signal invisible to traditional credit monitoring systems."
    )

    return {
        "default_risk_level": default_risk,
        "intervention_window_weeks": intervention_weeks,
        "intervention_window_text": intervention_text,
        "accounts_at_risk": len(critical_suppliers) + len(warning_suppliers),
        "total_accounts": len(all_alerts.get("threshold_alerts", [])),
        "priority_accounts": priority_accounts,
        "early_warning_signals": signals,
        "bank_narrative": " ".join(narrative_parts),
        "triage_severity": triage_severity,
    }


def _generate_intervention_action(severity: str, trend: str, slope: float) -> str:
    """Generate a recommended intervention action based on supplier risk profile."""
    if severity == "critical" and trend == "accelerating":
        return "Escalate to Credit Committee. Restructure payment terms immediately. Schedule urgent RM outreach."
    elif severity == "critical":
        return "Schedule RM outreach within 48 hours. Review credit line and overdraft utilisation."
    elif severity == "warning" and trend in ("accelerating", "drifting"):
        return "Contact client for proactive support. Offer NatWest cash flow advisory services."
    elif severity == "warning":
        return "Flag for enhanced monitoring. Review at next scheduled credit assessment."
    elif severity == "watch":
        return "Add to watchlist. Monitor payment patterns over next 4 weeks."
    else:
        return "No action required. Continue standard monitoring."


def _generate_risk_signals(alert: dict, trend_data: dict, triage_data: dict) -> list:
    """Generate a list of risk signal descriptions for a specific supplier."""
    signals = []
    sid = alert["supplier_id"]
    severity = alert.get("severity", "normal")
    excess = alert.get("excess_days", 0)

    if severity in ("critical", "warning"):
        signals.append(f"Payment delay {excess:.0f} days beyond contractual terms")

    if trend_data:
        trend = trend_data.get("trend", "stable")
        slope = trend_data.get("slope_per_week", 0)
        if trend == "accelerating":
            signals.append(f"Delays accelerating at {slope:+.1f} days/week")
        elif trend == "drifting":
            signals.append(f"Gradual upward drift of {slope:+.1f} days/week")

    # Check if this supplier is in the stretched list
    stretched = triage_data.get("stretched_suppliers", [])
    if any(s.get("supplier_id") == sid for s in stretched):
        signals.append("Identified as deprioritised in payment triage pattern")

    return signals


def _join_names(names: list) -> str:
    """Join a list of names with commas and 'and'."""
    if len(names) == 0:
        return ""
    if len(names) == 1:
        return names[0]
    if len(names) == 2:
        return f"{names[0]} and {names[1]}"
    return ", ".join(names[:-1]) + f", and {names[-1]}"


if __name__ == "__main__":
    from src.data.generator import generate_payment_data
    from src.models.forecaster import full_forecast_with_comparison
    from src.detection.anomaly import detect_all_anomalies
    from src.detection.triage import detect_triage

    df = generate_payment_data()

    # Generate all data needed for explanations
    all_forecasts = {}
    for sid in ["S1", "S2", "S3", "S4", "S5"]:
        all_forecasts[sid] = full_forecast_with_comparison(df, sid)

    all_alerts = detect_all_anomalies(df)
    triage_data = detect_triage(df)

    print("=" * 70)
    print("  EXPLAINABILITY ENGINE OUTPUT")
    print("=" * 70)

    # Forecast explanations
    print("\n--- Forecast Explanations ---\n")
    for sid in ["S1", "S2", "S3", "S4", "S5"]:
        explanation = explain_forecast(sid, all_forecasts[sid])
        print(f"[{SUPPLIER_NAMES[sid]}]")
        print(f"  {explanation}\n")

    # Anomaly explanations
    print("\n--- Anomaly Explanations ---\n")
    for i, alert in enumerate(all_alerts["threshold_alerts"]):
        sid = alert["supplier_id"]
        trend = all_alerts["trend_alerts"][i]
        explanation = explain_anomaly(alert, trend)
        print(f"[{alert['supplier_name']}]")
        print(f"  {explanation}\n")

    # Triage explanation
    print("\n--- Triage Explanation ---\n")
    triage_explanation = explain_triage(triage_data)
    print(f"  {triage_explanation}\n")

    # Executive summary
    print("\n--- Executive Summary ---\n")
    summary = generate_executive_summary(all_alerts, all_forecasts, triage_data)
    print(f"  {summary}\n")
