"""
Baseline forecasting model for PayPulse.

Uses a simple rolling average (8-week window) to predict future payment delays.
This serves as the comparison benchmark — the improved model must beat this.

The baseline model is intentionally simple: it cannot capture trends or
acceleration. This contrast is what demonstrates the value of the improved model.
"""

import pandas as pd
import numpy as np


def baseline_forecast(df: pd.DataFrame, supplier_id: str, horizon: int = 6) -> dict:
    """
    Generate a simple rolling-average forecast for a supplier.

    Takes the average of the last 8 weeks of payment delays and projects
    that flat value forward for `horizon` weeks. No trend, no uncertainty.

    Args:
        df: Full payment history DataFrame.
        supplier_id: Which supplier to forecast (e.g., "S2").
        horizon: Number of weeks to forecast (default 6).

    Returns:
        dict with keys:
            - supplier_id: str
            - weeks: list of future week numbers
            - forecast: list of forecasted delay values (all identical)
            - method: "rolling_average_8w"
    """
    supplier_data = df[df["supplier_id"] == supplier_id].sort_values("week_number")
    delays = supplier_data["payment_delay_days"].values
    last_week = int(supplier_data["week_number"].max())

    # Rolling average of last 8 weeks
    window_size = min(8, len(delays))
    rolling_avg = float(np.mean(delays[-window_size:]))

    # Project flat forward
    future_weeks = list(range(last_week + 1, last_week + 1 + horizon))
    forecast_values = [round(rolling_avg, 1)] * horizon

    return {
        "supplier_id": supplier_id,
        "weeks": future_weeks,
        "forecast": forecast_values,
        "method": "rolling_average_8w",
    }


def baseline_evaluate(df: pd.DataFrame, supplier_id: str, train_weeks: int = 44) -> dict:
    """
    Evaluate baseline model accuracy using a train/test split.

    Trains on the first `train_weeks` weeks, tests on the remainder.
    Uses MAE (Mean Absolute Error) as the metric.

    Args:
        df: Full payment history DataFrame.
        supplier_id: Which supplier to evaluate.
        train_weeks: Number of weeks for training (default 44, leaving 8 for test).

    Returns:
        dict with keys:
            - supplier_id: str
            - mae: float (Mean Absolute Error on test set)
            - predictions: list of predicted values
            - actuals: list of actual values
    """
    supplier_data = df[df["supplier_id"] == supplier_id].sort_values("week_number")
    delays = supplier_data["payment_delay_days"].values

    train = delays[:train_weeks]
    test = delays[train_weeks:]

    if len(test) == 0:
        return {"supplier_id": supplier_id, "mae": 0.0, "predictions": [], "actuals": []}

    # Baseline prediction: average of last 8 weeks of training data
    window_size = min(8, len(train))
    prediction = float(np.mean(train[-window_size:]))

    predictions = [round(prediction, 1)] * len(test)
    actuals = [round(float(v), 1) for v in test]

    mae = float(np.mean(np.abs(np.array(actuals) - np.array(predictions))))

    return {
        "supplier_id": supplier_id,
        "mae": round(mae, 2),
        "predictions": predictions,
        "actuals": actuals,
    }


if __name__ == "__main__":
    from src.data.generator import generate_payment_data

    df = generate_payment_data()

    print("=== Baseline Forecast (6-week horizon) ===\n")
    for sid in ["S1", "S2", "S3", "S4", "S5"]:
        result = baseline_forecast(df, sid)
        print(f"{sid}: forecast = {result['forecast'][0]} days (flat)")

    print("\n=== Baseline Evaluation (MAE) ===\n")
    for sid in ["S1", "S2", "S3", "S4", "S5"]:
        result = baseline_evaluate(df, sid)
        print(f"{sid}: MAE = {result['mae']:.2f} days")
