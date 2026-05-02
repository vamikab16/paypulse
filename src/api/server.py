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

import logging
import os
from typing import Any, Dict, List, Literal, Optional

import pandas as pd
from fastapi import FastAPI, Query, Header, HTTPException, Request, UploadFile, File
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, ValidationError

logger = logging.getLogger("paypulse.api")
logging.basicConfig(level=os.environ.get("PAYPULSE_LOG_LEVEL", "INFO"))

from src.data.generator import save_data, generate_payment_data, generate_company_profile
from src.data.schemas import SUPPLIER_NAMES, CONTRACTUAL_TERMS, SUPPLIER_IDS
from src.models.forecaster import full_forecast_with_comparison
from src.models.baseline import baseline_forecast
from src.models.scenarios import run_scenario, get_available_scenarios
from src.detection.anomaly import detect_all_anomalies, detect_threshold_breach, detect_trend
from src.detection.triage import detect_triage
from src.detection.contagion import build_exposure_graph, simulate_contagion, top_systemic_nodes
from src.explainability.narrator import (
    explain_forecast,
    explain_anomaly,
    explain_triage,
    generate_executive_summary,
    generate_bank_risk_summary,
)
from src.utils.helpers import sanitize_for_json
from src.models.ml_engine import PayPulseAI
from src.models.bank_grade import run_bank_grade_benchmark, get_cached_benchmark
from src.data.portfolio import generate_portfolio
from src.api.audit import log_inference, recent_audit_records
from src.api.insights import get_sme_insights, get_all_insights, SME_DATABASE
from src.api.pdf_parser import parse_supplier_pdf


# ---------------------------------------------------------------------------
# Initialize app and load data
# ---------------------------------------------------------------------------

app = FastAPI(
    title="PayPulse API",
    description="AI Early Warning System for SME Financial Stress",
    version="1.0.0",
)

# CORS: allow-list driven by env. Wildcard only when PAYPULSE_ALLOW_ANY_ORIGIN=1
# (demo mode). In any realistic bank deployment this must be an explicit list.
_allowed_origins_env = os.environ.get("PAYPULSE_ALLOWED_ORIGINS", "").strip()
if os.environ.get("PAYPULSE_ALLOW_ANY_ORIGIN") == "1":
    _allowed_origins = ["*"]
elif _allowed_origins_env:
    _allowed_origins = [o.strip() for o in _allowed_origins_env.split(",") if o.strip()]
else:
    _allowed_origins = [
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "http://localhost:5173",
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_allowed_origins,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["Content-Type", "X-API-Key", "Authorization"],
)

# API-key guard. When PAYPULSE_API_KEY is set, guarded endpoints require a matching
# X-API-Key header. In production (PAYPULSE_ENV=production) the key is REQUIRED —
# the app refuses to start without it, closing the "forgot to set the key" footgun.
_PAYPULSE_ENV = os.environ.get("PAYPULSE_ENV", "development").strip().lower()
_EXPECTED_API_KEY = os.environ.get("PAYPULSE_API_KEY", "").strip()
_GUARDED_PREFIXES = ("/api/ai/", "/api/model/", "/api/contagion/", "/api/audit/")

if _PAYPULSE_ENV == "production" and not _EXPECTED_API_KEY:
    raise RuntimeError(
        "PAYPULSE_API_KEY must be set when PAYPULSE_ENV=production. "
        "Set a strong random secret via environment before starting the server."
    )


@app.middleware("http")
async def _api_key_guard(request: Request, call_next):
    if _EXPECTED_API_KEY and request.url.path.startswith(_GUARDED_PREFIXES):
        provided = request.headers.get("x-api-key") or request.headers.get("X-API-Key")
        if provided != _EXPECTED_API_KEY:
            return JSONResponse(
                status_code=401,
                content={"error": "missing or invalid X-API-Key"},
            )
    return await call_next(request)


# ---------------------------------------------------------------------------
# Request schemas (minimal, defensive validation at API boundary)
# ---------------------------------------------------------------------------

