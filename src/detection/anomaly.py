"""
Anomaly detection for PayPulse.

Two detection systems:
  1. Threshold breach — compares current delay against contractual terms
  2. Trend detection — identifies accelerating payment delays via linear regression

These work per-supplier. The cross-supplier triage detection is in triage.py.
"""

import numpy as np
import pandas as pd
from scipy import stats

from src.data.schemas import CONTRACTUAL_TERMS, SUPPLIER_NAMES


def detect_threshold_breach(df: pd.DataFrame, supplier_id: str, week: int = None) -> dict:
    """
    Check if a supplier's payment delay exceeds contractual terms.

    Severity levels:
      - normal:   delay <= terms
      - watch:    terms < delay <= terms + 7
      - warning:  terms + 7 < delay <= terms + 15
      - critical: delay > terms + 15

    Args:
        df: Payment history DataFrame.
        supplier_id: Supplier to check.
        week: Specific week to check (default: latest week).

    Returns:
        dict with severity, delay, terms, and excess days.
    """
    supplier_data = df[df["supplier_id"] == supplier_id].sort_values("week_number")

    if week is not None:
        row = supplier_data[supplier_data["week_number"] == week]
    else:
        row = supplier_data.tail(1)

    if row.empty:
        return {"supplier_id": supplier_id, "severity": "unknown", "error": "No data"}

    delay = float(row["payment_delay_days"].iloc[0])
    terms = CONTRACTUAL_TERMS[supplier_id]
    excess = delay - terms
    check_week = int(row["week_number"].iloc[0])

    if delay <= terms:
        severity = "normal"
    elif delay <= terms + 7:
        severity = "watch"
    elif delay <= terms + 15:
        severity = "warning"
    else:
        severity = "critical"

    return {
        "supplier_id": supplier_id,
        "supplier_name": SUPPLIER_NAMES[supplier_id],
        "week": check_week,
        "delay_days": round(delay, 1),
        "contractual_terms": terms,
        "excess_days": round(max(0, excess), 1),
        "severity": severity,
    }


def detect_trend(df: pd.DataFrame, supplier_id: str, lookback: int = 6) -> dict:
    """
    Detect trend in payment delays using linear regression over recent weeks.

    Classifications:
      - stable:       slope <= 0.5 days/week
      - drifting:     0.5 < slope <= 1.0 days/week
      - accelerating: slope > 1.0 days/week

    A negative slope indicates improving (decreasing) delays.

    Args:
        df: Payment history DataFrame.
        supplier_id: Supplier to analyze.
        lookback: Number of recent weeks to analyze (default 6).

    Returns:
        dict with trend classification, slope, and statistical details.
    """
    supplier_data = df[df["supplier_id"] == supplier_id].sort_values("week_number")
    recent = supplier_data.tail(lookback)

    if len(recent) < 3:
        return {
            "supplier_id": supplier_id,
            "trend": "insufficient_data",
            "slope": 0.0,
        }

    weeks = recent["week_number"].values.astype(float)
    delays = recent["payment_delay_days"].values.astype(float)

    # Simple linear regression
    slope, intercept, r_value, p_value, std_err = stats.linregress(weeks, delays)

    if slope > 1.0:
        trend = "accelerating"
    elif slope > 0.5:
        trend = "drifting"
    elif slope < -0.5:
        trend = "improving"
    else:
        trend = "stable"

    # Calculate recent change rate (last week vs 6 weeks ago)
    delay_change = float(delays[-1] - delays[0])

    return {
        "supplier_id": supplier_id,
        "supplier_name": SUPPLIER_NAMES[supplier_id],
        "trend": trend,
        "slope_per_week": round(slope, 2),
        "r_squared": round(r_value ** 2, 3),
        "p_value": round(p_value, 4),
        "delay_change_over_period": round(delay_change, 1),
        "current_delay": round(float(delays[-1]), 1),
        "lookback_weeks": lookback,
    }


