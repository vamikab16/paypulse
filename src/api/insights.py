"""
AI Behavioural Insights for SME Dashboards.

Uses Groq's free-tier LLM (Llama 3.3 70B) to generate high-level,
non-prescriptive financial behaviour guidance for each SME.

Features:
    - Structured prompt construction from payment/triage data
    - Groq API integration via httpx (no heavy SDK)
    - In-memory caching (one call per SME per server lifetime)
    - Graceful heuristic fallback when Groq is unreachable
"""

from __future__ import annotations

import json
import logging
import os
from typing import Any, Dict, List, Optional

logger = logging.getLogger("paypulse.insights")

# In-memory cache: sme_id → insights dict
_INSIGHTS_CACHE: Dict[str, Dict[str, Any]] = {}

# ── SME data (mirrors the frontend SME_DATA) ──
# This is the canonical server-side copy so we don't depend on the browser.
SME_DATABASE: Dict[str, Dict[str, Any]] = {
    "meridian": {
        "name": "Meridian Engineering Ltd",
        "suppliers": [
            {"id": "S1", "name": "BetaLogistics Ltd", "delay": 62, "terms": 30, "severity": "critical", "trend": "accelerating", "slope": 3.1},
            {"id": "S2", "name": "GammaSupplies Co", "delay": 40, "terms": 21, "severity": "critical", "trend": "drifting", "slope": 1.4},
            {"id": "S3", "name": "DeltaParts Inc", "delay": 47, "terms": 30, "severity": "warning", "trend": "drifting", "slope": 1.1},
            {"id": "S4", "name": "AlphaSteel Corp", "delay": 15, "terms": 21, "severity": "normal", "trend": "stable", "slope": 0.0},
            {"id": "S5", "name": "EpsilonServices", "delay": 14, "terms": 14, "severity": "normal", "trend": "stable", "slope": 0.1},
        ],
    },
    "deltaparts": {
        "name": "DeltaParts Ltd",
        "suppliers": [
            {"id": "S1", "name": "SteelWorks Ltd", "delay": 47, "terms": 21, "severity": "critical", "trend": "accelerating", "slope": 2.6},
            {"id": "S2", "name": "IronHub Co", "delay": 32, "terms": 14, "severity": "warning", "trend": "drifting", "slope": 1.5},
            {"id": "S3", "name": "FastenTech", "delay": 18, "terms": 21, "severity": "normal", "trend": "stable", "slope": 0.0},
        ],
    },
    "gammasupplies": {
        "name": "GammaSupplies Co",
        "suppliers": [
            {"id": "S1", "name": "QuickTransport", "delay": 40, "terms": 21, "severity": "warning", "trend": "drifting", "slope": 1.8},
            {"id": "S2", "name": "SupplyChainX", "delay": 28, "terms": 14, "severity": "warning", "trend": "drifting", "slope": 1.2},
            {"id": "S3", "name": "PackRight Inc", "delay": 12, "terms": 14, "severity": "normal", "trend": "stable", "slope": 0.0},
        ],
    },
    "betalogistics": {
        "name": "BetaLogistics Ltd",
        "suppliers": [
            {"id": "S1", "name": "FuelCorp", "delay": 30, "terms": 14, "severity": "warning", "trend": "drifting", "slope": 1.4},
            {"id": "S2", "name": "TyrePlus", "delay": 18, "terms": 21, "severity": "normal", "trend": "stable", "slope": 0.0},
            {"id": "S3", "name": "RouteMaster", "delay": 14, "terms": 14, "severity": "normal", "trend": "stable", "slope": 0.0},
        ],
    },
    "alphasteel": {
        "name": "AlphaSteel Corp",
        "suppliers": [
            {"id": "S1", "name": "RawMaterials Ltd", "delay": 12, "terms": 14, "severity": "normal", "trend": "stable", "slope": 0.0},
            {"id": "S2", "name": "MetalWorks Co", "delay": 8, "terms": 14, "severity": "normal", "trend": "stable", "slope": 0.0},
        ],
    },
    "epsilonservices": {
        "name": "EpsilonServices",
        "suppliers": [
            {"id": "S1", "name": "CloudInfra Ltd", "delay": 10, "terms": 14, "severity": "normal", "trend": "stable", "slope": 0.0},
            {"id": "S2", "name": "TechSupport Co", "delay": 7, "terms": 7, "severity": "normal", "trend": "stable", "slope": 0.0},
        ],
    },
}


