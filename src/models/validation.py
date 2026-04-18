"""
Entity-level temporal cross-validation for PayPulse.

Two rules govern every validator-grade backtest:

  1. No entity (firm) may appear in both the train and test set.
     Otherwise the model memorises per-firm quirks; quoted generalisation
     is a mirage.

  2. Every test observation must be strictly in the future of every train
     observation for that firm. Otherwise the model sees post-event data
     that would not be available at inference time.

This module provides `entity_temporal_split` (single split),
`walk_forward_splits` (expanding-window sequence of splits), and
`evaluate_classifier` (a thin harness that runs a sklearn-style classifier
through either split type and returns the honest metric bundle).
"""

from __future__ import annotations

from typing import Iterator
import numpy as np
import pandas as pd

from src.models.metrics import full_classification_report


def entity_temporal_split(
    df: pd.DataFrame,
    entity_col: str = "company_id",
    time_col: str = "week_number",
    test_entity_frac: float = 0.25,
    test_time_from: int | None = None,
    seed: int = 0,
) -> tuple[pd.DataFrame, pd.DataFrame]:
    """
    Split by (a) holding out a fraction of entities entirely and
    (b) restricting test rows to weeks >= `test_time_from`.

    Both constraints active simultaneously gives a proper out-of-entity,
    out-of-time test set.

    Args:
        df: input frame with entity and time columns.
        entity_col: column identifying the firm.
        time_col: integer-valued time column (week number).
        test_entity_frac: fraction of entities held out.
        test_time_from: minimum week_number for a row to be eligible for
            the test set. If None, uses the median week.
        seed: RNG seed for entity sampling.

    Returns:
        (train_df, test_df)
    """
    rng = np.random.default_rng(seed)
    entities = df[entity_col].unique()
    n_test = max(1, int(np.ceil(len(entities) * test_entity_frac)))
    test_entities = set(rng.choice(entities, size=n_test, replace=False))

    if test_time_from is None:
        test_time_from = int(df[time_col].median())

    train_mask = (~df[entity_col].isin(test_entities)) & (df[time_col] < test_time_from)
    test_mask = df[entity_col].isin(test_entities) & (df[time_col] >= test_time_from)

    return df.loc[train_mask].copy(), df.loc[test_mask].copy()


def walk_forward_splits(
    df: pd.DataFrame,
    entity_col: str = "company_id",
    time_col: str = "week_number",
    n_folds: int = 4,
    test_entity_frac: float = 0.25,
    seed: int = 0,
) -> Iterator[tuple[pd.DataFrame, pd.DataFrame]]:
    """
    Expanding-window walk-forward splits with disjoint test entities per fold.

    Yields n_folds (train_df, test_df) pairs where the test window advances
    forward in time and the held-out entity sample is independently drawn
    per fold.
    """
    rng = np.random.default_rng(seed)
    entities = df[entity_col].unique()
    min_w = int(df[time_col].min())
    max_w = int(df[time_col].max())
    fold_size = max(1, (max_w - min_w + 1) // (n_folds + 1))

    for fold in range(n_folds):
        test_start = min_w + (fold + 1) * fold_size
        test_end = min(max_w, test_start + fold_size - 1)
        n_test = max(1, int(np.ceil(len(entities) * test_entity_frac)))
        test_entities = set(rng.choice(entities, size=n_test, replace=False))

        train_mask = (~df[entity_col].isin(test_entities)) & (df[time_col] < test_start)
        test_mask = (
            df[entity_col].isin(test_entities)
            & (df[time_col] >= test_start)
            & (df[time_col] <= test_end)
        )
        train_df = df.loc[train_mask].copy()
        test_df = df.loc[test_mask].copy()
        if len(train_df) == 0 or len(test_df) == 0:
            continue
        yield train_df, test_df


def evaluate_classifier(
    model,
    train_df: pd.DataFrame,
    test_df: pd.DataFrame,
    feature_cols: list[str],
    label_col: str,
    fit: bool = True,
) -> dict:
    """
    Fit (optional) and evaluate a sklearn-style classifier using honest
    metrics. The model must expose `fit(X, y)` and `predict_proba(X)`.

    The positive-class probability is taken as the second column of
    `predict_proba` output. Rows where `label_col` is NaN are dropped
    from both train and test.
    """
    train_df = train_df.dropna(subset=[label_col])
    test_df = test_df.dropna(subset=[label_col])

    X_train = train_df[feature_cols].values
    y_train = train_df[label_col].astype(int).values
    X_test = test_df[feature_cols].values
    y_test = test_df[label_col].astype(int).values

    if fit:
        model.fit(X_train, y_train)

    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X_test)
        y_score = proba[:, 1] if proba.shape[1] > 1 else proba[:, 0]
    else:
        y_score = model.predict(X_test).astype(float)

    return {
        "train_size": int(len(train_df)),
        "test_size": int(len(test_df)),
        "metrics": full_classification_report(y_test, y_score),
    }


def aggregate_fold_metrics(fold_results: list[dict]) -> dict:
    """Aggregate walk-forward fold metrics into mean ± std bundle."""
    if not fold_results:
        return {}
    keys = [
        "auc_roc", "ks_statistic", "brier_score",
        "precision_at_1pct", "precision_at_5pct", "precision_at_10pct",
        "lift_at_decile",
    ]
    agg = {}
    for k in keys:
        vals = [f["metrics"][k] for f in fold_results if k in f.get("metrics", {})]
        if not vals:
            continue
        agg[k] = {
            "mean": round(float(np.mean(vals)), 4),
            "std": round(float(np.std(vals)), 4),
            "min": round(float(np.min(vals)), 4),
            "max": round(float(np.max(vals)), 4),
        }
    agg["n_folds"] = len(fold_results)
    return agg
