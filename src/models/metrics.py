"""
Honest model-evaluation metrics for PayPulse.

The existing ML engine reports `train_accuracy` — training-set accuracy on
a severely imbalanced, leakage-heavy target. That is the single most
disqualifying number a model validator would see. This module replaces it
with the metrics a bank credit-risk validator actually asks for:

  - AUC-ROC           — rank-ordering ability
  - KS statistic      — max separation between good and bad score distributions
  - Brier score       — mean squared probability error (calibration + sharpness)
  - Precision@k       — precision among the top-k% highest-risk (operational)
  - Lift@decile       — concentration of bads in top decile vs base rate
  - Calibration decile table — binned mean-predicted vs observed default rate
  - PSI               — population stability index (drift across time / segments)

All functions accept `y_true` (0/1) and `y_score` (probability in [0,1]).
None of them require sklearn to be installed with extras — everything is
plain numpy/pandas.
"""

from __future__ import annotations

from typing import Sequence
import numpy as np
import pandas as pd


def auc_roc(y_true: Sequence[int], y_score: Sequence[float]) -> float:
    """
    AUC-ROC via the Mann-Whitney U equivalence.
    Returns 0.5 if the target is constant (undefined AUC).
    """
    y_true = np.asarray(y_true).astype(int)
    y_score = np.asarray(y_score).astype(float)
    pos = y_score[y_true == 1]
    neg = y_score[y_true == 0]
    if len(pos) == 0 or len(neg) == 0:
        return 0.5
    order = np.argsort(np.concatenate([pos, neg]))
    ranks = np.empty_like(order, dtype=float)
    ranks[order] = np.arange(1, len(order) + 1)
    pos_ranks = ranks[:len(pos)]
    u = pos_ranks.sum() - len(pos) * (len(pos) + 1) / 2.0
    return float(u / (len(pos) * len(neg)))


def ks_statistic(y_true: Sequence[int], y_score: Sequence[float]) -> float:
    """
    Kolmogorov-Smirnov statistic: max |CDF_bad(s) - CDF_good(s)|.
    Standard credit-risk scorecard quality metric.
    """
    y_true = np.asarray(y_true).astype(int)
    y_score = np.asarray(y_score).astype(float)
    pos = np.sort(y_score[y_true == 1])
    neg = np.sort(y_score[y_true == 0])
    if len(pos) == 0 or len(neg) == 0:
        return 0.0
    all_scores = np.sort(np.unique(np.concatenate([pos, neg])))
    cdf_pos = np.searchsorted(pos, all_scores, side="right") / len(pos)
    cdf_neg = np.searchsorted(neg, all_scores, side="right") / len(neg)
    return float(np.max(np.abs(cdf_pos - cdf_neg)))


def brier_score(y_true: Sequence[int], y_score: Sequence[float]) -> float:
    """Mean squared error between predicted probability and 0/1 outcome."""
    y_true = np.asarray(y_true).astype(float)
    y_score = np.asarray(y_score).astype(float)
    return float(np.mean((y_score - y_true) ** 2))


def precision_at_k(
    y_true: Sequence[int],
    y_score: Sequence[float],
    k_pct: float = 5.0,
) -> float:
    """
    Precision among the top-k% highest-risk observations.

    For operational use this is more relevant than overall precision —
    analyst bandwidth is finite and alerts are triaged top-down.
    """
    y_true = np.asarray(y_true).astype(int)
    y_score = np.asarray(y_score).astype(float)
    n = len(y_true)
    if n == 0:
        return 0.0
    k = max(1, int(np.ceil(n * k_pct / 100.0)))
    top_idx = np.argsort(-y_score)[:k]
    return float(y_true[top_idx].sum() / k)