# ---------------------------------------------------------------------------
# Prompt construction
# ---------------------------------------------------------------------------

_SYSTEM_PROMPT = """You are a financial behaviour insights assistant for a bank supporting SMEs.

Your role is to analyse supplier payment patterns and generate high-level, non-prescriptive guidance to help stabilise cash flow behaviour.

IMPORTANT RULES:
* Do NOT provide financial advice or exact instructions
* Do NOT suggest specific payment amounts or exact actions
* Use neutral, suggestive language such as "consider", "may help", "could improve"
* Focus only on behavioural patterns, not decisions
* Keep output concise, clear, and business-friendly
* Ensure the tone is supportive and non-judgmental

OUTPUT FORMAT (STRICT JSON ONLY — no markdown, no explanation, just the JSON object):
{
  "summary": "One-line explanation of current payment behaviour and risk",
  "key_issues": ["Issue 1", "Issue 2", "Issue 3"],
  "suggestions": ["General behavioural suggestion 1", "General behavioural suggestion 2", "General behavioural suggestion 3"],
  "priority_focus": ["Type of supplier or behaviour to prioritise", "Area that needs stabilisation"],
  "expected_impact": "How improving behaviour may reduce risk level over time"
}"""


def _compute_sme_metrics(sme: Dict[str, Any]) -> Dict[str, Any]:
    """Derive aggregate metrics from raw supplier data for prompt context."""
    suppliers = sme["suppliers"]
    delays = [s["delay"] for s in suppliers]
    terms = [s["terms"] for s in suppliers]
    avg_delay = sum(delays) / len(delays) if delays else 0
    max_delay = max(delays) if delays else 0
    min_delay = min(delays) if delays else 0
    spread = max_delay - min_delay

    critical_count = sum(1 for s in suppliers if s["severity"] == "critical")
    warning_count = sum(1 for s in suppliers if s["severity"] == "warning")
    accelerating_count = sum(1 for s in suppliers if s["trend"] == "accelerating")
    drifting_count = sum(1 for s in suppliers if s["trend"] == "drifting")

    # Triage detection: >=2 suppliers delayed >30d AND >=1 on time (<=10d)
    delayed_suppliers = [s for s in suppliers if s["delay"] > 30]
    on_time_suppliers = [s for s in suppliers if s["delay"] <= 10]
    triage_detected = len(delayed_suppliers) >= 2 and len(on_time_suppliers) >= 1

    # Risk level
    if avg_delay > 40:
        risk_level = "HIGH"
    elif avg_delay > 20:
        risk_level = "MEDIUM"
    else:
        risk_level = "LOW"

    return {
        "risk_level": risk_level,
        "avg_delay": round(avg_delay, 1),
        "max_delay": max_delay,
        "min_delay": min_delay,
        "spread": spread,
        "critical_count": critical_count,
        "warning_count": warning_count,
        "accelerating_count": accelerating_count,
        "drifting_count": drifting_count,
        "triage_detected": triage_detected,
        "total_suppliers": len(suppliers),
        "delayed_suppliers": [s["name"] for s in delayed_suppliers],
        "on_time_suppliers": [s["name"] for s in on_time_suppliers],
    }


