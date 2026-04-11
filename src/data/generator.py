"""
Synthetic data generator for PayPulse demo.

Generates 52 weeks of supplier payment data for Meridian Engineering Ltd
with carefully designed behavioral profiles that demonstrate:
  - Stable suppliers (S1, S5) — consistently timely payments
  - Degrading suppliers (S2, S4) — progressive payment delay increases
  - Regime-shift supplier (S3) — sudden jump in payment delays
  - Triage signal — the gap between favored and stretched suppliers

The data is the foundation of the entire demo narrative.
"""

import os
import json
import numpy as np
import pandas as pd
from datetime import datetime, timedelta


# ---------------------------------------------------------------------------
# Supplier profiles — these define the demo story
# ---------------------------------------------------------------------------

SUPPLIER_PROFILES = {
    "S1": {
        "name": "AlphaSteel Corp",
        "contractual_terms_days": 15,
        "invoice_range": (15000, 25000),  # Largest supplier
        "phases": {
            # (start_week, end_week): (low_delay, high_delay)
            (1, 20):  (14, 18),
            (21, 35): (14, 18),
            (36, 45): (14, 18),
            (46, 52): (14, 18),
        },
        "trend": None,  # No trend — flat profile
    },
    "S2": {
        "name": "BetaLogistics Ltd",
        "contractual_terms_days": 21,
        "invoice_range": (8000, 15000),
        "phases": {
            (1, 20):  (20, 24),
            (21, 35): None,   # Will use linear interpolation 24→32
            (36, 45): None,   # Will use linear interpolation 32→45
            (46, 52): None,   # Will use linear interpolation 45→60
        },
        "trend": [
            # (start_week, end_week, start_delay, end_delay)
            (1, 20, 20, 24),
            (21, 35, 24, 32),
            (36, 45, 32, 45),
            (46, 52, 45, 60),
        ],
    },
    "S3": {
        "name": "GammaSupplies Co",
        "contractual_terms_days": 14,
        "invoice_range": (5000, 10000),
        "phases": {
            (1, 20):  (10, 14),
            (21, 35): (10, 14),
            (36, 45): (25, 35),   # Sudden regime change
            (46, 52): (30, 40),   # Stays elevated
        },
        "trend": None,
    },
    "S4": {
        "name": "DeltaParts Inc",
        "contractual_terms_days": 21,
        "invoice_range": (6000, 12000),
        "phases": {
            (1, 20):  (18, 22),
            (21, 35): None,
            (36, 45): None,
            (46, 52): None,
        },
        "trend": [
            (1, 20, 18, 22),
            (21, 35, 22, 28),
            (36, 45, 28, 38),
            (46, 52, 38, 50),
        ],
    },
    "S5": {
        "name": "EpsilonServices",
        "contractual_terms_days": 7,
        "invoice_range": (2000, 5000),  # Smallest supplier
        "phases": {
            (1, 20):  (7, 10),
            (21, 35): (7, 10),
            (36, 45): (7, 10),
            (46, 52): None,
        },
        "trend": [
            (1, 45, 7, 10),
            (46, 52, 10, 15),  # Slight drift at the end
        ],
    },
}


COMPANY_PROFILE = {
    "company_name": "Meridian Engineering Ltd",
    "sector": "Construction & Engineering",
    "annual_revenue": "£2.4M",
    "employees": 34,
    "natwest_relationship": "Business Current Account + £150K Overdraft",
    "traditional_risk_status": "GREEN — all loan payments current, revenue stable",
    "paypulse_risk_status": "AMBER — supplier payment triage detected",
}


def _generate_delay_for_week(supplier_id: str, week: int, rng: np.random.Generator) -> float:
    """
    Generate a payment delay value for a specific supplier and week.
    
    Uses either flat-range sampling or linear interpolation depending
    on the supplier's profile. Adds ±2 day Gaussian noise.
    """
    profile = SUPPLIER_PROFILES[supplier_id]

    # Check if this supplier uses trend-based generation
    if profile["trend"] is not None:
        for start_w, end_w, start_delay, end_delay in profile["trend"]:
            if start_w <= week <= end_w:
                # Linear interpolation within the phase
                progress = (week - start_w) / max(end_w - start_w, 1)
                base_delay = start_delay + progress * (end_delay - start_delay)
                noise = rng.normal(0, 1.0)  # ±1 day noise for smooth trends
                return max(1, round(base_delay + noise, 1))

    # Flat-range phase-based generation
    for (start_w, end_w), delay_range in profile["phases"].items():
        if start_w <= week <= end_w and delay_range is not None:
            low, high = delay_range
            base_delay = rng.uniform(low, high)
            noise = rng.normal(0, 0.8)  # Tight noise for stable suppliers
            return max(1, round(base_delay + noise, 1))

    # Fallback (should not reach here with correct profiles)
    return 15.0


