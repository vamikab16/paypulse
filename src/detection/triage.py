"""
Supplier triage behavior detection for PayPulse.

THIS IS THE KEY DIFFERENTIATOR of the entire system.

Triage detection identifies when a business is selectively prioritizing
payments to certain suppliers while stretching others. This "payment triage"
is a recognized early indicator of cash flow stress — businesses under
pressure protect their most critical supplier relationships while delaying
payments to others they perceive as more flexible.

The critical insight: traditional banking metrics (loan payments, revenue)
may still look healthy while triage behavior is already underway. PayPulse
catches this hidden signal.

Detection logic:
  1. Measure the spread of payment delays across suppliers each week
  2. Compare to a healthy baseline period (weeks 1–12)
  3. Flag when the spread increases significantly AND there's a clear
     split between "favored" and "stretched" suppliers
"""

import numpy as np
import pandas as pd

from src.data.schemas import CONTRACTUAL_TERMS, SUPPLIER_NAMES


def detect_triage(df: pd.DataFrame, baseline_weeks: int = 12) -> dict:
    """
    Detect supplier triage behavior across all suppliers.

    Triage = the business is choosing who gets paid on time and who doesn't.
    This is detected by measuring the cross-supplier spread of payment delays
    and comparing it to a healthy baseline period.

    Severity levels:
      - none:     no triage behavior detected
      - emerging: spread increased 50–100% vs baseline
      - active:   spread increased 100–150% vs baseline
      - severe:   spread increased >150% AND 2+ suppliers stretched

    Args:
        df: Full payment history DataFrame.
        baseline_weeks: Number of initial weeks to use as healthy baseline.

    Returns:
        Comprehensive triage assessment dict.
    """
    supplier_ids = sorted(df["supplier_id"].unique())
    max_week = int(df["week_number"].max())

    # Step 1: Calculate baseline spread (weeks 1 to baseline_weeks)
    baseline_spreads = []
    for week in range(1, baseline_weeks + 1):
        week_data = df[df["week_number"] == week]
        if len(week_data) < len(supplier_ids):
            continue
        delays = week_data["payment_delay_days"].values
        spread = float(np.max(delays) - np.min(delays))
        baseline_spreads.append(spread)

    baseline_avg_spread = float(np.mean(baseline_spreads)) if baseline_spreads else 10.0

    # Step 2: Calculate weekly triage metrics from baseline_weeks onward
    weekly_scores = []
    first_detected_week = None

    for week in range(baseline_weeks + 1, max_week + 1):
        week_data = df[df["week_number"] == week]
        if len(week_data) < len(supplier_ids):
            continue

        delays_by_supplier = {}
        for _, row in week_data.iterrows():
            sid = row["supplier_id"]
            delays_by_supplier[sid] = float(row["payment_delay_days"])

        all_delays = list(delays_by_supplier.values())
        spread = max(all_delays) - min(all_delays)
        mean_delay = float(np.mean(all_delays))
        std_delay = float(np.std(all_delays))

        # Triage score: how much has spread increased vs baseline
        spread_ratio = spread / max(baseline_avg_spread, 1.0)
        spread_increase_pct = (spread - baseline_avg_spread) / max(baseline_avg_spread, 1.0) * 100

        # Identify favored vs stretched suppliers
        favored = []
        stretched = []
        for sid, delay in delays_by_supplier.items():
            terms = CONTRACTUAL_TERMS[sid]
            if delay <= terms + 3:
                favored.append(sid)
            elif delay > terms + 10:
                stretched.append(sid)

        # Determine triage severity for this week
        has_favored = len(favored) >= 1
        has_stretched = len(stretched) >= 1
        triage_active = has_favored and has_stretched

        if spread_increase_pct > 150 and len(stretched) >= 2:
            severity = "severe"
        elif spread_increase_pct > 100:
            severity = "active"
        elif spread_increase_pct > 50:
            severity = "emerging"
        else:
            severity = "none"

        # Override to "none" if there's no clear favored/stretched split
        if not triage_active:
            severity = "none"

        if severity != "none" and first_detected_week is None:
            first_detected_week = week

        weekly_scores.append({
            "week": week,
            "spread": round(spread, 1),
            "spread_ratio": round(spread_ratio, 2),
            "spread_increase_pct": round(spread_increase_pct, 1),
            "mean_delay": round(mean_delay, 1),
            "std_delay": round(std_delay, 1),
            "favored": favored,
            "stretched": stretched,
            "severity": severity,
        })

    # Step 3: Overall triage assessment (based on latest week)
    latest = weekly_scores[-1] if weekly_scores else None

    if latest is None:
        return {
            "triage_detected": False,
            "triage_severity": "none",
            "message": "Insufficient data for triage detection",
        }

    # Get the overall assessment from the most recent few weeks
    recent_severities = [w["severity"] for w in weekly_scores[-4:]]
    severity_order = {"none": 0, "emerging": 1, "active": 2, "severe": 3}
    max_recent = max(recent_severities, key=lambda s: severity_order[s])

    triage_detected = max_recent != "none"

    # Build favored/stretched lists from latest week
    favored_names = [
        {"id": sid, "name": SUPPLIER_NAMES[sid], "delay": latest["spread"]}
        for sid in latest["favored"]
    ]
    stretched_names = [
        {"id": sid, "name": SUPPLIER_NAMES[sid]}
        for sid in latest["stretched"]
    ]

    # Get current delay details for favored and stretched suppliers
    latest_week_data = df[df["week_number"] == max_week]
    supplier_delays = {}
    for _, row in latest_week_data.iterrows():
        sid = row["supplier_id"]
        supplier_delays[sid] = round(float(row["payment_delay_days"]), 1)

    favored_detail = []
    for sid in latest.get("favored", []):
        favored_detail.append({
            "supplier_id": sid,
            "supplier_name": SUPPLIER_NAMES[sid],
            "current_delay": supplier_delays.get(sid, 0),
            "contractual_terms": CONTRACTUAL_TERMS[sid],
        })

    stretched_detail = []
    for sid in latest.get("stretched", []):
        stretched_detail.append({
            "supplier_id": sid,
            "supplier_name": SUPPLIER_NAMES[sid],
            "current_delay": supplier_delays.get(sid, 0),
            "contractual_terms": CONTRACTUAL_TERMS[sid],
        })

    return {
        "triage_detected": triage_detected,
        "triage_severity": max_recent,
        "first_detected_week": first_detected_week,
        "current_spread": latest["spread"],
        "baseline_spread": round(baseline_avg_spread, 1),
        "spread_increase_pct": latest["spread_increase_pct"],
        "favored_suppliers": favored_detail,
        "stretched_suppliers": stretched_detail,
        "supplier_delays": supplier_delays,
        "weekly_scores": weekly_scores,
    }