def _build_user_prompt(sme_id: str, sme: Dict[str, Any]) -> str:
    """Build the user message with all the SME data for the LLM."""
    metrics = _compute_sme_metrics(sme)
    supplier_lines = []
    for s in sme["suppliers"]:
        excess = s["delay"] - s["terms"]
        supplier_lines.append(
            f"  - {s['name']}: delay={s['delay']}d, terms={s['terms']}d, "
            f"excess={excess:+d}d, severity={s['severity']}, "
            f"trend={s['trend']}, slope={s['slope']:+.1f}d/week"
        )

    return f"""Analyse the following SME and produce the JSON output.

SME: {sme['name']} (ID: {sme_id})
Current Risk Level: {metrics['risk_level']}

SUPPLIER-LEVEL DATA:
{chr(10).join(supplier_lines)}

AGGREGATE INDICATORS:
- Average payment delay: {metrics['avg_delay']} days
- Payment spread (max − min): {metrics['spread']} days
- Suppliers in critical status: {metrics['critical_count']}/{metrics['total_suppliers']}
- Suppliers with accelerating delays: {metrics['accelerating_count']}
- Suppliers with upward drift: {metrics['drifting_count']}
- Payment triage detected: {'Yes' if metrics['triage_detected'] else 'No'}
- Delayed suppliers (>30d): {', '.join(metrics['delayed_suppliers']) or 'None'}
- On-time suppliers (≤10d): {', '.join(metrics['on_time_suppliers']) or 'None'}

Respond with ONLY the JSON object, no other text."""


# ---------------------------------------------------------------------------
# Groq API call
# ---------------------------------------------------------------------------

GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
GROQ_MODEL = "llama-3.3-70b-versatile"


async def _call_groq(user_prompt: str) -> Optional[Dict[str, Any]]:
    """Call Groq API and return parsed JSON. Returns None on failure."""
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        logger.warning("GROQ_API_KEY not set — skipping LLM call")
        return None

    try:
        import httpx
    except ImportError:
        logger.warning("httpx not installed — skipping LLM call")
        return None

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": _SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        "temperature": 0.4,
        "max_tokens": 600,
        "response_format": {"type": "json_object"},
    }

    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            resp = await client.post(GROQ_API_URL, headers=headers, json=payload)
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)

        # Validate expected keys
        required_keys = {"summary", "key_issues", "suggestions", "priority_focus", "expected_impact"}
        if not required_keys.issubset(parsed.keys()):
            logger.warning("Groq response missing keys: %s", required_keys - parsed.keys())
            return None

        return parsed

    except Exception:
        logger.exception("Groq API call failed")
        return None


# ---------------------------------------------------------------------------
# Heuristic fallback (no LLM needed)
# ---------------------------------------------------------------------------

