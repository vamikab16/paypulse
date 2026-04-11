"""
Data models and validation schemas for PayPulse.

Defines the expected structure of payment data, forecasts, alerts,
and API responses. Used for validation and documentation.
"""

from typing import List, Optional


# ---------------------------------------------------------------------------
# Supplier profile constants
# ---------------------------------------------------------------------------

SUPPLIER_IDS = ["S1", "S2", "S3", "S4", "S5"]

SUPPLIER_NAMES = {
    "S1": "AlphaSteel Corp",
    "S2": "BetaLogistics Ltd",
    "S3": "GammaSupplies Co",
    "S4": "DeltaParts Inc",
    "S5": "EpsilonServices",
}

CONTRACTUAL_TERMS = {
    "S1": 15,
    "S2": 21,
    "S3": 14,
    "S4": 21,
    "S5": 7,
}

# Payment status thresholds (relative to contractual terms)
STATUS_THRESHOLDS = {
    "on_time": 0,          # delay <= terms
    "slightly_late": 5,    # delay <= terms + 5
    "late": 15,            # delay <= terms + 15
    "critical": float("inf"),  # delay > terms + 15
}

# Alert severity levels
ALERT_LEVELS = ["normal", "watch", "warning", "critical"]

# Trend classifications
TREND_LEVELS = ["stable", "drifting", "accelerating"]

# Triage severity levels
TRIAGE_LEVELS = ["none", "emerging", "active", "severe"]


# ---------------------------------------------------------------------------
# Expected data columns
# ---------------------------------------------------------------------------

PAYMENT_HISTORY_COLUMNS = [
    "week_number",
    "date",
    "supplier_id",
    "supplier_name",
    "invoice_amount",
    "payment_delay_days",
    "historical_average_delay",
    "contractual_terms_days",
    "payment_status",
]


def validate_payment_data(df) -> bool:
    """Validate that a DataFrame has the expected payment data structure."""
    missing = set(PAYMENT_HISTORY_COLUMNS) - set(df.columns)
    if missing:
        raise ValueError(f"Missing columns: {missing}")

    if len(df) != 260:
        raise ValueError(f"Expected 260 rows, got {len(df)}")

    if set(df["supplier_id"].unique()) != set(SUPPLIER_IDS):
        raise ValueError("Unexpected supplier IDs")

    if df["week_number"].min() != 1 or df["week_number"].max() != 52:
        raise ValueError("Week numbers must span 1–52")

    return True
