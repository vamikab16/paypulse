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

# Shown when an SME owner views their own dashboard — advice directed at the business
_SYSTEM_PROMPT_SME = """You are a financial behaviour insights assistant helping an SME business owner understand their payment patterns.

Your role is to analyse supplier payment data and give high-level, non-prescriptive guidance so the owner can improve their cash flow behaviour.

IMPORTANT RULES:
* Speak directly to the business owner (use "you" / "your business")
* Do NOT provide financial advice or exact instructions
* Do NOT suggest specific payment amounts
* Use neutral, supportive language: "consider", "may help", "could improve"
* Focus on behavioural patterns the owner can act on
* Keep output concise, clear, and non-judgmental

OUTPUT FORMAT (STRICT JSON ONLY — no markdown, no explanation, just the JSON object):
{
  "summary": "One-line explanation of current payment behaviour and risk for the business owner",
  "key_issues": ["Issue 1 from the owner's perspective", "Issue 2", "Issue 3"],
  "suggestions": ["Action the owner could consider", "Another behavioural suggestion", "Third suggestion"],
  "priority_focus": ["Which supplier relationship to focus on", "Area needing stabilisation"],
  "expected_impact": "How improving this behaviour may reduce risk for your business over time"
}"""

# Shown when a Bank RM drills into an SME from the portfolio view — advice directed at the RM
_SYSTEM_PROMPT_BANK = """You are a risk intelligence assistant for a NatWest Relationship Manager reviewing an SME client's payment behaviour.

Your role is to analyse supplier payment data and recommend concrete actions the RM should take to support the client and protect the bank's lending position.

IMPORTANT RULES:
* Speak directly to the RM (use "you should", "we recommend", "consider scheduling")
* Be specific and action-oriented — the RM needs to know what to DO, not just what the SME is doing
* Actions should be professional banking steps: outreach, credit review, escalation, support products
* Keep output concise, clear, and decision-ready

OUTPUT FORMAT (STRICT JSON ONLY — no markdown, no explanation, just the JSON object):
{
  "summary": "One-line assessment of this SME's risk status for the RM",
  "key_issues": ["Risk signal 1 the RM should be aware of", "Risk signal 2", "Risk signal 3"],
  "suggestions": ["Concrete RM action 1 (e.g. schedule outreach call)", "RM action 2 (e.g. review credit facility)", "RM action 3 (e.g. offer cash flow advisory)"],
  "priority_focus": ["Most urgent RM action", "Secondary priority"],
  "expected_impact": "How early RM intervention may prevent default and protect the lending relationship"
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


async def _call_groq(user_prompt: str, viewer: str = "sme") -> Optional[Dict[str, Any]]:
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
    system_prompt = _SYSTEM_PROMPT_BANK if viewer == "bank" else _SYSTEM_PROMPT_SME
    payload = {
        "model": GROQ_MODEL,
        "messages": [
            {"role": "system", "content": system_prompt},
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

def _generate_fallback(sme_id: str, sme: Dict[str, Any], viewer: str = "sme") -> Dict[str, Any]:
    """Generate a rule-based insight when Groq is unavailable."""
    metrics = _compute_sme_metrics(sme)
    risk = metrics["risk_level"]
    suppliers = sme["suppliers"]
    is_bank = viewer == "bank"

    # Summary
    if is_bank:
        if risk == "HIGH":
            summary = (
                f"{sme['name']} is HIGH risk — payment triage detected with "
                f"{metrics['critical_count']} supplier(s) in critical delay. "
                f"Immediate RM outreach recommended."
            )
        elif risk == "MEDIUM":
            summary = (
                f"{sme['name']} shows MEDIUM risk — emerging payment stress with "
                f"average delays of {metrics['avg_delay']} days. Schedule a review call."
            )
        else:
            summary = (
                f"{sme['name']} is LOW risk — payment patterns are stable. "
                f"Continue standard monitoring."
            )
    else:
        if risk == "HIGH":
            summary = (
                f"Your business is experiencing significant payment delays across "
                f"multiple suppliers, with an average delay of {metrics['avg_delay']} days "
                f"and {metrics['critical_count']} supplier(s) in critical status."
            )
        elif risk == "MEDIUM":
            summary = (
                f"Your business shows emerging payment stress with average delays of "
                f"{metrics['avg_delay']} days and a widening gap across suppliers."
            )
        else:
            summary = (
                f"Your business maintains consistent payment patterns with an average "
                f"delay of {metrics['avg_delay']} days — within healthy operating range."
            )

    # Key issues (same facts, but framed as risk signals for bank or owner observations)
    key_issues: List[str] = []
    if metrics["triage_detected"]:
        if is_bank:
            key_issues.append(
                "Payment triage detected — client is paying some suppliers on time "
                "while others face critical delays (a recognised early distress signal)"
            )
        else:
            key_issues.append(
                "You are paying some suppliers on time while others face growing delays — "
                "this pattern can strain supplier relationships over time"
            )
    if metrics["accelerating_count"] > 0:
        names = [s["name"] for s in suppliers if s["trend"] == "accelerating"]
        if is_bank:
            key_issues.append(
                f"Delays are accelerating for {', '.join(names)} — "
                f"trajectory points toward further deterioration without intervention"
            )
        else:
            key_issues.append(
                f"Payment delays to {', '.join(names)} are getting worse each week — "
                f"acting early can help prevent relationship damage"
            )
    if metrics["spread"] > 20:
        if is_bank:
            key_issues.append(
                f"Payment spread of {metrics['spread']} days signals selective prioritisation "
                f"— the client is managing liquidity by delaying specific suppliers"
            )
        else:
            key_issues.append(
                f"There is a {metrics['spread']}-day gap between your fastest and slowest paid "
                f"suppliers, suggesting uneven cash allocation"
            )
    if metrics["critical_count"] > 0 and not metrics["triage_detected"]:
        if is_bank:
            key_issues.append(
                f"{metrics['critical_count']} supplier(s) are past critical delay thresholds — "
                f"credit exposure to these relationships is elevated"
            )
        else:
            key_issues.append(
                f"{metrics['critical_count']} supplier relationship(s) are significantly "
                f"overdue — these may need immediate attention"
            )
    if not key_issues:
        key_issues.append(
            "No significant risk signals detected — client appears stable"
            if is_bank else
            "No significant payment behaviour anomalies detected"
        )

    # Suggestions — completely different for bank vs SME
    suggestions: List[str] = []
    if is_bank:
        if risk == "HIGH":
            suggestions.extend([
                "Schedule an urgent outreach call with the client's primary contact within 48 hours",
                "Review the client's current credit facility and overdraft utilisation",
                "Consider escalating to the Credit Committee if delays continue to accelerate",
            ])
        elif risk == "MEDIUM":
            suggestions.extend([
                "Schedule a proactive check-in call with the client this week",
                "Offer NatWest cash flow management or invoice financing products",
                "Set a 2-week monitoring alert to track whether delays continue drifting",
            ])
        else:
            suggestions.extend([
                "Continue standard periodic monitoring — no immediate action required",
                "Note positive payment behaviour in the client's file",
                "Consider this client for relationship development opportunities",
            ])
    else:
        if risk == "HIGH":
            suggestions.extend([
                "Consider speaking to your NatWest relationship manager about cash flow support options",
                "Reaching out to your most-delayed suppliers early may help preserve those relationships",
                "Reviewing your payment schedule to distribute payments more evenly could reduce pressure",
            ])
        elif risk == "MEDIUM":
            suggestions.extend([
                "Keeping an eye on the widening gap between on-time and delayed payments could give you early warning",
                "Exploring whether small adjustments to payment timing could maintain supplier confidence",
                "Regular review of payment trends could support proactive cash flow management",
            ])
        else:
            suggestions.extend([
                "Continuing your current payment discipline helps maintain strong supplier relationships",
                "Periodic review of payment patterns can help catch any emerging drift early",
                "Maintaining visibility of your payment terms vs actual timing supports ongoing financial health",
            ])

    # Priority focus
    priority_focus: List[str] = []
    if metrics["critical_count"] > 0:
        critical_names = [s["name"] for s in suppliers if s["severity"] == "critical"]
        priority_focus.append(
            f"Immediate outreach regarding: {', '.join(critical_names)}"
            if is_bank else
            f"Most overdue suppliers: {', '.join(critical_names)}"
        )
    if metrics["triage_detected"]:
        priority_focus.append(
            "Investigate the payment triage pattern — discuss cash flow position with client"
            if is_bank else
            "Closing the payment gap between your fastest and most-delayed suppliers"
        )
    if metrics["accelerating_count"] > 0 and not priority_focus:
        priority_focus.append(
            "Monitor accelerating delay trajectory — set escalation trigger"
            if is_bank else
            "Suppliers with worsening payment trends need attention first"
        )
    if not priority_focus:
        priority_focus.append(
            "Routine monitoring — no urgent RM actions required"
            if is_bank else
            "Routine monitoring — no urgent focus areas identified"
        )

    # Expected impact
    if is_bank:
        if risk == "HIGH":
            expected_impact = (
                "Early RM engagement at this stage can open a 4–8 week window to restructure "
                "payment arrangements, reducing the likelihood of default and protecting "
                "the bank's lending relationship."
            )
        elif risk == "MEDIUM":
            expected_impact = (
                "Proactive outreach now can prevent escalation to high risk. "
                "Offering appropriate support products may stabilise the client's cash flow "
                "before supplier relationships are damaged."
            )
        else:
            expected_impact = (
                "No intervention needed. Continued monitoring ensures any emerging "
                "stress is caught early in future periods."
            )
    else:
        if risk == "HIGH":
            expected_impact = (
                "Addressing your most delayed supplier relationships and spreading payments "
                "more evenly could help improve your risk profile over 4–8 weeks and "
                "preserve key supplier partnerships."
            )
        elif risk == "MEDIUM":
            expected_impact = (
                "Stabilising your payment timing now could prevent further drift and reduce "
                "the chance of any supplier relationships becoming strained."
            )
        else:
            expected_impact = (
                "Maintaining your current payment behaviour supports a stable financial profile. "
                "Continued consistency reinforces supplier confidence over time."
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

async def get_sme_insights(sme_id: str, force_refresh: bool = False, viewer: str = "sme") -> Dict[str, Any]:
    """
    Get behavioural insights for one SME.

    viewer='sme'  → business-facing guidance (for the SME owner)
    viewer='bank' → RM-facing action recommendations (for the Bank RM)

    Tries Groq first; falls back to heuristic generation.
    Results are cached per (sme_id, viewer) pair for the server lifetime.
    """
    if sme_id not in SME_DATABASE:
        return {"error": f"Unknown SME: {sme_id}"}

    cache_key = f"{sme_id}:{viewer}"
    if not force_refresh and cache_key in _INSIGHTS_CACHE:
        return _INSIGHTS_CACHE[cache_key]

    sme = SME_DATABASE[sme_id]
    user_prompt = _build_user_prompt(sme_id, sme)

    # Try Groq with the correct system prompt for this viewer
    result = await _call_groq(user_prompt, viewer=viewer)
    source = "groq"

    # Fallback to heuristic
    if result is None:
        result = _generate_fallback(sme_id, sme, viewer=viewer)
        source = "heuristic"

    # Enrich with metadata
    result["sme_id"] = sme_id
    result["sme_name"] = sme["name"]
    result["source"] = source
    result["viewer"] = viewer

    _INSIGHTS_CACHE[cache_key] = result
    return result


async def get_all_insights(force_refresh: bool = False) -> Dict[str, Dict[str, Any]]:
    """Get behavioural insights for all SMEs in the database."""
    results = {}
    for sme_id in SME_DATABASE:
        results[sme_id] = await get_sme_insights(sme_id, force_refresh=force_refresh)
    return results