def _generate_fallback(sme_id: str, sme: Dict[str, Any]) -> Dict[str, Any]:
    """Generate a rule-based insight when Groq is unavailable."""
    metrics = _compute_sme_metrics(sme)
    risk = metrics["risk_level"]
    suppliers = sme["suppliers"]

    # Summary
    if risk == "HIGH":
        summary = (
            f"{sme['name']} is experiencing significant payment delays across "
            f"multiple suppliers, with an average delay of {metrics['avg_delay']} days "
            f"and {metrics['critical_count']} supplier(s) in critical status."
        )
    elif risk == "MEDIUM":
        summary = (
            f"{sme['name']} shows emerging payment stress with average delays of "
            f"{metrics['avg_delay']} days and widening spread across suppliers."
        )
    else:
        summary = (
            f"{sme['name']} maintains consistent payment patterns with an average "
            f"delay of {metrics['avg_delay']} days — within healthy operating range."
        )

    # Key issues
    key_issues: List[str] = []
    if metrics["triage_detected"]:
        key_issues.append(
            "Selective payment prioritisation detected — some suppliers are being "
            "paid on time while others face growing delays"
        )
    if metrics["accelerating_count"] > 0:
        names = [s["name"] for s in suppliers if s["trend"] == "accelerating"]
        key_issues.append(
            f"Payment delays are accelerating for {', '.join(names)}, "
            f"suggesting increasing cash flow pressure"
        )
    if metrics["spread"] > 20:
        key_issues.append(
            f"Payment spread of {metrics['spread']} days between fastest and "
            f"slowest-paid suppliers indicates uneven cash allocation"
        )
    if metrics["critical_count"] > 0:
        key_issues.append(
            f"{metrics['critical_count']} supplier relationship(s) have reached "
            f"critical delay levels beyond contractual terms"
        )
    if metrics["drifting_count"] > 0 and metrics["accelerating_count"] == 0:
        key_issues.append(
            f"Gradual upward drift in {metrics['drifting_count']} supplier "
            f"payment(s) may signal emerging financial pressure"
        )
    if not key_issues:
        key_issues.append("No significant payment behaviour anomalies detected")

    # Suggestions
    suggestions: List[str] = []
    if risk == "HIGH":
        suggestions.extend([
            "Reviewing overall payment scheduling could help reduce supplier concentration risk",
            "Engaging with suppliers showing the longest delays early may help preserve relationships",
            "Considering a more even distribution of payment timing across suppliers could stabilise operations",
        ])
    elif risk == "MEDIUM":
        suggestions.extend([
            "Monitoring the widening gap between on-time and delayed payments could provide early warning of further stress",
            "Exploring whether payment timing adjustments may help maintain supplier confidence",
            "Regular review of payment spread trends could support proactive cash flow management",
        ])
    else:
        suggestions.extend([
            "Continuing current payment discipline may help maintain stable supplier relationships",
            "Periodic review of payment patterns could help identify any emerging drift early",
            "Maintaining visibility of supplier payment terms relative to actual timing could support ongoing health",
        ])

    # Priority focus
    priority_focus: List[str] = []
    if metrics["critical_count"] > 0:
        critical_names = [s["name"] for s in suppliers if s["severity"] == "critical"]
        priority_focus.append(f"Suppliers in critical delay: {', '.join(critical_names)}")
    if metrics["triage_detected"]:
        priority_focus.append("Closing the gap between fastest-paid and most-delayed suppliers")
    if metrics["accelerating_count"] > 0:
        priority_focus.append("Suppliers with accelerating delay trends")
    if not priority_focus:
        priority_focus.append("Routine monitoring — no urgent focus areas identified")

    # Expected impact
    if risk == "HIGH":
        expected_impact = (
            "Addressing the most delayed supplier relationships and reducing payment spread "
            "could help move the risk profile from high toward medium over 4–8 weeks, "
            "potentially preserving key supplier partnerships."
        )
    elif risk == "MEDIUM":
        expected_impact = (
            "Stabilising payment timing and preventing further drift could help maintain "
            "the current risk level and reduce the chance of escalation to high risk."
        )
    else:
        expected_impact = (
            "Maintaining current payment behaviour supports a stable risk profile. "
            "Continued consistency may reinforce supplier confidence over time."
        )

    return {
        "summary": summary,
        "key_issues": key_issues[:3],
        "suggestions": suggestions[:3],
        "priority_focus": priority_focus[:2],
        "expected_impact": expected_impact,
    }


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

async def get_sme_insights(sme_id: str, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Get behavioural insights for one SME.

    Tries Groq first; falls back to heuristic generation.
    Results are cached in memory for the lifetime of the server process.
    """
    if sme_id not in SME_DATABASE:
        return {"error": f"Unknown SME: {sme_id}"}

    if not force_refresh and sme_id in _INSIGHTS_CACHE:
        return _INSIGHTS_CACHE[sme_id]

    sme = SME_DATABASE[sme_id]
    user_prompt = _build_user_prompt(sme_id, sme)

    # Try Groq
    result = await _call_groq(user_prompt)
    source = "groq"

    # Fallback to heuristic
    if result is None:
        result = _generate_fallback(sme_id, sme)
        source = "heuristic"

    # Enrich with metadata
    result["sme_id"] = sme_id
    result["sme_name"] = sme["name"]
    result["source"] = source

    _INSIGHTS_CACHE[sme_id] = result
    return result


async def get_all_insights(force_refresh: bool = False) -> Dict[str, Dict[str, Any]]:
    """Get behavioural insights for all SMEs in the database."""
    results = {}
    for sme_id in SME_DATABASE:
        results[sme_id] = await get_sme_insights(sme_id, force_refresh=force_refresh)
    return results
