"""
FastAPI backend for PayPulse.

Serves all data, forecasts, alerts, and scenario results as JSON endpoints.
Also serves the static frontend files.

Endpoints:
    GET  /api/company          — Company profile + executive summary
    GET  /api/suppliers        — All suppliers with current status
    GET  /api/forecast/{id}    — Forecast for a specific supplier
    GET  /api/alerts           — All active alerts (threshold + trend + triage)
    GET  /api/triage           — Triage detection results + explanation
    POST /api/scenario         — Run a what-if scenario
    GET  /api/health-timeline  — Weekly risk scores for timeline chart

    --- AI / ML Endpoints ---
    GET  /api/ai/forecast/{id}   — ML-powered forecast (Gradient Boosting)
    GET  /api/ai/risk/{id}       — ML risk classification (Random Forest)
    GET  /api/ai/anomalies/{id}  — ML anomaly detection (Isolation Forest)
    GET  /api/ai/analysis/{id}   — Full AI analysis (all 3 models combined)
    GET  /api/ai/dashboard       — AI dashboard overview for all suppliers
    GET  /api/ai/status          — Model training status and metrics
"""

import os
import pandas as pd
from fastapi import FastAPI, Query
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from src.data.generator import save_data, generate_payment_data, generate_company_profile
from src.data.schemas import SUPPLIER_NAMES, CONTRACTUAL_TERMS, SUPPLIER_IDS
from src.models.forecaster import full_forecast_with_comparison
from src.models.baseline import baseline_forecast
from src.models.scenarios import run_scenario, get_available_scenarios
from src.detection.anomaly import detect_all_anomalies, detect_threshold_breach, detect_trend
from src.detection.triage import detect_triage
from src.explainability.narrator import (
    explain_forecast,
    explain_anomaly,
    explain_triage,
    generate_executive_summary,
    generate_bank_risk_summary,
)
from src.utils.helpers import sanitize_for_json
from src.models.ml_engine import PayPulseAI


# ---------------------------------------------------------------------------
# Initialize app and load data
# ---------------------------------------------------------------------------

app = FastAPI(
    title="PayPulse API",
    description="AI Early Warning System for SME Financial Stress",
    version="1.0.0",
)

# Allow CORS for local development
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global data store — loaded once at startup
_data = {}

# Global AI engine — trained once at startup
_ai_engine = PayPulseAI()


def _ensure_data():
    """Load or generate data if not already in memory."""
    if "df" not in _data:
        data_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "data")
        csv_path = os.path.join(data_dir, "payment_history.csv")

        if os.path.exists(csv_path):
            _data["df"] = pd.read_csv(csv_path)
            import json
            with open(os.path.join(data_dir, "company_profile.json")) as f:
                _data["profile"] = json.load(f)
        else:
            df, profile = save_data(data_dir)
            _data["df"] = df
            _data["profile"] = profile

    return _data["df"], _data["profile"]


def _ensure_ai():
    """Train AI models if not already ready."""
    if not _ai_engine.is_ready:
        df, _ = _ensure_data()
        _ai_engine.train(df)
    return _ai_engine


# ---------------------------------------------------------------------------
# API Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/company")
def get_company():
    """Return company profile with executive summary narrative."""
    df, profile = _ensure_data()

    # Generate all the context needed for the executive summary
    all_forecasts = {}
    for sid in SUPPLIER_IDS:
        all_forecasts[sid] = full_forecast_with_comparison(df, sid)

    all_alerts = detect_all_anomalies(df)
    triage_data = detect_triage(df)

    executive_summary = generate_executive_summary(all_alerts, all_forecasts, triage_data)
    triage_explanation = explain_triage(triage_data)

    # Determine overall risk level
    severity = triage_data.get("triage_severity", "none")
    if severity == "severe":
        risk_level = "RED"
    elif severity in ("active", "emerging"):
        risk_level = "AMBER"
    else:
        risk_level = "GREEN"

    return sanitize_for_json({
        "profile": profile,
        "risk_level": risk_level,
        "executive_summary": executive_summary,
        "triage_explanation": triage_explanation,
        "triage_severity": severity,
    })


