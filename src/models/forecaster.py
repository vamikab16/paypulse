"""
Improved forecasting model for PayPulse.

Uses Holt-Winters exponential smoothing (from statsmodels) to capture
trends in payment delay data. Falls back to simple exponential smoothing
for suppliers with no detectable trend.

Key advantages over the baseline:
  - Captures upward/downward trends in payment delays
  - Generates uncertainty bands (low / expected / high)
  - Provides model vs baseline MAE comparison
"""

import warnings
import numpy as np
import pandas as pd
from statsmodels.tsa.holtwinters import ExponentialSmoothing, SimpleExpSmoothing

# Suppress convergence warnings from statsmodels during fitting
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=RuntimeWarning)


def _fit_model(delays: np.ndarray):
    """
    Fit the best exponential smoothing model to the delay series.

    Tries Holt (additive trend, no seasonality) first. If that fails
    or the series is too short, falls back to Simple Exponential Smoothing.

    Returns:
        (fitted_model, model_type_str)
    """
    if len(delays) < 4:
        # Too short for anything but simple smoothing
        model = SimpleExpSmoothing(delays, initialization_method="estimated")
        fitted = model.fit(optimized=True)
        return fitted, "simple_exponential"

    # Try Holt's linear method (trend, no seasonality)
    try:
        model = ExponentialSmoothing(
            delays,
            trend="add",
            seasonal=None,
            initialization_method="estimated",
        )
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            fitted = model.fit(optimized=True)

        # Check if trend component is meaningful
        # If the trend parameter is near zero, fall back to simple
        if fitted.params.get("smoothing_trend", 0) < 0.001:
            raise ValueError("No meaningful trend detected")

        return fitted, "holt_linear"

    except Exception:
        # Fall back to simple exponential smoothing
        model = SimpleExpSmoothing(delays, initialization_method="estimated")
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            fitted = model.fit(optimized=True)
        return fitted, "simple_exponential"


def improved_forecast(df: pd.DataFrame, supplier_id: str, horizon: int = 6) -> dict:
    """
    Generate an improved forecast with uncertainty bands.

    Uses Holt-Winters exponential smoothing to capture trends.
    Produces expected, low, and high forecast bands.

    Args:
        df: Full payment history DataFrame.
        supplier_id: Which supplier to forecast.
        horizon: Number of weeks to forecast (default 6).

    Returns:
        dict with keys:
            - supplier_id: str
            - weeks: list of future week numbers
            - expected: list of point forecasts
            - low: list of lower bound forecasts
            - high: list of upper bound forecasts
            - method: str describing the model used
    """
    supplier_data = df[df["supplier_id"] == supplier_id].sort_values("week_number")
    delays = supplier_data["payment_delay_days"].values.astype(float)
    last_week = int(supplier_data["week_number"].max())

    # Fit the model
    fitted, model_type = _fit_model(delays)

    # Generate point forecast
    forecast = fitted.forecast(horizon)
    expected = [round(max(0, float(v)), 1) for v in forecast]

    # Calculate residual standard error for uncertainty bands
    residuals = delays - fitted.fittedvalues
    residual_se = float(np.std(residuals))

    # Generate uncertainty bands: ±1.5 × residual SE
    # Widen slightly for further-out forecasts
    low = []
    high = []
    for i, val in enumerate(expected):
        width = 1.5 * residual_se * (1 + 0.1 * i)  # Slightly wider for further horizons
        low.append(round(max(0, val - width), 1))
        high.append(round(val + width, 1))

    future_weeks = list(range(last_week + 1, last_week + 1 + horizon))

    return {
        "supplier_id": supplier_id,
        "weeks": future_weeks,
        "expected": expected,
        "low": low,
        "high": high,
        "method": model_type,
    }


def improved_evaluate(df: pd.DataFrame, supplier_id: str, train_weeks: int = 44) -> dict:
    """
    Evaluate the improved model using a train/test split.

    Args:
        df: Full payment history DataFrame.
        supplier_id: Which supplier to evaluate.
        train_weeks: Number of weeks for training (default 44).

    Returns:
        dict with keys:
            - supplier_id: str
            - mae: float (Mean Absolute Error on test set)
            - predictions: list of predicted values
            - actuals: list of actual values
    """
    supplier_data = df[df["supplier_id"] == supplier_id].sort_values("week_number")
    delays = supplier_data["payment_delay_days"].values.astype(float)

    train = delays[:train_weeks]
    test = delays[train_weeks:]
    test_len = len(test)

    if test_len == 0:
        return {"supplier_id": supplier_id, "mae": 0.0, "predictions": [], "actuals": []}

    # Fit on training data
    fitted, model_type = _fit_model(train)

    # Forecast for the test period
    forecast = fitted.forecast(test_len)
    predictions = [round(max(0, float(v)), 1) for v in forecast]
    actuals = [round(float(v), 1) for v in test]

    mae = float(np.mean(np.abs(np.array(actuals) - np.array(predictions))))

    return {
        "supplier_id": supplier_id,
        "mae": round(mae, 2),
        "predictions": predictions,
        "actuals": actuals,
    }