if __name__ == "__main__":
    from src.data.generator import generate_payment_data

    df = generate_payment_data()
    result = detect_triage(df)

    print("=" * 70)
    print("  TRIAGE DETECTION RESULTS")
    print("=" * 70)
    print()
    print(f"  Triage detected:     {result['triage_detected']}")
    print(f"  Severity:            {result['triage_severity']}")
    print(f"  First detected:      Week {result.get('first_detected_week', 'N/A')}")
    print(f"  Current spread:      {result.get('current_spread', 'N/A')} days")
    print(f"  Baseline spread:     {result.get('baseline_spread', 'N/A')} days")
    print(f"  Spread increase:     {result.get('spread_increase_pct', 'N/A')}%")

    print(f"\n  FAVORED suppliers (getting paid on time):")
    for s in result.get("favored_suppliers", []):
        print(f"    ✓ {s['supplier_name']} — {s['current_delay']}d (terms: {s['contractual_terms']}d)")

    print(f"\n  STRETCHED suppliers (being delayed):")
    for s in result.get("stretched_suppliers", []):
        print(f"    ✗ {s['supplier_name']} — {s['current_delay']}d (terms: {s['contractual_terms']}d)")

    # Show weekly severity progression
    print(f"\n  Weekly severity (last 20 weeks):")
    for w in result["weekly_scores"][-20:]:
        bar = "█" * int(w["spread"] / 2)
        print(f"    Week {w['week']:>2}: [{w['severity']:>8}] spread={w['spread']:>5.1f}d  {bar}")
