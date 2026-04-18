"""Smoke tests for anomaly detection + request schema validation."""
import pandas as pd
import pytest
from pydantic import ValidationError

from src.detection.anomaly import detect_threshold_breach
from src.api.server import CustomAnalyzeRequest


def _fixture_df(delay: float) -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "week_number": 1,
                "supplier_id": "S1",
                "payment_delay_days": delay,
                "contractual_terms_days": 30,
            }
        ]
    )


def test_threshold_breach_normal_when_within_terms():
    # S1 contractual terms = 15 days; a 10-day delay is inside the healthy band.
    result = detect_threshold_breach(_fixture_df(delay=10), "S1")
    assert result["severity"] == "normal"
    assert result["excess_days"] <= 0


def test_threshold_breach_critical_when_far_over_terms():
    # Delay well above terms+15 triggers the "critical" bucket.
    result = detect_threshold_breach(_fixture_df(delay=60), "S1")
    assert result["severity"] == "critical"
    assert result["excess_days"] > 15


def test_custom_analyze_schema_rejects_negative_delay():
    # Pydantic should block nonsense inputs before they reach the ML pipeline.
    with pytest.raises(ValidationError):
        CustomAnalyzeRequest(
            suppliers=[
                {
                    "supplier_id": "C1",
                    "supplier_name": "Test",
                    "contractual_terms_days": 30,
                    "payments": [{"week": 1, "delay": -5, "invoice": 100}],
                }
            ]
        )


def test_custom_analyze_schema_requires_non_empty_suppliers():
    with pytest.raises(ValidationError):
        CustomAnalyzeRequest(suppliers=[])