def generate_payment_data(seed: int = 42) -> pd.DataFrame:
    """
    Generate 52 weeks × 5 suppliers = 260 rows of payment data.

    Returns a DataFrame with columns:
        week_number, date, supplier_id, supplier_name, invoice_amount,
        payment_delay_days, historical_average_delay, contractual_terms_days,
        payment_status
    """
    rng = np.random.default_rng(seed)
    start_date = datetime(2024, 1, 1)  # Monday

    records = []

    for supplier_id, profile in SUPPLIER_PROFILES.items():
        delays_so_far = []

        for week in range(1, 53):
            # Date: each Monday
            date = start_date + timedelta(weeks=week - 1)

            # Payment delay
            delay = _generate_delay_for_week(supplier_id, week, rng)
            delays_so_far.append(delay)

            # Rolling 8-week average
            window = delays_so_far[-8:]
            hist_avg = round(sum(window) / len(window), 1)

            # Invoice amount
            low_inv, high_inv = profile["invoice_range"]
            invoice = round(rng.uniform(low_inv, high_inv), 2)

            # Payment status
            terms = profile["contractual_terms_days"]
            if delay <= terms:
                status = "on_time"
            elif delay <= terms + 5:
                status = "slightly_late"
            elif delay <= terms + 15:
                status = "late"
            else:
                status = "critical"

            records.append({
                "week_number": week,
                "date": date.strftime("%Y-%m-%d"),
                "supplier_id": supplier_id,
                "supplier_name": profile["name"],
                "invoice_amount": invoice,
                "payment_delay_days": delay,
                "historical_average_delay": hist_avg,
                "contractual_terms_days": terms,
                "payment_status": status,
            })

    df = pd.DataFrame(records)

    # Sort by week then supplier for clean output
    df = df.sort_values(["week_number", "supplier_id"]).reset_index(drop=True)

    return df


def generate_company_profile() -> dict:
    """Return the company profile dictionary for Meridian Engineering Ltd."""
    return COMPANY_PROFILE.copy()


def save_data(output_dir: str = "data", seed: int = 42) -> tuple:
    """
    Generate and save all data files.

    Returns:
        (DataFrame, company_profile_dict) tuple
    """
    os.makedirs(output_dir, exist_ok=True)

    # Generate payment history
    df = generate_payment_data(seed=seed)
    csv_path = os.path.join(output_dir, "payment_history.csv")
    df.to_csv(csv_path, index=False)

    # Generate company profile
    profile = generate_company_profile()
    json_path = os.path.join(output_dir, "company_profile.json")
    with open(json_path, "w") as f:
        json.dump(profile, f, indent=2)

    return df, profile


# ---------------------------------------------------------------------------
# Quick validation when run directly
# ---------------------------------------------------------------------------

if __name__ == "__main__":
    print("Generating PayPulse synthetic data...")
    df, profile = save_data()

    print(f"\nRows: {len(df)} (expected 260)")
    print(f"Suppliers: {df['supplier_id'].nunique()}")
    print(f"Weeks: {df['week_number'].nunique()}")
    print(f"\nCompany: {profile['company_name']}")
    print(f"Traditional status: {profile['traditional_risk_status']}")
    print(f"PayPulse status: {profile['paypulse_risk_status']}")

    print("\n--- Payment delay summary by supplier ---")
    summary = df.groupby("supplier_id").agg(
        name=("supplier_name", "first"),
        mean_delay=("payment_delay_days", "mean"),
        min_delay=("payment_delay_days", "min"),
        max_delay=("payment_delay_days", "max"),
        terms=("contractual_terms_days", "first"),
    )
    print(summary.to_string())

    # Show last 8 weeks per supplier to verify profiles
    print("\n--- Last 8 weeks delay per supplier ---")
    for sid in ["S1", "S2", "S3", "S4", "S5"]:
        last8 = df[df["supplier_id"] == sid].tail(8)["payment_delay_days"].tolist()
        name = SUPPLIER_PROFILES[sid]["name"]
        print(f"  {sid} ({name}): {last8}")