class ScenarioRequest(BaseModel):
    scenario_type: Literal[
        "continue_trend", "stabilize_now", "revenue_drop", "custom"
    ] = "continue_trend"
    params: Dict[str, Any] = Field(default_factory=dict)


class PaymentEntry(BaseModel):
    week: int = Field(ge=1, le=520)
    delay: float = Field(ge=0, le=3650)
    invoice: float = Field(ge=0, le=1_000_000_000)


class SupplierInput(BaseModel):
    supplier_id: str = Field(min_length=1, max_length=50)
    supplier_name: str = Field(min_length=1, max_length=200)
    contractual_terms_days: int = Field(ge=1, le=365, default=21)
    payments: List[PaymentEntry] = Field(default_factory=list)


class CustomAnalyzeRequest(BaseModel):
    suppliers: List[SupplierInput] = Field(min_length=1, max_length=100)


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
async def post_scenario(body: ScenarioRequest):
    """
    Run a what-if scenario.

    Request body validated by ScenarioRequest:
        scenario_type: continue_trend | stabilize_now | revenue_drop | custom
        params: optional dict of scenario parameters
    """
    df, _ = _ensure_data()
    try:
        result = run_scenario(df, body.scenario_type, body.params)
    except Exception:
        logger.exception("Scenario run failed: type=%s", body.scenario_type)
        raise HTTPException(status_code=500, detail="scenario_failed")
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
    """
    Return AI model training status and performance metrics.

    Includes both:
      - `in_sample` numbers (training-set accuracy / MAE) — for engineering
        diagnostics only, NEVER to be quoted as model performance.
      - `bank_grade` numbers from the entity-level walk-forward benchmark
        (src.models.bank_grade) — these are what a validator would review.
    """
    ai = _ensure_ai()
    try:
        bench = get_cached_benchmark()
        bank_grade = bench.get("aggregated", {})
        label_summary = bench.get("label_summary", {})
        portfolio_summary = bench.get("portfolio_summary", {})
    except Exception as e:  # pragma: no cover
        bank_grade = {"error": f"benchmark unavailable: {e}"}
        label_summary = {}
        portfolio_summary = {}
    return sanitize_for_json({
        "status": "ready" if ai.is_ready else "not_trained",
        "bank_grade": bank_grade,
        "bank_grade_label_summary": label_summary,
        "bank_grade_portfolio_summary": portfolio_summary,
        "in_sample": {
            "forecaster_mae_train": ai.forecaster.train_mae,
            "risk_classifier_accuracy_train": ai.risk_classifier.train_accuracy,
            "warning": "in-sample metrics are for engineering diagnostics only; do NOT quote as model performance.",
        },
        "models": {
            "forecaster": {
                "type": "GradientBoostingRegressor",
                "n_estimators": 200,
                "top_features": ai.forecaster.feature_importances,
            },
            "risk_classifier": {
                "type": "RandomForestClassifier",
                "n_estimators": 150,
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
        "models_extended": {
            "clusterer": {
                "type": "KMeans",
                "n_clusters": ai.clusterer.n_clusters if ai.clusterer.is_trained else 0,
                "silhouette_score": ai.clusterer.silhouette,
            },
            "neural_net": {
                "type": "GRU Neural Network",
                "architecture": "GRU(input=6, hidden=32) → Dense(1)",
                "training_mae": ai.neural.train_mae,
            },
            "explainability": {
                "type": "Permutation SHAP",
                "method": "Per-prediction feature contribution analysis",
            },
        },
        "total_models": 6,
    })


# ---------------------------------------------------------------------------
# Bank-grade model card + contagion graph + audit
# ---------------------------------------------------------------------------

@app.get("/api/model/card")
def get_model_card():
    """
    Validator-facing model card: algorithm, features, validation protocol,
    honest metrics, leakage controls, known limitations.
    """
    bench = get_cached_benchmark()
    return sanitize_for_json({
        "generated_at": bench.get("generated_at"),
        "model_card": bench.get("model_card", {}),
        "label_summary": bench.get("label_summary", {}),
        "portfolio_summary": bench.get("portfolio_summary", {}),
        "aggregated_metrics": bench.get("aggregated", {}),
        "holdout_metrics": (bench.get("holdout") or {}).get("metrics", {}),
        "holdout_sizes": {
            "train_size": (bench.get("holdout") or {}).get("train_size"),
            "test_size": (bench.get("holdout") or {}).get("test_size"),
        },
    })


_CONTAGION_CACHE = {}


# Real SMEs used elsewhere in the demo — we overlay these names on top of
# the first few synthetic portfolio borrowers so the Risk Spread dropdown
# shows the portfolio names the user recognises instead of "SME-0001 Ltd".
_REAL_PORTFOLIO_SMES = [
    "Meridian Engineering Ltd",
    "DeltaParts Ltd",
    "GammaSupplies Co",
    "BetaLogistics Ltd",
    "AlphaSteel Corp",
    "EpsilonServices",
]


def _ensure_contagion_graph():
    """Generate a portfolio and build the contagion graph once per process.

    The raw portfolio uses generic supplier names (e.g. "Materials Supplier 1")
    which never match bank-book companies, so the default graph has no
    borrower → borrower edges and contagion cannot propagate. In practice,
    SMEs in the same bank book routinely supply one another. We inject
    reproducible synthetic cross-firm edges here so the simulator has real
    structure to work on.
    """
    if "graph" not in _CONTAGION_CACHE:
        import random
        payments, firms = generate_portfolio(n_companies=50, n_weeks=52, seed=17)
        graph = build_exposure_graph(payments)

        # Overlay real portfolio SME names onto the first N bank borrowers,
        # and flag them so the frontend can surface them in the dropdown.
        bank_ids_sorted = sorted(graph["bank_book"])
        id_to_node = {n["id"]: n for n in graph["nodes"]}
        for i, real_name in enumerate(_REAL_PORTFOLIO_SMES):
            if i < len(bank_ids_sorted):
                node = id_to_node[bank_ids_sorted[i]]
                node["label"] = real_name
                node["is_portfolio"] = True

        # Inject inter-borrower edges so contagion has real structure to walk.
        # Each borrower supplies a handful of peers; edge weights are small
        # shares of receivables so a single failure only tips heavily-exposed
        # downstream SMEs — not the whole book.
        rng = random.Random(42)
        new_edges = []
        # Give each borrower 4–7 peer buyers (target side gets many sources,
        # so no single source dominates its incoming share).
        peer_buyers = {bid: set() for bid in bank_ids_sorted}
        for supplier in bank_ids_sorted:
            n_buyers = rng.randint(4, 7)
            buyers = rng.sample([b for b in bank_ids_sorted if b != supplier], k=min(n_buyers, len(bank_ids_sorted) - 1))
            for buyer in buyers:
                peer_buyers[supplier].add(buyer)

        for supplier, buyers in peer_buyers.items():
            for buyer in buyers:
                buyer_payables = id_to_node[buyer].get("total_payables", 1.0) or 1.0
                # weight as 2–6% of buyer's total payables
                w = buyer_payables * rng.uniform(0.02, 0.06)
                new_edges.append({"source": buyer, "target": supplier, "weight": float(round(w, 2))})
                id_to_node[supplier]["total_receivables"] = (
                    id_to_node[supplier].get("total_receivables", 0.0) + w
                )
        graph["edges"].extend(new_edges)

        # Attach per-borrower current state so the frontend's "Try a scenario"
        # simulator can show numbers that actually differ between SMEs. Without
        # this, the simulator falls back to the globally-loaded Meridian state
        # and shows the same RED→GREEN, 36d→20d for every SME pick.
        try:
            firm_profile = dict(zip(firms["company_id"], firms["latent_profile"]))
        except Exception:
            firm_profile = {}

        # Per-firm: avg payment delay over the last 8 weeks, max contractual terms.
        last_window = payments[payments["week_number"] >= payments["week_number"].max() - 7]
        per_firm = last_window.groupby("company_id").agg(
            avg_delay=("payment_delay_days", "mean"),
            max_terms=("contractual_terms_days", "max"),
            n_suppliers=("supplier_id", "nunique"),
        ).to_dict("index")

        for node in graph["nodes"]:
            if node.get("kind") != "bank_borrower":
                continue
            stats = per_firm.get(node["id"], {})
            avg_delay = float(stats.get("avg_delay") or 0.0)
            terms = float(stats.get("max_terms") or 30.0)
            n_supp = int(stats.get("n_suppliers") or 0)
            excess = avg_delay - terms
            if excess <= 0:
                risk = "GREEN"
            elif excess <= 10:
                risk = "AMBER"
            else:
                risk = "RED"
            node["current_avg_delay"] = round(avg_delay, 1)
            node["contractual_terms"] = round(terms, 0)
            node["current_risk"] = risk
            node["latent_profile"] = firm_profile.get(node["id"], "healthy")
            node["n_suppliers"] = n_supp

        _CONTAGION_CACHE["graph"] = graph
        _CONTAGION_CACHE["firms"] = firms
    return _CONTAGION_CACHE["graph"]


@app.get("/api/contagion/graph")
def get_contagion_graph(limit: int = 200):
    """
    Return the exposure graph as {nodes, edges}. Capped at `limit` edges
    (ranked by weight) to keep the payload renderable in the browser.
    """
    graph = _ensure_contagion_graph()
    edges = sorted(graph["edges"], key=lambda e: -e["weight"])[:max(1, limit)]
    kept_ids = set()
    for e in edges:
        kept_ids.add(e["source"])
        kept_ids.add(e["target"])
    nodes = [n for n in graph["nodes"] if n["id"] in kept_ids]
    return sanitize_for_json({
        "nodes": nodes,
        "edges": edges,
        "bank_book": sorted(graph["bank_book"]),
        "stats": {
            "total_nodes": len(graph["nodes"]),
            "total_edges": len(graph["edges"]),
            "rendered_nodes": len(nodes),
            "rendered_edges": len(edges),
        },
    })


@app.get("/api/contagion/systemic")
def get_contagion_systemic(k: int = 10):
    """Return the top-k systemically important bank-book SMEs."""
    graph = _ensure_contagion_graph()
    return sanitize_for_json({"top_systemic": top_systemic_nodes(graph, k=k)})


@app.post("/api/contagion/simulate")
async def post_contagion_simulate(body: dict):
    """
    Simulate contagion from a set of seed nodes.

    Body: {"seeds": ["C0003", ...], "steps": 8, "threshold": 0.25, "decay": 0.85}
    """
    graph = _ensure_contagion_graph()
    seeds = body.get("seeds") or []
    if not seeds:
        return JSONResponse(status_code=400, content={"error": "seeds must be a non-empty list of node ids"})
    result = simulate_contagion(
        graph,
        seeds,
        steps=int(body.get("steps", 8)),
        stress_threshold=float(body.get("threshold", 0.25)),
        decay=float(body.get("decay", 0.85)),
    )
    log_inference(
        endpoint="/api/contagion/simulate",
        model_id="paypulse-contagion-v1",
        subject_id=",".join(sorted(seeds)),
        features={"seeds": list(seeds), "steps": body.get("steps", 8)},
        output={"n_impacted": result["summary"]["n_bank_book_impacted"],
                "exposure_at_risk": result["summary"]["total_exposure_at_risk"]},
    )
    return sanitize_for_json(result)


@app.get("/api/audit/recent")
def get_audit_recent(limit: int = 50):
    """Return the last `limit` inference audit records (today's log file)."""
    return sanitize_for_json({"records": recent_audit_records(limit=limit)})


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
    log_inference(
        endpoint=f"/api/ai/risk/{supplier_id}",
        model_id="paypulse-risk-clf-v2",
        subject_id=supplier_id,
        features={"supplier_id": supplier_id},
        output={
            "predicted_risk": risk.get("predicted_risk"),
            "confidence": risk.get("confidence"),
        },
    )
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


@app.get("/api/ai/neural/{supplier_id}")
def get_ai_neural(supplier_id: str, horizon: int = 6):
    """Return GRU neural network forecast."""
    if supplier_id not in SUPPLIER_IDS:
        return JSONResponse(status_code=404, content={"error": f"Unknown supplier: {supplier_id}"})
    ai = _ensure_ai()
    return sanitize_for_json(ai.neural_forecast(supplier_id, horizon))


@app.get("/api/ai/explain/{supplier_id}")
def get_ai_explain(supplier_id: str):
    """Return SHAP-style feature explanations for a supplier."""
    if supplier_id not in SUPPLIER_IDS:
        return JSONResponse(status_code=404, content={"error": f"Unknown supplier: {supplier_id}"})
    ai = _ensure_ai()
    return sanitize_for_json(ai.explain(supplier_id))


@app.get("/api/ai/clusters")
def get_ai_clusters():
    """Return K-Means supplier clustering results."""
    ai = _ensure_ai()
    return sanitize_for_json(ai.cluster_suppliers())


@app.get("/api/ai/compare/{supplier_id}")
def get_ai_compare(supplier_id: str):
    """Return model comparison (all models head-to-head)."""
    if supplier_id not in SUPPLIER_IDS:
        return JSONResponse(status_code=404, content={"error": f"Unknown supplier: {supplier_id}"})
    ai = _ensure_ai()
    return sanitize_for_json(ai.compare_models(supplier_id))


@app.get("/api/ai/simulate")
def get_ai_simulate(weeks: int = 1):
    """Simulate new weeks of data for real-time demo."""
    ai = _ensure_ai()
    return sanitize_for_json(ai.simulate_live(weeks))


# ---------------------------------------------------------------------------
# Behavioural Insights Endpoints (Groq LLM)
# ---------------------------------------------------------------------------

@app.get("/api/insights/all")
async def get_insights_all():
    """Return AI-generated behavioural insights for all SMEs."""
    results = await get_all_insights()
    return sanitize_for_json({"insights": results})


@app.get("/api/insights/{sme_id}")
async def get_insights(sme_id: str, viewer: str = "sme"):
    """Return AI-generated behavioural insights for a single SME.

    viewer: 'sme' (default) → business-facing behavioural guidance
            'bank'          → RM-facing action recommendations

    Uses Groq LLM (Llama 3.3 70B) when GROQ_API_KEY is set;
    falls back to heuristic generation otherwise.
    Results are cached per (SME, viewer) pair for the server lifetime.
    """
    if sme_id not in SME_DATABASE:
        return JSONResponse(
            status_code=404,
            content={"error": f"Unknown SME: {sme_id}"},
        )
    viewer_context = "bank" if viewer == "bank" else "sme"
    result = await get_sme_insights(sme_id, viewer=viewer_context)
    return sanitize_for_json(result)


# ---------------------------------------------------------------------------
# RM → SME Support Message Relay (in-memory; per server lifetime)
# ---------------------------------------------------------------------------

from datetime import datetime as _support_dt

_RM_MESSAGES: Dict[str, Dict[str, Any]] = {}


class RMSupportMessage(BaseModel):
    sme_id: str
    title: Optional[str] = None
    message: str
    urgency: Optional[str] = "moderate"
    rm_name: Optional[str] = "NatWest Relationship Manager"


@app.post("/api/support/message")
async def post_support_message(body: RMSupportMessage):
    """Store an RM-authored support message for an SME. Overwrites any prior message."""
    if body.sme_id not in SME_DATABASE:
        return JSONResponse(status_code=404, content={"error": f"Unknown SME: {body.sme_id}"})
    record = {
        "sme_id": body.sme_id,
        "title": (body.title or "Message from your NatWest RM").strip(),
        "message": body.message.strip(),
        "urgency": (body.urgency or "moderate"),
        "rm_name": body.rm_name,
        "sent_at": _support_dt.utcnow().isoformat() + "Z",
    }
    _RM_MESSAGES[body.sme_id] = record
    return record


@app.get("/api/support/message/{sme_id}")
async def get_support_message(sme_id: str):
    """Return the latest RM message for this SME, or 404 if none."""
    msg = _RM_MESSAGES.get(sme_id)
    if not msg:
        return JSONResponse(status_code=404, content={"error": "no_message"})
    return msg


@app.delete("/api/support/message/{sme_id}")
async def delete_support_message(sme_id: str):
    _RM_MESSAGES.pop(sme_id, None)
    return {"ok": True}


# ---------------------------------------------------------------------------
# Custom SME Registration — lets a newly-onboarded SME be visible to the
# Groq insights endpoint and the RM support-message endpoint.
# ---------------------------------------------------------------------------

class _RegisterSupplier(BaseModel):
    supplier_id: Optional[str] = None
    supplier_name: Optional[str] = None
    current_delay: Optional[float] = 0
    contractual_terms: Optional[int] = 21
    severity: Optional[str] = "normal"
    trend: Optional[str] = "stable"
    trend_slope: Optional[float] = 0.0


class RegisterSMEPayload(BaseModel):
    sme_id: str
    name: str
    suppliers: List[_RegisterSupplier]


@app.post("/api/sme/register")
async def post_register_sme(body: RegisterSMEPayload):
    """Register a newly onboarded SME so Groq insights and RM messaging work for it."""
    from src.api.insights import _INSIGHTS_CACHE  # local import keeps module load order tidy

    converted = []
    for i, s in enumerate(body.suppliers, 1):
        converted.append({
            "id": s.supplier_id or f"S{i}",
            "name": s.supplier_name or f"Supplier {i}",
            "delay": float(s.current_delay or 0),
            "terms": int(s.contractual_terms or 21),
            "severity": s.severity or "normal",
            "trend": s.trend or "stable",
            "slope": float(s.trend_slope or 0.0),
        })

    SME_DATABASE[body.sme_id] = {
        "name": body.name,
        "suppliers": converted,
    }

    # Drop any stale cache entries so the next insights call regenerates with the new data
    for k in list(_INSIGHTS_CACHE.keys()):
        if k.startswith(f"{body.sme_id}:"):
            _INSIGHTS_CACHE.pop(k, None)

    return {"ok": True, "sme_id": body.sme_id, "supplier_count": len(converted)}


@app.post("/api/custom/analyze")
async def post_custom_analyze(body: CustomAnalyzeRequest):
    """
    Analyze user-provided custom supplier payment data.

    Request body validated by CustomAnalyzeRequest: see schema definitions above.
    """
    import numpy as np

    suppliers_input = body.suppliers
    if not suppliers_input:
        return JSONResponse(status_code=400, content={"error": "no_supplier_data"})

    # Build a DataFrame from the custom data
    records = []
    for supplier in suppliers_input:
        sid = supplier.supplier_id
        sname = supplier.supplier_name
        terms = supplier.contractual_terms_days
        payments = supplier.payments

        delays_so_far = []
        for payment in sorted(payments, key=lambda p: p.week):
            week = payment.week
            delay = payment.delay
            invoice = payment.invoice
            delays_so_far.append(delay)

            # Rolling 8-week average
            window = delays_so_far[-8:]
            hist_avg = round(sum(window) / len(window), 1)

            # Payment status
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
                "date": f"2024-01-{min(week, 28):02d}",
                "supplier_id": sid,
                "supplier_name": sname,
                "invoice_amount": invoice,
                "payment_delay_days": delay,
                "historical_average_delay": hist_avg,
                "contractual_terms_days": terms,
                "payment_status": status,
            })

    if len(records) < 4:
        return JSONResponse(
            status_code=400,
            content={
                "error": "insufficient_data",
                "message": "Provide at least 4 payment entries.",
            },
        )

    custom_df = pd.DataFrame(records)

    # Try to train a fresh AI engine on this custom data
    try:
        custom_ai = PayPulseAI()
        custom_ai.train(custom_df)

        # Run analysis for each supplier
        custom_supplier_ids = custom_df["supplier_id"].unique().tolist()
        analyses = {}
        for sid in custom_supplier_ids:
            try:
                analyses[sid] = custom_ai.full_analysis(sid, horizon=6)
            except Exception:
                analyses[sid] = {"error": f"Could not analyze {sid}"}

        result = {
            "status": "success",
            "models_trained": custom_ai.is_ready,
            "supplier_analyses": analyses,
            "training_samples": len(custom_df),
            "suppliers_analyzed": len(custom_supplier_ids),
        }

        if custom_ai.is_ready:
            result["model_metrics"] = {
                "forecaster_mae": custom_ai.forecaster.train_mae,
                "classifier_accuracy": custom_ai.risk_classifier.train_accuracy,
            }

        return sanitize_for_json(result)

    except Exception:
        # Internal details go to logs; client sees a stable, non-leaky error code.
        logger.exception("Custom analyze failed")
        return sanitize_for_json({
            "status": "fallback",
            "error": "ml_training_failed",
            "message": "ML training failed, returning basic analysis",
            "supplier_count": custom_df["supplier_id"].nunique(),
            "total_records": len(custom_df),
        })