def lift_at_decile(y_true: Sequence[int], y_score: Sequence[float]) -> float:
    """
    Lift at top decile: (default rate in top-10% by score) / (overall default rate).
    A lift of 5.0 means the top decile concentrates 5x the base rate.
    Returns 0.0 if base rate is zero.
    """
    y_true = np.asarray(y_true).astype(int)
    y_score = np.asarray(y_score).astype(float)
    if len(y_true) == 0:
        return 0.0
    base = float(y_true.mean())
    if base == 0.0:
        return 0.0
    k = max(1, int(np.ceil(len(y_true) * 0.10)))
    top_idx = np.argsort(-y_score)[:k]
    top_rate = float(y_true[top_idx].mean())
    return top_rate / base


def calibration_table(
    y_true: Sequence[int],
    y_score: Sequence[float],
    n_bins: int = 10,
) -> list[dict]:
    """
    Decile-binned calibration table.

    For each bin: bin range, mean predicted probability, observed rate,
    count. Use for reliability diagrams and to sanity-check that predicted
    probabilities are meaningful, not just ranking.
    """
    y_true = np.asarray(y_true).astype(int)
    y_score = np.asarray(y_score).astype(float)
    if len(y_true) == 0:
        return []
    df = pd.DataFrame({"y": y_true, "p": y_score})
    df["bin"] = pd.qcut(df["p"].rank(method="first"), n_bins, labels=False, duplicates="drop")
    rows = []
    for b, grp in df.groupby("bin"):
        rows.append({
            "bin": int(b),
            "n": int(len(grp)),
            "mean_pred": float(grp["p"].mean()),
            "observed_rate": float(grp["y"].mean()),
            "p_min": float(grp["p"].min()),
            "p_max": float(grp["p"].max()),
        })
    return rows


def population_stability_index(
    expected: Sequence[float],
    actual: Sequence[float],
    n_bins: int = 10,
) -> float:
    """
    PSI for drift detection. Rule of thumb:
        PSI < 0.10   no significant shift
        0.10-0.25    moderate shift
        > 0.25       significant shift — investigate / retrain
    """
    expected = np.asarray(expected, dtype=float)
    actual = np.asarray(actual, dtype=float)
    if len(expected) == 0 or len(actual) == 0:
        return 0.0
    edges = np.quantile(expected, np.linspace(0, 1, n_bins + 1))
    edges = np.unique(edges)
    if len(edges) < 2:
        return 0.0
    exp_counts, _ = np.histogram(expected, bins=edges)
    act_counts, _ = np.histogram(actual, bins=edges)
    exp_pct = exp_counts / max(exp_counts.sum(), 1)
    act_pct = act_counts / max(act_counts.sum(), 1)
    eps = 1e-6
    exp_pct = np.clip(exp_pct, eps, None)
    act_pct = np.clip(act_pct, eps, None)
    psi = np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct))
    return float(psi)


def full_classification_report(
    y_true: Sequence[int],
    y_score: Sequence[float],
) -> dict:
    """
    Produce the full validator-facing metric bundle. This is what the
    /api/ai/status endpoint should expose — never raw training accuracy.
    """
    y_true = np.asarray(y_true).astype(int)
    y_score = np.asarray(y_score).astype(float)
    n = len(y_true)
    n_pos = int(y_true.sum())
    return {
        "n_samples": n,
        "n_positive": n_pos,
        "base_rate": round(n_pos / max(n, 1), 4),
        "auc_roc": round(auc_roc(y_true, y_score), 4),
        "ks_statistic": round(ks_statistic(y_true, y_score), 4),
        "brier_score": round(brier_score(y_true, y_score), 4),
        "precision_at_1pct": round(precision_at_k(y_true, y_score, 1.0), 4),
        "precision_at_5pct": round(precision_at_k(y_true, y_score, 5.0), 4),
        "precision_at_10pct": round(precision_at_k(y_true, y_score, 10.0), 4),
        "lift_at_decile": round(lift_at_decile(y_true, y_score), 3),
        "calibration": calibration_table(y_true, y_score),
    }
