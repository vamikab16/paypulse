"""
Multi-company portfolio generator for PayPulse.

The original `src/data/generator.py` produces 52 weeks of data for a single
company (Meridian Engineering) with 5 hand-crafted supplier profiles. That
is sufficient for a single-firm demo but makes honest model validation
impossible — there is only one entity, so "entity-level" cross-validation
is degenerate.

This module generates a synthetic portfolio of SME borrowers for a bank.
Each firm has:
  - 3-6 suppliers
  - 52 weeks of weekly payment observations
  - a latent weekly cashflow-stress trajectory
  - a stochastic default event drawn from a hazard model (see
    `src.data.labels.sample_default_event`)

The population is deliberately diverse:
  - ~80% "healthy" firms with low baseline stress and mild noise
  - ~12% "gradually stressed" firms with a drifting stress profile
  - ~5% "acute" firms with a sudden regime shift at a random week
  - ~3% "seasonal" firms with cyclical stress spikes

Annual default rate target: ~2-4% (UK SME bank book realistic range).

Schema (per row) matches the single-firm generator, plus:
  - company_id, company_name, sector, size_band

Ground truth available at firm level:
  - defaulted: bool
  - default_week: int or None
  - latent_profile: str
"""

from __future__ import annotations

import numpy as np
import pandas as pd

from src.data.labels import sample_default_event


SECTORS = [
    "Construction", "Manufacturing", "Wholesale", "Retail",
    "Professional Services", "Hospitality", "Transport", "Engineering",
]
SIZE_BANDS = ["micro", "small", "medium"]

PROFILE_MIX = [
    ("healthy", 0.80),
    ("gradually_stressed", 0.12),
    ("acute", 0.05),
    ("seasonal", 0.03),
]

SUPPLIER_CATEGORY_TERMS = {
    "materials": 21,
    "logistics": 30,
    "services": 14,
    "utilities": 7,
    "parts": 21,
    "consumables": 14,
}


def _generate_stress_trajectory(
    profile: str,
    n_weeks: int,
    rng: np.random.Generator,
) -> np.ndarray:
    """Return a length-n_weeks latent stress series in arbitrary units."""
    t = np.arange(n_weeks, dtype=float)
    if profile == "healthy":
        base = rng.normal(0, 0.4, n_weeks).cumsum() * 0.15
        return np.clip(base, -2.0, 3.0)
    if profile == "gradually_stressed":
        ramp_start = rng.integers(10, 30)
        slope = rng.uniform(0.08, 0.18)
        series = np.where(t < ramp_start, 0.0, (t - ramp_start) * slope)
        series += rng.normal(0, 0.4, n_weeks)
        return series
    if profile == "acute":
        shock_week = int(rng.integers(18, 40))
        magnitude = rng.uniform(4.0, 8.0)
        series = rng.normal(0, 0.4, n_weeks)
        series[shock_week:] += magnitude
        series[shock_week:] += rng.normal(0, 0.6, n_weeks - shock_week).cumsum() * 0.1
        return series
    if profile == "seasonal":
        period = rng.choice([13, 26])
        amp = rng.uniform(1.5, 3.0)
        phase = rng.uniform(0, 2 * np.pi)
        return amp * np.sin(2 * np.pi * t / period + phase) + rng.normal(0, 0.4, n_weeks)
    raise ValueError(f"unknown profile: {profile}")


def _generate_supplier_delays(
    stress: np.ndarray,
    terms_days: int,
    rng: np.random.Generator,
    sensitivity: float,
) -> np.ndarray:
    """
    Convert latent stress into observed payment delays for one supplier.

    Payment delay increases with stress, with supplier-specific sensitivity
    (some suppliers are "stretched first"). Observation noise is added.
    """
    base = terms_days * 0.85
    stress_effect = np.maximum(0.0, stress) * sensitivity * 4.0
    noise = rng.normal(0, 1.2, len(stress))
    delays = base + stress_effect + noise
    return np.clip(delays, 1.0, 180.0)