# ---------------------------------------------------------------------------
# PDF supplier-report scanner
# ---------------------------------------------------------------------------

# Cap to prevent abusive uploads. Real supplier ageing PDFs are rarely > 5MB.
_MAX_PDF_BYTES = 10 * 1024 * 1024  # 10 MB


@app.post("/api/parse-pdf")
async def post_parse_pdf(file: UploadFile = File(...)):
    """
    Parse a supplier-payment / AR-ageing PDF and return structured rows the
    "My Data" UI can drop straight into its localStorage state.

    Response shape:
        {
          "suppliers":  [{supplier_id, supplier_name, contractual_terms, avg_invoice}, ...],
          "payments":   [{supplier_id, supplier_name, week, delay, invoice}, ...],
          "diagnostics": {strategy, rows_seen, rows_kept, warnings: [str, ...]}
        }

    The endpoint always returns 200 with a structured payload — even when
    parsing finds nothing — so the frontend can show a friendly fallback
    instead of a generic HTTP error.
    """
    # Defensive content-type check. Some browsers send application/octet-stream
    # for drag-dropped files, so we also fall back to the filename extension.
    ctype = (file.content_type or "").lower()
    fname = (file.filename or "").lower()
    if not (ctype == "application/pdf" or fname.endswith(".pdf")):
        return JSONResponse(
            status_code=400,
            content={"error": "expected_pdf",
                     "message": "Please upload a PDF file."},
        )

    raw = await file.read()
    if not raw:
        return JSONResponse(
            status_code=400,
            content={"error": "empty_file", "message": "The uploaded file is empty."},
        )
    if len(raw) > _MAX_PDF_BYTES:
        return JSONResponse(
            status_code=413,
            content={"error": "file_too_large",
                     "message": f"PDF exceeds {_MAX_PDF_BYTES // (1024 * 1024)} MB cap."},
        )

    try:
        result = parse_supplier_pdf(raw)
    except Exception:
        logger.exception("PDF parsing crashed")
        return JSONResponse(
            status_code=500,
            content={"error": "parse_failed",
                     "message": "PDF parser encountered an unexpected error."},
        )

    log_inference(
        endpoint="/api/parse-pdf",
        model_id="paypulse-pdf-parser-v1",
        subject_id=fname or "uploaded.pdf",
        features={"size_bytes": len(raw), "filename": fname},
        output={
            "strategy": result["diagnostics"]["strategy"],
            "suppliers": len(result["suppliers"]),
            "payments": len(result["payments"]),
        },
    )
    return sanitize_for_json(result)


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