def compare_models(df: pd.DataFrame, supplier_id: str, train_weeks: int = 44) -> dict:
    """
    Compare baseline vs improved model for a single supplier.

    Returns a comparison dict showing MAE for both models and
    the percentage improvement of the improved model.

    Args:
        df: Full payment history DataFrame.
        supplier_id: Which supplier to compare.
        train_weeks: Training cutoff week.

    Returns:
        dict with keys:
            - supplier_id: str
            - supplier_name: str
            - baseline_mae: float
            - model_mae: float
            - improvement_pct: float (positive = improved model is better)
    """
    from src.models.baseline import baseline_evaluate

    baseline_result = baseline_evaluate(df, supplier_id, train_weeks)
    improved_result = improved_evaluate(df, supplier_id, train_weeks)

    baseline_mae = baseline_result["mae"]
    model_mae = improved_result["mae"]

    if baseline_mae > 0:
        improvement = round((baseline_mae - model_mae) / baseline_mae * 100, 1)
    else:
        improvement = 0.0

    supplier_name = df[df["supplier_id"] == supplier_id]["supplier_name"].iloc[0]

    return {
        "supplier_id": supplier_id,
        "supplier_name": supplier_name,
        "baseline_mae": baseline_mae,
        "model_mae": model_mae,
        "improvement_pct": improvement,
    }


def full_forecast_with_comparison(df: pd.DataFrame, supplier_id: str, horizon: int = 6) -> dict:
    """
    Generate a complete forecast package for a supplier, including:
      - Improved model forecast with uncertainty bands
      - Baseline forecast for comparison
      - MAE comparison metrics

    This is the main function called by the API for the forecast endpoint.

    Args:
        df: Full payment history DataFrame.
        supplier_id: Which supplier to forecast.
        horizon: Forecast horizon in weeks.

    Returns:
        dict combining forecast, baseline, and comparison data.
    """
    from src.models.baseline import baseline_forecast

    improved = improved_forecast(df, supplier_id, horizon)
    baseline = baseline_forecast(df, supplier_id, horizon)
    comparison = compare_models(df, supplier_id)

    # Historical data for charting
    supplier_data = df[df["supplier_id"] == supplier_id].sort_values("week_number")
    historical_weeks = supplier_data["week_number"].tolist()
    historical_delays = supplier_data["payment_delay_days"].tolist()

    return {
        "supplier_id": supplier_id,
        "supplier_name": comparison["supplier_name"],
        "historical": {
            "weeks": historical_weeks,
            "delays": historical_delays,
        },
        "forecast": {
            "weeks": improved["weeks"],
            "expected": improved["expected"],
            "low": improved["low"],
            "high": improved["high"],
        },
        "baseline": {
            "weeks": baseline["weeks"],
            "forecast": baseline["forecast"],
        },
        "model_comparison": {
            "baseline_mae": comparison["baseline_mae"],
            "model_mae": comparison["model_mae"],
            "improvement_pct": comparison["improvement_pct"],
            "model_method": improved["method"],
        },
    }


if __name__ == "__main__":
    from src.data.generator import generate_payment_data
    from src.models.baseline import baseline_evaluate

    df = generate_payment_data()

    print("=" * 70)
    print("  MODEL COMPARISON: Baseline (Rolling Avg) vs Improved (Exp Smoothing)")
    print("=" * 70)
    print()
    print(f"{'Supplier':<22} {'Baseline MAE':>13} {'Model MAE':>11} {'Improvement':>12}")
    print("-" * 60)

    for sid in ["S1", "S2", "S3", "S4", "S5"]:
        result = compare_models(df, sid)
        sign = "+" if result["improvement_pct"] > 0 else ""
        print(
            f"{result['supplier_name']:<22} "
            f"{result['baseline_mae']:>10.2f}   "
            f"{result['model_mae']:>8.2f}   "
            f"{sign}{result['improvement_pct']:>8.1f}%"
        )

    print()
    print("--- Forecast for S2 (BetaLogistics — worst degradation) ---")
    fc = full_forecast_with_comparison(df, "S2")
    print(f"  Expected: {fc['forecast']['expected']}")
    print(f"  Low:      {fc['forecast']['low']}")
    print(f"  High:     {fc['forecast']['high']}")
    print(f"  Baseline: {fc['baseline']['forecast']}")
