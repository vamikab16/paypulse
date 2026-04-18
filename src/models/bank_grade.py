"""
Bank-grade benchmark harness: the single source of truth for every metric
we show to a validator, regulator, or credit committee.

Pipeline:
  1. Generate a 50-firm synthetic portfolio (src.data.portfolio).
  2. Attach forward-looking distress labels (src.data.labels).
  3. Engineer features per (firm, supplier, week).
  4. Run entity-level temporal cross-validation (src.models.validation):
       - firms held out are disjoint between train and test
       - test rows strictly in weeks > train weeks
  5. Emit a full honest metric report (AUC / KS / Brier / P@k / lift /
     calibration).

The result is cached at module level so the FastAPI process only pays
for it once at startup. Downstream endpoints re-read the cached artefact.
"""

from __future__ import annotations

import os
from datetime import datetime, timezone

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

from src.data.portfolio import generate_portfolio, portfolio_summary
from src.data.labels import forward_distress_label, DEFAULT_FORWARD_HORIZON_WEEKS
from src.models.validation import walk_forward_splits, evaluate_classifier, aggregate_fold_metrics


BANK_GRADE_FEATURES = [
    "delay_mean_4w", "delay_std_4w", "delay_range_4w",
    "delay_mean_8w", "delay_std_8w",
    "trend_slope_6w", "wow_change", "acceleration",
    "delay_to_terms_ratio",
    "invoice_volatility",
    "cross_supplier_std", "cross_supplier_spread",
]