@app.get("/api/suppliers")
def get_suppliers():
    """Return all suppliers with current status, trends, and sparkline data."""
    df, _ = _ensure_data()
    suppliers = []

    for sid in SUPPLIER_IDS:
        supplier_data = df[df["supplier_id"] == sid].sort_values("week_number")

        # Current state
        latest = supplier_data.iloc[-1]
        current_delay = float(latest["payment_delay_days"])
        terms = CONTRACTUAL_TERMS[sid]

        # Threshold status
        threshold = detect_threshold_breach(df, sid)
        trend = detect_trend(df, sid)

        # Sparkline data (last 12 weeks)
        sparkline = supplier_data.tail(12)["payment_delay_days"].tolist()

        # Invoice total
        total_invoiced = float(supplier_data["invoice_amount"].sum())

        suppliers.append({
            "supplier_id": sid,
            "supplier_name": SUPPLIER_NAMES[sid],
            "current_delay": round(current_delay, 1),
            "contractual_terms": terms,
            "severity": threshold["severity"],
            "excess_days": threshold["excess_days"],
            "trend": trend["trend"],
            "trend_slope": trend["slope_per_week"],
            "sparkline": [round(v, 1) for v in sparkline],
            "total_invoiced": round(total_invoiced, 0),
            "payment_status": str(latest["payment_status"]),
        })

    return sanitize_for_json({"suppliers": suppliers})


@app.get("/api/forecast/{supplier_id}")
def get_forecast(supplier_id: str):
    """Return detailed forecast for a specific supplier with explanation."""
    df, _ = _ensure_data()

    if supplier_id not in SUPPLIER_IDS:
        return JSONResponse(
            status_code=404,
            content={"error": f"Unknown supplier: {supplier_id}"},
        )

    forecast_data = full_forecast_with_comparison(df, supplier_id)
    explanation = explain_forecast(supplier_id, forecast_data)

    forecast_data["explanation"] = explanation
    return sanitize_for_json(forecast_data)


@app.get("/api/alerts")
def get_alerts():
    """Return all active alerts with explanations."""
    df, _ = _ensure_data()

    anomaly_results = detect_all_anomalies(df)
    triage_data = detect_triage(df)

    # Add explanations to each alert
    enriched_threshold = []
    for i, alert in enumerate(anomaly_results["threshold_alerts"]):
        trend = anomaly_results["trend_alerts"][i]
        explanation = explain_anomaly(alert, trend)
        alert["explanation"] = explanation
        enriched_threshold.append(alert)

    # Enrich timeline events with context
    enriched_timeline = []
    for event in anomaly_results["timeline"]:
        enriched_timeline.append(event)

    return sanitize_for_json({
        "threshold_alerts": enriched_threshold,
        "trend_alerts": anomaly_results["trend_alerts"],
        "timeline": enriched_timeline,
        "triage": {
            "detected": triage_data["triage_detected"],
            "severity": triage_data.get("triage_severity", "none"),
            "explanation": explain_triage(triage_data),
        },
        "summary": anomaly_results["summary"],
    })


@app.get("/api/triage")
def get_triage():
    """Return detailed triage detection results."""
    df, _ = _ensure_data()

    triage_data = detect_triage(df)
    explanation = explain_triage(triage_data)

    triage_data["explanation"] = explanation
    return sanitize_for_json(triage_data)


@app.post("/api/scenario")
async def post_scenario(body: dict):
    """
    Run a what-if scenario.

    Request body:
        {
            "scenario_type": "continue_trend" | "stabilize_now" | "revenue_drop" | "custom",
            "params": { ... }  // optional parameters
        }
    """
    df, _ = _ensure_data()

    scenario_type = body.get("scenario_type", "continue_trend")
    params = body.get("params", {})

    result = run_scenario(df, scenario_type, params)
    return sanitize_for_json(result)