def _pick_profile(rng: np.random.Generator) -> str:
    r = rng.random()
    cum = 0.0
    for name, p in PROFILE_MIX:
        cum += p
        if r <= cum:
            return name
    return PROFILE_MIX[-1][0]


def generate_portfolio(
    n_companies: int = 50,
    n_weeks: int = 52,
    seed: int = 17,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Generate a portfolio of SME borrowers with synthetic payment behaviour.

    Args:
        n_companies: number of distinct SME firms to generate.
        n_weeks: weeks of history per firm.
        seed: RNG seed for reproducibility.

    Returns:
        (payments_df, firms_df) where:
            payments_df has one row per (company, supplier, week) with all
                the columns the single-firm generator produces, plus
                company_id / company_name / sector / size_band.
            firms_df has one row per company with its ground-truth profile,
                default flag, and default week (if any).
    """
    rng = np.random.default_rng(seed)
    payment_rows = []
    firm_rows = []

    for i in range(n_companies):
        cid = f"C{i + 1:04d}"
        cname = f"SME-{i + 1:04d} Ltd"
        sector = rng.choice(SECTORS)
        size = rng.choice(SIZE_BANDS, p=[0.55, 0.35, 0.10])
        profile = _pick_profile(rng)

        stress = _generate_stress_trajectory(profile, n_weeks, rng)
        default_info = sample_default_event(stress, rng=rng)

        n_suppliers = int(rng.integers(3, 7))
        supplier_cats = rng.choice(
            list(SUPPLIER_CATEGORY_TERMS.keys()),
            size=n_suppliers,
            replace=True,
        )
        sensitivities = rng.uniform(0.3, 1.4, n_suppliers)

        for s_idx, cat in enumerate(supplier_cats):
            sid = f"{cid}-S{s_idx + 1}"
            sname = f"{cat.capitalize()} Supplier {s_idx + 1}"
            terms = SUPPLIER_CATEGORY_TERMS[cat]
            delays = _generate_supplier_delays(stress, terms, rng, sensitivities[s_idx])

            for w in range(n_weeks):
                if default_info["default_week"] is not None and (w + 1) > default_info["default_week"]:
                    break
                delay = float(delays[w])
                excess = delay - terms
                if excess <= 0:
                    status = "on_time"
                elif excess <= 7:
                    status = "slightly_late"
                elif excess <= 15:
                    status = "late"
                else:
                    status = "critical"
                invoice = float(rng.uniform(4000, 22000))
                payment_rows.append({
                    "company_id": cid,
                    "company_name": cname,
                    "sector": sector,
                    "size_band": size,
                    "week_number": w + 1,
                    "supplier_id": sid,
                    "supplier_name": sname,
                    "supplier_category": cat,
                    "invoice_amount": round(invoice, 2),
                    "payment_delay_days": round(delay, 1),
                    "contractual_terms_days": terms,
                    "payment_status": status,
                })

        firm_rows.append({
            "company_id": cid,
            "company_name": cname,
            "sector": sector,
            "size_band": size,
            "latent_profile": profile,
            "defaulted": default_info["defaulted"],
            "default_week": default_info["default_week"],
        })

    payments_df = pd.DataFrame(payment_rows)
    firms_df = pd.DataFrame(firm_rows)
    return payments_df, firms_df


def portfolio_summary(firms_df: pd.DataFrame) -> dict:
    """Headline statistics for a generated portfolio."""
    n = len(firms_df)
    n_default = int(firms_df["defaulted"].sum())
    return {
        "n_companies": n,
        "n_defaulted": n_default,
        "default_rate_pct": round(100.0 * n_default / max(n, 1), 2),
        "profile_mix": firms_df["latent_profile"].value_counts().to_dict(),
        "sector_mix": firms_df["sector"].value_counts().to_dict(),
        "size_mix": firms_df["size_band"].value_counts().to_dict(),
    }