def _engineer_leakage_safe_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Build features at (company_id, supplier_id, week_number) granularity
    using only information available strictly up to and including week t.

    Deliberately OMITS `excess_over_terms` because that is what the forward
    label is derived from downstream and would re-introduce leakage.
    """
    rows = []
    group_cols = ["company_id", "supplier_id"]
    for (cid, sid), grp in df.groupby(group_cols, sort=False):
        grp = grp.sort_values("week_number").reset_index(drop=True)
        delays = grp["payment_delay_days"].to_numpy(dtype=float)
        invoices = grp["invoice_amount"].to_numpy(dtype=float)
        terms = float(grp["contractual_terms_days"].iloc[0])
        for i in range(len(grp)):
            w = int(grp["week_number"].iloc[i])
            win4 = delays[max(0, i - 3):i + 1]
            win8 = delays[max(0, i - 7):i + 1]
            lookback = delays[max(0, i - 5):i + 1]
            if len(lookback) >= 3:
                x = np.arange(len(lookback))
                slope = float(np.polyfit(x, lookback, 1)[0])
            else:
                slope = 0.0
            wow = float(delays[i] - delays[i - 1]) if i > 0 else 0.0
            if i >= 2:
                accel = float((delays[i] - delays[i - 1]) - (delays[i - 1] - delays[i - 2]))
            else:
                accel = 0.0
            inv_win = invoices[max(0, i - 4):i + 1]
            rows.append({
                "company_id": cid,
                "supplier_id": sid,
                "week_number": w,
                "delay_mean_4w": float(np.mean(win4)),
                "delay_std_4w": float(np.std(win4)) if len(win4) > 1 else 0.0,
                "delay_range_4w": float(np.max(win4) - np.min(win4)),
                "delay_mean_8w": float(np.mean(win8)),
                "delay_std_8w": float(np.std(win8)) if len(win8) > 1 else 0.0,
                "trend_slope_6w": slope,
                "wow_change": wow,
                "acceleration": accel,
                "delay_to_terms_ratio": float(delays[i] / max(terms, 1.0)),
                "invoice_volatility": float(np.std(inv_win)) if len(inv_win) > 1 else 0.0,
                "payment_delay_days": float(delays[i]),
                "contractual_terms_days": terms,
            })
    feats = pd.DataFrame(rows)

    spread = (
        df.groupby(["company_id", "week_number"])["payment_delay_days"]
        .agg(["std", "max", "min"])
        .reset_index()
    )
    spread["cross_supplier_std"] = spread["std"].fillna(0.0)
    spread["cross_supplier_spread"] = (spread["max"] - spread["min"]).fillna(0.0)
    spread = spread[["company_id", "week_number", "cross_supplier_std", "cross_supplier_spread"]]
    feats = feats.merge(spread, on=["company_id", "week_number"], how="left")
    return feats


_CACHE: dict = {}


def run_bank_grade_benchmark(
    n_companies: int = 50,
    n_weeks: int = 52,
    seed: int = 17,
    horizon_weeks: int = DEFAULT_FORWARD_HORIZON_WEEKS,
    force: bool = False,
) -> dict:
    """
    Run the full honest benchmark and cache the artefact.

    Returns a dict with:
        generated_at, portfolio_summary, label_summary,
        per_fold (list of fold metrics),
        aggregated (mean/std across folds),
        holdout (single held-out split for display),
        model_card (feature list, model spec, caveats).
    """
    if _CACHE and not force:
        return _CACHE

    payments, firms = generate_portfolio(n_companies=n_companies, n_weeks=n_weeks, seed=seed)
    labeled = forward_distress_label(payments, horizon_weeks=horizon_weeks)
    labeled = labeled[labeled["y_future_distress_valid"]].copy()

    feats = _engineer_leakage_safe_features(labeled)
    label_col_df = labeled[["company_id", "supplier_id", "week_number", "y_future_distress"]]
    data = feats.merge(label_col_df, on=["company_id", "supplier_id", "week_number"], how="inner")

    fold_results = []
    for train_df, test_df in walk_forward_splits(
        data, entity_col="company_id", time_col="week_number", n_folds=3,
        test_entity_frac=0.25, seed=seed,
    ):
        model = RandomForestClassifier(
            n_estimators=200, max_depth=6, min_samples_leaf=5,
            class_weight="balanced", random_state=seed, n_jobs=-1,
        )
        fold = evaluate_classifier(
            model, train_df, test_df, BANK_GRADE_FEATURES, "y_future_distress", fit=True,
        )
        fold_results.append(fold)

    agg = aggregate_fold_metrics(fold_results)

    holdout = None
    if fold_results:
        holdout = fold_results[-1]

    label_summary = {
        "horizon_weeks": int(horizon_weeks),
        "n_observations_valid": int(len(labeled)),
        "n_positive": int(labeled["y_future_distress"].sum()),
        "base_rate_pct": round(100.0 * float(labeled["y_future_distress"].mean()), 2),
    }

    artefact = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "portfolio_summary": portfolio_summary(firms),
        "label_summary": label_summary,
        "per_fold": fold_results,
        "aggregated": agg,
        "holdout": holdout,
        "model_card": {
            "model_id": "paypulse-risk-clf-v2",
            "task": "binary-classification",
            "target": f"forward_distress_within_{horizon_weeks}w",
            "features": BANK_GRADE_FEATURES,
            "algorithm": "RandomForestClassifier(n=200, depth=6, class_weight=balanced)",
            "validation": "entity-level walk-forward CV, 3 folds, 25% firms held out per fold",
            "leakage_controls": [
                "excess_over_terms feature removed (derivable from label)",
                "payment_status feature removed (bucketed label)",
                "forward label computed strictly from weeks > t",
                "disjoint firm IDs between train and test",
            ],
            "known_limitations": [
                "synthetic training data; not yet validated on real SME book",
                "no fairness / subgroup analysis yet",
                "no calibration fitting (Platt / isotonic) — probabilities may be uncalibrated",
                "single algorithm, no challenger suite",
            ],
        },
    }

    _CACHE.update(artefact)
    return artefact


def get_cached_benchmark() -> dict:
    """Return the cached benchmark, running it lazily if needed."""
    if not _CACHE:
        run_bank_grade_benchmark()
    return _CACHE