@app.get("/api/scenarios")
def get_scenarios():
    """Return list of available scenario types."""
    return {"scenarios": get_available_scenarios()}


@app.get("/api/health-timeline")
def get_health_timeline():
    """Return weekly health scores for the timeline chart."""
    df, _ = _ensure_data()
    triage_data = detect_triage(df)

    weekly_scores = triage_data.get("weekly_scores", [])

    # Also compute per-supplier weekly delays for the chart
    supplier_weekly = {}
    for sid in SUPPLIER_IDS:
        supplier_data = df[df["supplier_id"] == sid].sort_values("week_number")
        supplier_weekly[sid] = {
            "weeks": supplier_data["week_number"].tolist(),
            "delays": [round(v, 1) for v in supplier_data["payment_delay_days"].tolist()],
            "name": SUPPLIER_NAMES[sid],
            "terms": CONTRACTUAL_TERMS[sid],
        }

    return sanitize_for_json({
        "triage_weekly": weekly_scores,
        "supplier_weekly": supplier_weekly,
    })


@app.get("/api/triage-score")
def get_triage_score():
    """Return computed triage score (0-100) with category and explanation."""
    df, _ = _ensure_data()

    triage_data = detect_triage(df)
    suppliers_info = []
    for sid in SUPPLIER_IDS:
        supplier_data = df[df["supplier_id"] == sid].sort_values("week_number")
        latest = supplier_data.iloc[-1]
        suppliers_info.append({
            "supplier_id": sid,
            "current_delay": float(latest["payment_delay_days"]),
            "contractual_terms": CONTRACTUAL_TERMS[sid],
        })

    # Component 1: Delay variance (0-40)
    import math
    delays = [s["current_delay"] for s in suppliers_info]
    mean_delay = sum(delays) / len(delays)
    variance = sum((d - mean_delay) ** 2 for d in delays) / len(delays)
    std_dev = math.sqrt(variance)
    variance_score = min(40, (std_dev / max(mean_delay, 1)) * 60)

    # Component 2: Spread deviation from baseline (0-35)
    spread_increase = triage_data.get("spread_increase_pct", 0)
    spread_score = min(35, (spread_increase / 800) * 35)

    # Component 3: Stretched vs favored ratio (0-25)
    stretched = len(triage_data.get("stretched_suppliers", []))
    favored = len(triage_data.get("favored_suppliers", []))
    total = len(SUPPLIER_IDS)
    ratio_score = min(25, (stretched / total) * 40) if total > 0 else 0

    # Bank payment signal bonus
    bank_bonus = 5 if (triage_data.get("triage_detected") and favored > 0 and stretched > 0) else 0

    raw_score = variance_score + spread_score + ratio_score + bank_bonus
    score = min(100, max(0, round(raw_score)))

    if score >= 70:
        category = "HIGH"
        explanation = "Business is prioritizing bank payments over suppliers — early distress signal detected."
    elif score >= 30:
        category = "MEDIUM"
        explanation = "Some selective payment behavior detected — monitor supplier payment patterns closely."
    else:
        category = "LOW"
        explanation = "Payment behavior appears consistent across suppliers — no significant triage signal."

    return sanitize_for_json({
        "score": score,
        "category": category,
        "explanation": explanation,
        "components": {
            "variance_score": round(variance_score, 1),
            "spread_score": round(spread_score, 1),
            "ratio_score": round(ratio_score, 1),
            "bank_bonus": bank_bonus,
        },
    })


@app.get("/api/bank-risk")
def get_bank_risk():
    """Return NatWest-focused bank risk assessment.

    Aggregates all detection signals into a single structured response
    designed for bank risk teams — includes default risk level,
    intervention window, priority accounts, and recommended actions.
    """
    df, _ = _ensure_data()

    # Gather all the intelligence
    all_forecasts = {}
    for sid in SUPPLIER_IDS:
        all_forecasts[sid] = full_forecast_with_comparison(df, sid)

    all_alerts = detect_all_anomalies(df)
    triage_data = detect_triage(df)

    # Generate bank risk summary
    bank_risk = generate_bank_risk_summary(all_alerts, all_forecasts, triage_data)

    return sanitize_for_json(bank_risk)