def detect_all_anomalies(df: pd.DataFrame) -> dict:
    """
    Run all anomaly detections on all suppliers.

    Returns a comprehensive anomaly report with threshold breaches
    and trend analysis for every supplier.

    Args:
        df: Full payment history DataFrame.

    Returns:
        dict with keys:
            - threshold_alerts: list of threshold breach results
            - trend_alerts: list of trend analysis results
            - summary: dict with alert counts by severity
    """
    supplier_ids = sorted(df["supplier_id"].unique())
    threshold_alerts = []
    trend_alerts = []

    for sid in supplier_ids:
        # Threshold check on latest week
        threshold = detect_threshold_breach(df, sid)
        threshold_alerts.append(threshold)

        # Trend check over last 6 weeks
        trend = detect_trend(df, sid)
        trend_alerts.append(trend)

    # Build summary counts
    severity_counts = {}
    for alert in threshold_alerts:
        sev = alert["severity"]
        severity_counts[sev] = severity_counts.get(sev, 0) + 1

    trend_counts = {}
    for alert in trend_alerts:
        t = alert["trend"]
        trend_counts[t] = trend_counts.get(t, 0) + 1

    # Identify suppliers needing attention (warning or critical)
    attention_needed = [
        a for a in threshold_alerts if a["severity"] in ("warning", "critical")
    ]

    # Build weekly alert timeline
    timeline = _build_alert_timeline(df)

    return {
        "threshold_alerts": threshold_alerts,
        "trend_alerts": trend_alerts,
        "timeline": timeline,
        "summary": {
            "total_suppliers": len(supplier_ids),
            "severity_counts": severity_counts,
            "trend_counts": trend_counts,
            "attention_needed": len(attention_needed),
            "suppliers_at_risk": [a["supplier_id"] for a in attention_needed],
        },
    }


def _build_alert_timeline(df: pd.DataFrame) -> list:
    """
    Build a chronological timeline of when alerts first appeared.

    Scans week by week and records the first time each supplier
    crosses a threshold level.
    """
    supplier_ids = sorted(df["supplier_id"].unique())
    timeline = []
    previous_severity = {sid: "normal" for sid in supplier_ids}

    for week in range(1, 53):
        for sid in supplier_ids:
            alert = detect_threshold_breach(df, sid, week=week)
            current = alert["severity"]
            prev = previous_severity[sid]

            # Record when severity escalates
            severity_order = ["normal", "watch", "warning", "critical"]
            if severity_order.index(current) > severity_order.index(prev):
                timeline.append({
                    "week": week,
                    "supplier_id": sid,
                    "supplier_name": SUPPLIER_NAMES[sid],
                    "event": f"Escalated from {prev} to {current}",
                    "severity": current,
                    "delay_days": alert["delay_days"],
                    "excess_days": alert["excess_days"],
                })

            previous_severity[sid] = current

    return timeline


if __name__ == "__main__":
    from src.data.generator import generate_payment_data

    df = generate_payment_data()
    results = detect_all_anomalies(df)

    print("=" * 70)
    print("  ANOMALY DETECTION RESULTS (Week 52)")
    print("=" * 70)

    print("\n--- Threshold Breach Alerts ---")
    print(f"{'Supplier':<22} {'Delay':>7} {'Terms':>6} {'Excess':>7} {'Severity':>10}")
    print("-" * 55)
    for a in results["threshold_alerts"]:
        print(
            f"{a['supplier_name']:<22} "
            f"{a['delay_days']:>5.1f}d  "
            f"{a['contractual_terms']:>4}d  "
            f"{a['excess_days']:>5.1f}d  "
            f"{a['severity']:>10}"
        )

    print("\n--- Trend Analysis ---")
    print(f"{'Supplier':<22} {'Trend':>14} {'Slope':>8} {'Change':>8}")
    print("-" * 55)
    for t in results["trend_alerts"]:
        print(
            f"{t['supplier_name']:<22} "
            f"{t['trend']:>14}  "
            f"{t['slope_per_week']:>+5.2f}  "
            f"{t['delay_change_over_period']:>+6.1f}d"
        )

    print(f"\n--- Summary ---")
    print(f"Severity counts: {results['summary']['severity_counts']}")
    print(f"Trend counts: {results['summary']['trend_counts']}")
    print(f"Suppliers at risk: {results['summary']['suppliers_at_risk']}")

    print(f"\n--- Alert Timeline (first 10) ---")
    for event in results["timeline"][:10]:
        print(f"  Week {event['week']:>2}: {event['supplier_name']} — {event['event']} (delay: {event['delay_days']}d)")
