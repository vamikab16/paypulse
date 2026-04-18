"""
Forward-looking distress label generator for PayPulse.

The original `MLRiskClassifier._compute_risk_label` derived the label from
`delay - contractual_terms`, which is also encoded in the feature
`excess_over_terms`. That is textbook target leakage — the classifier
collapses to a lookup table and reports near-perfect training accuracy.

This module replaces that label with a *forward-looking* distress indicator:

  y_t = 1  if the supplier enters a critical-delay state at any point in the
           next HORIZON weeks (default 6) AND that state was not already
           present at time t
  y_t = 0  otherwise

Features at time t may only use information from weeks <= t. Labels depend
strictly on weeks > t. This makes the learning problem honest: the model
must infer future distress from trajectory, volatility, and cross-supplier
context — not from the current week's excess.

Additionally, for portfolio-level simulation we expose a latent-hazard
sampler (`sample_default_event`) that draws a binary default flag per
firm over a 52-week horizon from a stochastic hazard process. This is
used by `src/data/portfolio.py` to produce populations with a plausible
default rate (~2-4% annual) rather than deterministic rule-based labels.
"""

from __future__ import annotations

import numpy as np
import pandas as pd


CRITICAL_EXCESS_DAYS = 15
DEFAULT_FORWARD_HORIZON_WEEKS = 6


def forward_distress_label(
    df: pd.DataFrame,
    horizon_weeks: int = DEFAULT_FORWARD_HORIZON_WEEKS,
    critical_excess: int = CRITICAL_EXCESS_DAYS,
) -> pd.DataFrame:
    """
    Attach a forward-looking binary distress label to every (supplier, week) row.

    For each row at (supplier_id=s, week_number=t), the label is 1 iff:
        - at some week t' in (t, t + horizon_weeks], supplier s has
          (payment_delay_days - contractual_terms_days) > critical_excess
        - AND at week t itself the supplier is NOT already in that state
          (avoids trivially labelling already-distressed firms)

    The returned DataFrame is a copy of `df` with an added `y_future_distress`
    column (int, 0/1) and `y_future_distress_valid` (bool) indicating whether
    the label is well-defined (False in the last `horizon_weeks` rows where
    the forward window is truncated).

    Args:
        df: raw payment history with columns week_number, supplier_id,
            payment_delay_days, contractual_terms_days.
        horizon_weeks: how many weeks ahead to look for a critical event.
        critical_excess: excess-over-terms threshold defining "critical".

    Returns:
        Copy of df with y_future_distress and y_future_distress_valid columns.
    """
    out = df.copy().sort_values(["supplier_id", "week_number"]).reset_index(drop=True)
    out["excess"] = out["payment_delay_days"] - out["contractual_terms_days"]
    out["is_critical_now"] = (out["excess"] > critical_excess).astype(int)

    labels = np.zeros(len(out), dtype=int)
    valid = np.ones(len(out), dtype=bool)

    for sid, grp in out.groupby("supplier_id", sort=False):
        idx = grp.index.to_numpy()
        crit = grp["is_critical_now"].to_numpy()
        n = len(idx)
        for i in range(n):
            end = min(n, i + 1 + horizon_weeks)
            if i + horizon_weeks >= n:
                valid[idx[i]] = False
            future = crit[i + 1:end]
            if len(future) == 0:
                continue
            if crit[i] == 1:
                labels[idx[i]] = 0
            elif future.max() == 1:
                labels[idx[i]] = 1

    out["y_future_distress"] = labels
    out["y_future_distress_valid"] = valid
    out = out.drop(columns=["is_critical_now"])
    return out


def sample_default_event(
    weekly_stress: np.ndarray,
    baseline_hazard: float = 0.0005,
    stress_coefficient: float = 0.08,
    rng: np.random.Generator | None = None,
) -> dict:
    """
    Sample a binary default event and its week-of-default from a discrete-time
    hazard model.

    The per-week hazard is:
        h_t = sigmoid( logit(baseline) + stress_coefficient * weekly_stress[t] )

    where `weekly_stress[t]` is an unobserved cashflow-stress latent in
    arbitrary units (larger = more stress). This hazard is sampled once per
    firm over the full horizon; the first week where a Bernoulli(h_t) fires
    is the default week.

    Args:
        weekly_stress: 1-d array of latent stress over weeks.
        baseline_hazard: per-week default probability at stress=0.
        stress_coefficient: log-odds multiplier on stress.
        rng: numpy Generator for reproducibility.

    Returns:
        dict with:
            defaulted: bool
            default_week: int or None (1-indexed)
            weekly_hazard: np.ndarray of per-week hazards
    """
    if rng is None:
        rng = np.random.default_rng()

    logit_base = np.log(baseline_hazard / (1.0 - baseline_hazard))
    z = logit_base + stress_coefficient * weekly_stress
    hazard = 1.0 / (1.0 + np.exp(-z))

    draws = rng.random(len(hazard))
    fires = draws < hazard
    default_week = int(np.argmax(fires) + 1) if fires.any() else None

    return {
        "defaulted": bool(fires.any()),
        "default_week": default_week,
        "weekly_hazard": hazard,
    }


def leakage_safe_risk_bucket(
    forward_label: int,
    recent_trend_slope: float,
    recent_mean_excess: float,
) -> str:
    """
    Map a forward-looking binary distress label + trajectory context into a
    4-class risk bucket (normal / watch / warning / critical) that matches the
    schema used by MLRiskClassifier but is derived from forward-looking
    information, not the contemporaneous excess.

    This is used to keep the existing multi-class classifier surface alive
    while eliminating the leakage.

    Args:
        forward_label: 0/1 — will supplier enter critical in next N weeks?
        recent_trend_slope: days/week slope of the last 6 weeks.
        recent_mean_excess: mean (delay - terms) over the last 4 weeks.

    Returns:
        One of "normal", "watch", "warning", "critical".
    """
    if forward_label == 1 and recent_trend_slope > 1.0:
        return "critical"
    if forward_label == 1:
        return "warning"
    if recent_trend_slope > 0.8 or recent_mean_excess > 10:
        return "watch"
    return "normal"