# ---------------------------------------------------------------------------
# AI / ML Endpoints
# ---------------------------------------------------------------------------

@app.get("/api/ai/status")
def get_ai_status():
    """Return AI model training status and performance metrics."""
    ai = _ensure_ai()
    return sanitize_for_json({
        "status": "ready" if ai.is_ready else "not_trained",
        "models": {
            "forecaster": {
                "type": "GradientBoostingRegressor",
                "n_estimators": 200,
                "training_mae": ai.forecaster.train_mae,
                "top_features": ai.forecaster.feature_importances,
            },
            "risk_classifier": {
                "type": "RandomForestClassifier",
                "n_estimators": 150,
                "training_accuracy": ai.risk_classifier.train_accuracy,
                "top_features": ai.risk_classifier.feature_importances,
            },
            "anomaly_detector": {
                "type": "IsolationForest",
                "n_estimators": 200,
                "contamination": 0.1,
            },
        },
        "features_engineered": 23,
        "training_samples": len(ai.feature_df) if ai.feature_df is not None else 0,
    })


@app.get("/api/ai/forecast/{supplier_id}")
def get_ai_forecast(supplier_id: str, horizon: int = 6):
    """Return ML-powered forecast for a specific supplier."""
    if supplier_id not in SUPPLIER_IDS:
        return JSONResponse(status_code=404, content={"error": f"Unknown supplier: {supplier_id}"})

    ai = _ensure_ai()
    forecast = ai.forecast(supplier_id, horizon)
    return sanitize_for_json(forecast)


@app.get("/api/ai/risk/{supplier_id}")
def get_ai_risk(supplier_id: str):
    """Return ML risk classification for a specific supplier."""
    if supplier_id not in SUPPLIER_IDS:
        return JSONResponse(status_code=404, content={"error": f"Unknown supplier: {supplier_id}"})

    ai = _ensure_ai()
    risk = ai.classify_risk(supplier_id)
    return sanitize_for_json(risk)


@app.get("/api/ai/anomalies/{supplier_id}")
def get_ai_anomalies(supplier_id: str):
    """Return ML anomaly detection for a specific supplier."""
    if supplier_id not in SUPPLIER_IDS:
        return JSONResponse(status_code=404, content={"error": f"Unknown supplier: {supplier_id}"})

    ai = _ensure_ai()
    anomalies = ai.detect_anomalies(supplier_id)
    return sanitize_for_json(anomalies)


@app.get("/api/ai/analysis/{supplier_id}")
def get_ai_analysis(supplier_id: str, horizon: int = 6):
    """Return complete AI analysis for a supplier (forecast + risk + anomalies)."""
    if supplier_id not in SUPPLIER_IDS:
        return JSONResponse(status_code=404, content={"error": f"Unknown supplier: {supplier_id}"})

    ai = _ensure_ai()
    analysis = ai.full_analysis(supplier_id, horizon)
    return sanitize_for_json(analysis)


@app.get("/api/ai/dashboard")
def get_ai_dashboard():
    """Return AI dashboard overview for all suppliers."""
    ai = _ensure_ai()
    dashboard = ai.full_dashboard()
    return sanitize_for_json(dashboard)


# ---------------------------------------------------------------------------
# Frontend static files — mounted LAST so API routes take priority
# ---------------------------------------------------------------------------

def mount_frontend(app_instance: FastAPI):
    """Mount the frontend directory as static files."""
    frontend_dir = os.path.join(
        os.path.dirname(os.path.abspath(__file__)), "..", "..", "public"
    )
    frontend_dir = os.path.normpath(frontend_dir)

    if os.path.isdir(frontend_dir):
        app_instance.mount("/", StaticFiles(directory=frontend_dir, html=True), name="frontend")


# Only mount frontend when running as a server (not during tests)
mount_frontend(app)
