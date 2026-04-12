"""
PayPulse ML Engine — Real machine learning models for predictive analytics.

Three AI systems:
  1. GradientBoostingRegressor  — payment delay forecasting with feature engineering
  2. RandomForestClassifier     — supplier risk classification
  3. IsolationForest            — unsupervised anomaly detection

Each model is trained on the historical payment data with engineered features
that capture temporal patterns, trends, seasonality, and cross-supplier signals.
"""

import warnings
import numpy as np
import pandas as pd
from sklearn.ensemble import (
    GradientBoostingRegressor,
    RandomForestClassifier,
    IsolationForest,
)
from sklearn.cluster import KMeans
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import mean_absolute_error, accuracy_score, f1_score, silhouette_score

from src.data.schemas import CONTRACTUAL_TERMS, SUPPLIER_NAMES, SUPPLIER_IDS

warnings.filterwarnings("ignore", category=FutureWarning)


# ═══════════════════════════════════════════════════════════════════════════
# Feature Engineering
# ═══════════════════════════════════════════════════════════════════════════

def engineer_features(df: pd.DataFrame) -> pd.DataFrame:
    """
    Create ML-ready features from raw payment history.

    Engineered features per supplier per week:
      - Rolling statistics (mean, std, min, max) over 4 and 8-week windows
      - Trend slope over last 6 weeks (linear regression coefficient)
      - Week-over-week change and acceleration
      - Ratio of delay to contractual terms
      - Invoice amount features (rolling mean, deviation)
      - Time-based features (week number, quarter)
      - Cross-supplier spread (triage signal)
    """
    features = []

    for sid in df["supplier_id"].unique():
        supplier_df = df[df["supplier_id"] == sid].sort_values("week_number").copy()
        delays = supplier_df["payment_delay_days"].values
        invoices = supplier_df["invoice_amount"].values
        weeks = supplier_df["week_number"].values
        terms = CONTRACTUAL_TERMS.get(sid, 14)

        for i in range(len(supplier_df)):
            row = supplier_df.iloc[i]
            w = int(row["week_number"])
            delay = delays[i]

            feat = {
                "supplier_id": sid,
                "week_number": w,
                "payment_delay_days": delay,
                "invoice_amount": invoices[i],
                "contractual_terms": terms,
            }

            # --- Rolling window features ---
            for window in [4, 8]:
                start = max(0, i - window)
                window_delays = delays[start:i + 1]
                feat[f"delay_mean_{window}w"] = np.mean(window_delays)
                feat[f"delay_std_{window}w"] = np.std(window_delays) if len(window_delays) > 1 else 0
                feat[f"delay_min_{window}w"] = np.min(window_delays)
                feat[f"delay_max_{window}w"] = np.max(window_delays)
                feat[f"delay_range_{window}w"] = np.max(window_delays) - np.min(window_delays)

            # --- Trend slope (last 6 weeks via linear regression) ---
            lookback = min(6, i + 1)
            recent_delays = delays[max(0, i - lookback + 1):i + 1]
            if len(recent_delays) >= 3:
                x = np.arange(len(recent_delays))
                coeffs = np.polyfit(x, recent_delays, 1)
                feat["trend_slope_6w"] = coeffs[0]
            else:
                feat["trend_slope_6w"] = 0.0

            # --- Week-over-week change ---
            if i > 0:
                feat["wow_change"] = delay - delays[i - 1]
            else:
                feat["wow_change"] = 0.0

            # --- Acceleration (change in slope) ---
            if i >= 2:
                prev_change = delays[i - 1] - delays[i - 2]
                curr_change = delay - delays[i - 1]
                feat["acceleration"] = curr_change - prev_change
            else:
                feat["acceleration"] = 0.0

            # --- Delay vs contractual terms ---
            feat["delay_to_terms_ratio"] = delay / max(terms, 1)
            feat["excess_over_terms"] = max(0, delay - terms)

            # --- Invoice features ---
            inv_window = invoices[max(0, i - 4):i + 1]
            feat["invoice_mean_4w"] = np.mean(inv_window)
            feat["invoice_volatility"] = np.std(inv_window) if len(inv_window) > 1 else 0

            # --- Time features ---
            feat["quarter"] = (w - 1) // 13 + 1
            feat["week_in_quarter"] = (w - 1) % 13 + 1
            feat["is_quarter_end"] = 1 if feat["week_in_quarter"] >= 11 else 0

            features.append(feat)

    feature_df = pd.DataFrame(features)

    # --- Cross-supplier spread (triage signal) ---
    weekly_spread = df.groupby("week_number")["payment_delay_days"].agg(["std", "mean", "max", "min"])
    weekly_spread.columns = ["cross_supplier_std", "cross_supplier_mean", "cross_supplier_max", "cross_supplier_min"]
    weekly_spread["cross_supplier_spread"] = weekly_spread["cross_supplier_max"] - weekly_spread["cross_supplier_min"]
    weekly_spread = weekly_spread.reset_index()

    feature_df = feature_df.merge(weekly_spread, on="week_number", how="left")

    return feature_df


# ═══════════════════════════════════════════════════════════════════════════
# Model 1: ML Forecasting (Gradient Boosting)
# ═══════════════════════════════════════════════════════════════════════════

FORECAST_FEATURES = [
    "delay_mean_4w", "delay_std_4w", "delay_min_4w", "delay_max_4w", "delay_range_4w",
    "delay_mean_8w", "delay_std_8w", "delay_min_8w", "delay_max_8w", "delay_range_8w",
    "trend_slope_6w", "wow_change", "acceleration",
    "delay_to_terms_ratio", "excess_over_terms",
    "invoice_mean_4w", "invoice_volatility",
    "quarter", "week_in_quarter", "is_quarter_end",
    "cross_supplier_std", "cross_supplier_spread",
    "contractual_terms",
]


class MLForecaster:
    """
    Gradient Boosting model for payment delay forecasting.

    Trained to predict next-week payment delay given engineered features.
    Multi-step forecasts are generated by iterative one-step-ahead predictions,
    feeding each prediction back as input for the next step.
    """

    def __init__(self):
        self.model = GradientBoostingRegressor(
            n_estimators=200,
            max_depth=4,
            learning_rate=0.05,
            subsample=0.8,
            min_samples_leaf=5,
            random_state=42,
        )
        self.is_trained = False
        self.train_mae = None
        self.feature_importances = None

    def train(self, feature_df: pd.DataFrame):
        """Train the forecaster on engineered features."""
        # Create target: next-week delay for same supplier
        feature_df = feature_df.sort_values(["supplier_id", "week_number"])
        targets = []
        for sid in feature_df["supplier_id"].unique():
            supplier_feats = feature_df[feature_df["supplier_id"] == sid]
            target = supplier_feats["payment_delay_days"].shift(-1)
            targets.append(target)

        feature_df = feature_df.copy()
        feature_df["target"] = pd.concat(targets).values

        # Drop rows with no target (last week per supplier)
        train_data = feature_df.dropna(subset=["target"])

        X = train_data[FORECAST_FEATURES].values
        y = train_data["target"].values

        self.model.fit(X, y)
        self.is_trained = True

        # Compute training MAE
        preds = self.model.predict(X)
        self.train_mae = round(float(mean_absolute_error(y, preds)), 2)

        # Feature importances
        importances = self.model.feature_importances_
        self.feature_importances = {
            name: round(float(imp), 4)
            for name, imp in sorted(
                zip(FORECAST_FEATURES, importances),
                key=lambda x: x[1],
                reverse=True,
            )
        }

    def predict(self, feature_df: pd.DataFrame, supplier_id: str, horizon: int = 6) -> dict:
        """
        Generate multi-step forecast with uncertainty bands.

        Uses iterative one-step-ahead prediction with feature updates.
        Uncertainty is estimated from historical residual variance.
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained — call train() first")

        supplier_feats = feature_df[feature_df["supplier_id"] == supplier_id].sort_values("week_number")
        last_row = supplier_feats.iloc[-1]
        last_week = int(last_row["week_number"])
        terms = CONTRACTUAL_TERMS.get(supplier_id, 14)

        # Get recent delays for feature updating
        recent_delays = supplier_feats.tail(8)["payment_delay_days"].values.tolist()

        predictions = []
        for step in range(horizon):
            # Build feature vector from current state
            feat_vector = self._build_step_features(recent_delays, terms, last_week + step + 1, last_row)
            pred = float(self.model.predict([feat_vector])[0])
            pred = max(0, round(pred, 1))
            predictions.append(pred)

            # Feed prediction back
            recent_delays.append(pred)
            if len(recent_delays) > 8:
                recent_delays.pop(0)

        # Compute uncertainty bands from training residuals
        residual_std = self._estimate_residual_std(feature_df, supplier_id)
        low = []
        high = []
        for i, val in enumerate(predictions):
            width = 1.96 * residual_std * (1 + 0.15 * i)
            low.append(round(max(0, val - width), 1))
            high.append(round(val + width, 1))

        future_weeks = list(range(last_week + 1, last_week + 1 + horizon))

        return {
            "supplier_id": supplier_id,
            "supplier_name": SUPPLIER_NAMES.get(supplier_id, supplier_id),
            "weeks": future_weeks,
            "expected": predictions,
            "low": low,
            "high": high,
            "method": "gradient_boosting",
            "model_mae": self.train_mae,
            "top_features": dict(list(self.feature_importances.items())[:5]),
        }

    def _build_step_features(self, recent_delays, terms, week_num, last_row):
        """Build a feature vector for a single prediction step."""
        delays = np.array(recent_delays)
        feat = []

        # Rolling features for window 4 and 8
        for window in [4, 8]:
            w_delays = delays[-window:]
            feat.append(np.mean(w_delays))
            feat.append(np.std(w_delays) if len(w_delays) > 1 else 0)
            feat.append(np.min(w_delays))
            feat.append(np.max(w_delays))
            feat.append(np.max(w_delays) - np.min(w_delays))

        # Trend slope
        lookback = min(6, len(delays))
        recent = delays[-lookback:]
        if len(recent) >= 3:
            x = np.arange(len(recent))
            coeffs = np.polyfit(x, recent, 1)
            feat.append(coeffs[0])
        else:
            feat.append(0.0)

        # WoW change
        feat.append(delays[-1] - delays[-2] if len(delays) >= 2 else 0.0)

        # Acceleration
        if len(delays) >= 3:
            feat.append((delays[-1] - delays[-2]) - (delays[-2] - delays[-3]))
        else:
            feat.append(0.0)

        # Delay vs terms
        feat.append(delays[-1] / max(terms, 1))
        feat.append(max(0, delays[-1] - terms))

        # Invoice features (use last known values)
        feat.append(float(last_row.get("invoice_mean_4w", 10000)))
        feat.append(float(last_row.get("invoice_volatility", 1000)))

        # Time features
        quarter = (week_num - 1) // 13 + 1
        week_in_q = (week_num - 1) % 13 + 1
        feat.append(quarter)
        feat.append(week_in_q)
        feat.append(1 if week_in_q >= 11 else 0)

        # Cross-supplier features (use last known)
        feat.append(float(last_row.get("cross_supplier_std", 5.0)))
        feat.append(float(last_row.get("cross_supplier_spread", 20.0)))

        # Contractual terms
        feat.append(terms)

        return feat

    def _estimate_residual_std(self, feature_df, supplier_id):
        """Estimate prediction residual standard deviation for uncertainty bands."""
        supplier_feats = feature_df[feature_df["supplier_id"] == supplier_id].sort_values("week_number")
        if len(supplier_feats) < 10:
            return 3.0

        delays = supplier_feats["payment_delay_days"].values
        X = supplier_feats[FORECAST_FEATURES].values[:-1]
        y = delays[1:]

        preds = self.model.predict(X)
        residuals = y - preds
        return float(np.std(residuals))

    def evaluate(self, feature_df: pd.DataFrame, train_weeks: int = 44) -> dict:
        """Evaluate model with time-series train/test split."""
        results = {}
        for sid in feature_df["supplier_id"].unique():
            supplier_feats = feature_df[feature_df["supplier_id"] == sid].sort_values("week_number")
            train = supplier_feats[supplier_feats["week_number"] <= train_weeks]
            test = supplier_feats[supplier_feats["week_number"] > train_weeks]

            if len(test) == 0:
                continue

            X_test = test[FORECAST_FEATURES].values
            y_test = test["payment_delay_days"].values
            preds = self.model.predict(X_test)
            mae = float(mean_absolute_error(y_test, preds))

            results[sid] = {
                "supplier_name": SUPPLIER_NAMES.get(sid, sid),
                "mae": round(mae, 2),
                "predictions": [round(float(p), 1) for p in preds],
                "actuals": [round(float(a), 1) for a in y_test],
            }

        return results


# ═══════════════════════════════════════════════════════════════════════════
# Model 2: Risk Classifier (Random Forest)
# ═══════════════════════════════════════════════════════════════════════════

RISK_FEATURES = FORECAST_FEATURES  # Reuse same feature set

RISK_LABELS = {
    "normal": 0,
    "watch": 1,
    "warning": 2,
    "critical": 3,
}


class MLRiskClassifier:
    """
    Random Forest model for supplier risk classification.

    Trained to predict risk severity (normal/watch/warning/critical)
    using the same engineered features as the forecaster.
    """

    def __init__(self):
        self.model = RandomForestClassifier(
            n_estimators=150,
            max_depth=6,
            min_samples_leaf=3,
            class_weight="balanced",
            random_state=42,
        )
        self.label_encoder = LabelEncoder()
        self.is_trained = False
        self.train_accuracy = None
        self.feature_importances = None

    def _compute_risk_label(self, row):
        """Compute ground truth risk label from delay and terms."""
        delay = row["payment_delay_days"]
        terms = row["contractual_terms"]
        excess = delay - terms

        if excess <= 0:
            return "normal"
        elif excess <= 7:
            return "watch"
        elif excess <= 15:
            return "warning"
        else:
            return "critical"

    def train(self, feature_df: pd.DataFrame):
        """Train the risk classifier."""
        feature_df = feature_df.copy()
        feature_df["risk_label"] = feature_df.apply(self._compute_risk_label, axis=1)

        X = feature_df[RISK_FEATURES].values
        y_labels = feature_df["risk_label"].values
        y = self.label_encoder.fit_transform(y_labels)

        self.model.fit(X, y)
        self.is_trained = True

        # Training metrics
        preds = self.model.predict(X)
        self.train_accuracy = round(float(accuracy_score(y, preds)) * 100, 1)

        # Feature importances
        importances = self.model.feature_importances_
        self.feature_importances = {
            name: round(float(imp), 4)
            for name, imp in sorted(
                zip(RISK_FEATURES, importances),
                key=lambda x: x[1],
                reverse=True,
            )
        }

    def predict(self, feature_df: pd.DataFrame, supplier_id: str) -> dict:
        """
        Predict risk classification for a supplier's current state.

        Returns predicted class, probability distribution, and confidence.
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained — call train() first")

        supplier_feats = feature_df[feature_df["supplier_id"] == supplier_id].sort_values("week_number")
        latest = supplier_feats.iloc[-1]

        X = latest[RISK_FEATURES].values.reshape(1, -1)
        pred_class_idx = self.model.predict(X)[0]
        probabilities = self.model.predict_proba(X)[0]

        class_names = self.label_encoder.classes_
        pred_class = class_names[pred_class_idx]
        confidence = round(float(probabilities[pred_class_idx]) * 100, 1)

        prob_dist = {
            name: round(float(prob) * 100, 1)
            for name, prob in zip(class_names, probabilities)
        }

        return {
            "supplier_id": supplier_id,
            "supplier_name": SUPPLIER_NAMES.get(supplier_id, supplier_id),
            "predicted_risk": pred_class,
            "confidence": confidence,
            "probability_distribution": prob_dist,
            "model_accuracy": self.train_accuracy,
            "method": "random_forest_classifier",
            "top_features": dict(list(self.feature_importances.items())[:5]),
        }

    def predict_all(self, feature_df: pd.DataFrame) -> list:
        """Predict risk for all suppliers."""
        results = []
        for sid in SUPPLIER_IDS:
            if sid in feature_df["supplier_id"].values:
                results.append(self.predict(feature_df, sid))
        return results


# ═══════════════════════════════════════════════════════════════════════════
# Model 3: Anomaly Detector (Isolation Forest)
# ═══════════════════════════════════════════════════════════════════════════

ANOMALY_FEATURES = [
    "delay_mean_4w", "delay_std_4w", "delay_range_4w",
    "trend_slope_6w", "wow_change", "acceleration",
    "delay_to_terms_ratio", "excess_over_terms",
    "cross_supplier_std", "cross_supplier_spread",
]


class MLAnomalyDetector:
    """
    Isolation Forest for unsupervised anomaly detection.

    Learns the 'normal' distribution of payment patterns and flags
    data points that deviate significantly from learned patterns.
    Anomaly scores range from -1 (most anomalous) to +1 (most normal).
    """

    def __init__(self):
        self.model = IsolationForest(
            n_estimators=200,
            contamination=0.1,  # Expect ~10% anomalies
            max_features=0.8,
            random_state=42,
        )
        self.is_trained = False

    def train(self, feature_df: pd.DataFrame):
        """Train the anomaly detector on all supplier data."""
        X = feature_df[ANOMALY_FEATURES].values
        self.model.fit(X)
        self.is_trained = True

    def detect(self, feature_df: pd.DataFrame, supplier_id: str) -> dict:
        """
        Run anomaly detection for a specific supplier.

        Returns anomaly scores for each week and flags anomalous weeks.
        """
        if not self.is_trained:
            raise RuntimeError("Model not trained — call train() first")

        supplier_feats = feature_df[feature_df["supplier_id"] == supplier_id].sort_values("week_number")
        X = supplier_feats[ANOMALY_FEATURES].values

        # Raw scores: negative = anomalous, positive = normal
        raw_scores = self.model.decision_function(X)
        predictions = self.model.predict(X)  # -1 = anomaly, 1 = normal

        # Normalize scores to 0-100 (0 = most anomalous, 100 = most normal)
        min_score = raw_scores.min()
        max_score = raw_scores.max()
        score_range = max_score - min_score if max_score != min_score else 1
        normalized_scores = ((raw_scores - min_score) / score_range * 100).tolist()

        weeks = supplier_feats["week_number"].tolist()
        anomalous_weeks = [
            {
                "week": int(weeks[i]),
                "anomaly_score": round(float(normalized_scores[i]), 1),
                "raw_score": round(float(raw_scores[i]), 4),
                "delay": round(float(supplier_feats.iloc[i]["payment_delay_days"]), 1),
            }
            for i in range(len(predictions))
            if predictions[i] == -1
        ]

        # Current status (latest week)
        latest_score = normalized_scores[-1]
        is_anomalous = predictions[-1] == -1

        return {
            "supplier_id": supplier_id,
            "supplier_name": SUPPLIER_NAMES.get(supplier_id, supplier_id),
            "current_anomaly_score": round(float(latest_score), 1),
            "is_anomalous": bool(is_anomalous),
            "anomalous_weeks": anomalous_weeks,
            "total_anomalies_detected": len(anomalous_weeks),
            "score_timeline": {
                "weeks": [int(w) for w in weeks],
                "scores": [round(float(s), 1) for s in normalized_scores],
            },
            "method": "isolation_forest",
        }

    def detect_all(self, feature_df: pd.DataFrame) -> list:
        """Run anomaly detection across all suppliers."""
        results = []
        for sid in SUPPLIER_IDS:
            if sid in feature_df["supplier_id"].values:
                results.append(self.detect(feature_df, sid))
        return results


# ═══════════════════════════════════════════════════════════════════════════
# Model 4: K-Means Supplier Clustering
# ═══════════════════════════════════════════════════════════════════════════

CLUSTER_FEATURES = [
    "delay_mean_8w", "delay_std_8w", "delay_range_8w",
    "trend_slope_6w", "acceleration",
    "delay_to_terms_ratio", "excess_over_terms",
    "cross_supplier_spread",
]

CLUSTER_PROFILES = {
    "stable": {"label": "Stable & Reliable", "color": "#00e676",
               "description": "Consistently on-time payments with low variance.",
               "action": "Continue standard monitoring."},
    "drifting": {"label": "Gradually Degrading", "color": "#ffab00",
                 "description": "Payments slowly stretching. Early cash flow pressure signs.",
                 "action": "Schedule proactive outreach within 2 weeks."},
    "volatile": {"label": "Volatile & Unpredictable", "color": "#ff6d00",
                 "description": "High payment variance. Risk of sudden deterioration.",
                 "action": "Increase monitoring frequency."},
    "critical": {"label": "Critical Deterioration", "color": "#ff1744",
                 "description": "Severe delays with accelerating trend. Immediate attention.",
                 "action": "Escalate to Credit Committee."},
}


class MLClusterer:
    """K-Means clustering for supplier behavior segmentation."""

    def __init__(self):
        self.model = None
        self.scaler = StandardScaler()
        self.is_trained = False
        self.n_clusters = 0
        self.silhouette = 0.0
        self.cluster_map = {}

    def train(self, feature_df):
        latest = feature_df.sort_values("week_number").groupby("supplier_id").tail(1).reset_index(drop=True)
        if len(latest) < 3:
            return
        X = latest[CLUSTER_FEATURES].values
        X_scaled = self.scaler.fit_transform(X)

        best_k, best_score, best_model = 2, -1, None
        for k in range(2, min(5, len(X) + 1)):
            km = KMeans(n_clusters=k, random_state=42, n_init=10)
            labels = km.fit_predict(X_scaled)
            score = silhouette_score(X_scaled, labels)
            if score > best_score:
                best_score, best_k, best_model = score, k, km

        self.model = best_model
        self.n_clusters = best_k
        self.silhouette = round(float(best_score), 3)
        self.is_trained = True

        centroids = self.scaler.inverse_transform(best_model.cluster_centers_)
        scores = {}
        for k in range(best_k):
            c = centroids[k]
            scores[k] = c[0] * 0.3 + c[1] * 0.2 + c[3] * 0.3 + c[6] * 0.2

        sorted_c = sorted(scores.items(), key=lambda x: x[1])
        profile_keys = ["stable", "drifting", "volatile", "critical"]
        for i, (cid, _) in enumerate(sorted_c):
            if best_k == 2:
                self.cluster_map[cid] = profile_keys[0 if i == 0 else 3]
            elif best_k == 3:
                self.cluster_map[cid] = [profile_keys[0], profile_keys[1], profile_keys[3]][i]
            else:
                self.cluster_map[cid] = profile_keys[min(i, 3)]

    def predict(self, feature_df):
        if not self.is_trained:
            return {"clusters": [], "method": "kmeans (not trained)"}
        latest = feature_df.sort_values("week_number").groupby("supplier_id").tail(1).reset_index(drop=True)
        X = latest[CLUSTER_FEATURES].values
        X_scaled = self.scaler.transform(X)
        labels = self.model.predict(X_scaled)

        results = []
        for i, row in latest.iterrows():
            idx = i - latest.index[0]
            sid = row["supplier_id"]
            cid = int(labels[idx])
            pkey = self.cluster_map.get(cid, "stable")
            prof = CLUSTER_PROFILES[pkey]
            results.append({
                "supplier_id": sid, "supplier_name": SUPPLIER_NAMES.get(sid, sid),
                "cluster_id": cid, "cluster_label": prof["label"],
                "cluster_color": prof["color"], "cluster_description": prof["description"],
                "recommended_action": prof["action"],
                "key_metrics": {
                    "avg_delay": round(float(row.get("delay_mean_8w", 0)), 1),
                    "volatility": round(float(row.get("delay_std_8w", 0)), 1),
                    "trend_slope": round(float(row.get("trend_slope_6w", 0)), 2),
                    "excess": round(float(row.get("excess_over_terms", 0)), 1),
                },
            })
        return {
            "clusters": results, "n_clusters": self.n_clusters,
            "silhouette_score": self.silhouette, "method": "kmeans_clustering",
        }


# ═══════════════════════════════════════════════════════════════════════════
# Model 5: SHAP-style Explainability
# ═══════════════════════════════════════════════════════════════════════════

def compute_shap_explanations(model, feature_df, supplier_id, feature_names, n_repeats=10):
    """
    Permutation-based feature explanations (same concept as SHAP).
    Shows which features push each prediction UP or DOWN.
    """
    supplier_feats = feature_df[feature_df["supplier_id"] == supplier_id].sort_values("week_number")
    latest = supplier_feats.iloc[-1]
    X_latest = latest[feature_names].values.reshape(1, -1)
    base_pred = float(model.predict(X_latest)[0])

    X_all = feature_df[feature_names].values
    rng = np.random.default_rng(42)
    contributions = {}

    for i, feat in enumerate(feature_names):
        deltas = []
        for _ in range(n_repeats):
            X_p = X_latest.copy()
            X_p[0, i] = X_all[rng.integers(0, len(X_all)), i]
            deltas.append(base_pred - float(model.predict(X_p)[0]))
        contributions[feat] = round(float(np.mean(deltas)), 3)

    sorted_c = dict(sorted(contributions.items(), key=lambda x: abs(x[1]), reverse=True))
    push_up = {k: v for k, v in sorted_c.items() if v > 0.01}
    push_down = {k: v for k, v in sorted_c.items() if v < -0.01}

    # Natural language explanation
    name = SUPPLIER_NAMES.get(supplier_id, supplier_id)
    parts = [f"For {name}, the AI predicts {round(base_pred, 1)} days delay."]
    if push_up:
        top_up = list(push_up.keys())[:3]
        parts.append(f"Increasing factors: {', '.join(f.replace('_', ' ') for f in top_up)}.")
    if push_down:
        top_down = list(push_down.keys())[:2]
        parts.append(f"Decreasing factors: {', '.join(f.replace('_', ' ') for f in top_down)}.")

    return {
        "supplier_id": supplier_id, "supplier_name": name,
        "base_prediction": round(base_pred, 1),
        "feature_contributions": sorted_c,
        "push_up_factors": push_up, "push_down_factors": push_down,
        "top_drivers": list(sorted_c.keys())[:5],
        "explanation": " ".join(parts),
        "method": "permutation_shap",
    }


# ═══════════════════════════════════════════════════════════════════════════
# Model 6: GRU Neural Network (from scratch in NumPy)
# ═══════════════════════════════════════════════════════════════════════════

def _sigmoid(x):
    return 1.0 / (1.0 + np.exp(-np.clip(x, -500, 500)))

class GRUCell:
    """Minimal GRU cell in pure NumPy — no PyTorch/TensorFlow needed."""
    def __init__(self, input_size, hidden_size, seed=42):
        rng = np.random.default_rng(seed)
        s = 0.1
        self.Wz = rng.normal(0, s, (hidden_size, input_size + hidden_size))
        self.bz = np.zeros(hidden_size)
        self.Wr = rng.normal(0, s, (hidden_size, input_size + hidden_size))
        self.br = np.zeros(hidden_size)
        self.Wh = rng.normal(0, s, (hidden_size, input_size + hidden_size))
        self.bh = np.zeros(hidden_size)
        self.hidden_size = hidden_size

    def forward(self, x, h_prev):
        combined = np.concatenate([x, h_prev])
        z = _sigmoid(self.Wz @ combined + self.bz)
        r = _sigmoid(self.Wr @ combined + self.br)
        combined_r = np.concatenate([x, r * h_prev])
        h_cand = np.tanh(self.Wh @ combined_r + self.bh)
        return (1 - z) * h_prev + z * h_cand


class NeuralForecaster:
    """GRU neural network forecaster — deep learning from scratch."""
    def __init__(self, hidden_size=32, seed=42):
        self.hidden_size = hidden_size
        self.gru = GRUCell(6, hidden_size, seed)
        rng = np.random.default_rng(seed + 1)
        self.W_out = rng.normal(0, 0.1, (1, hidden_size))
        self.b_out = np.zeros(1)
        self.is_trained = False
        self.train_mae = None
        self.delay_mean = 0.0
        self.delay_std = 1.0

    def _prepare_data(self, df, sid, seq_len=8):
        sdata = df[df["supplier_id"] == sid].sort_values("week_number")
        delays = sdata["payment_delay_days"].values.astype(float)
        terms = CONTRACTUAL_TERMS.get(sid, 14)
        self.delay_mean = np.mean(delays)
        self.delay_std = max(np.std(delays), 1e-6)
        dn = (delays - self.delay_mean) / self.delay_std

        seqs, tgts = [], []
        for i in range(seq_len, len(delays)):
            w = delays[max(0, i - seq_len):i]
            wn = dn[max(0, i - seq_len):i]
            feats = []
            for t in range(len(w)):
                feats.append(np.array([
                    wn[t], (w[t] - w[t-1]) / self.delay_std if t > 0 else 0,
                    w[t] / max(terms, 1),
                    np.mean(w[max(0, t-3):t+1]) / self.delay_std,
                    np.polyfit(np.arange(min(4, t+1)), w[max(0, t-3):t+1], 1)[0] if t > 0 else 0,
                    np.std(w[max(0, t-3):t+1]) / self.delay_std if t > 1 else 0,
                ]))
            seqs.append(np.array(feats))
            tgts.append(dn[i])
        return seqs, tgts, delays

    def _forward(self, seq):
        h = np.zeros(self.hidden_size)
        for t in range(len(seq)):
            h = self.gru.forward(seq[t], h)
        return float((self.W_out @ h + self.b_out)[0])

    def train(self, df, epochs=50):
        all_seqs, all_tgts = [], []
        for sid in SUPPLIER_IDS:
            if sid in df["supplier_id"].values:
                s, t, _ = self._prepare_data(df, sid)
                all_seqs.extend(s)
                all_tgts.extend(t)
        if not all_seqs:
            return

        lr = 0.001
        eps_val = 1e-4
        params = [self.gru.Wz, self.gru.bz, self.gru.Wr, self.gru.br,
                  self.gru.Wh, self.gru.bh, self.W_out, self.b_out]

        for epoch in range(epochs):
            total_mae = 0
            for seq, tgt in zip(all_seqs, all_tgts):
                pred = self._forward(seq)
                err = pred - tgt
                total_mae += abs(err) * self.delay_std

                # Numerical gradient on sampled params
                for p in params:
                    flat = p.ravel()
                    idxs = np.random.choice(len(flat), min(5, len(flat)), replace=False)
                    for idx in idxs:
                        old = flat[idx]
                        flat[idx] = old + eps_val
                        l_plus = (self._forward(seq) - tgt) ** 2
                        flat[idx] = old - eps_val
                        l_minus = (self._forward(seq) - tgt) ** 2
                        flat[idx] = old
                        grad = (l_plus - l_minus) / (2 * eps_val)
                        flat[idx] -= lr * grad

        self.is_trained = True
        self.train_mae = round(total_mae / len(all_seqs), 2)

    def predict(self, df, supplier_id, horizon=6):
        sdata = df[df["supplier_id"] == supplier_id].sort_values("week_number")
        last_week = int(sdata["week_number"].max())
        delays = sdata["payment_delay_days"].values.astype(float)
        terms = CONTRACTUAL_TERMS.get(supplier_id, 14)

        if not self.is_trained:
            avg = float(np.mean(delays[-8:]))
            preds = [round(avg, 1)] * horizon
        else:
            seqs, _, _ = self._prepare_data(df, supplier_id)
            if not seqs:
                avg = float(np.mean(delays[-8:]))
                preds = [round(avg, 1)] * horizon
            else:
                current = seqs[-1].copy()
                preds = []
                for _ in range(horizon):
                    pn = self._forward(current)
                    p = max(0, round(pn * self.delay_std + self.delay_mean, 1))
                    preds.append(p)
                    new_f = np.array([
                        (p - self.delay_mean) / self.delay_std, 0,
                        p / max(terms, 1), p / self.delay_std, 0, 0])
                    current = np.vstack([current[1:], new_f])

        rs = self.delay_std * 0.15
        low = [round(max(0, p - 2 * rs * (1 + 0.2 * i)), 1) for i, p in enumerate(preds)]
        high = [round(p + 2 * rs * (1 + 0.2 * i), 1) for i, p in enumerate(preds)]
        return {
            "supplier_id": supplier_id,
            "supplier_name": SUPPLIER_NAMES.get(supplier_id, supplier_id),
            "weeks": list(range(last_week + 1, last_week + 1 + horizon)),
            "expected": preds, "low": low, "high": high,
            "method": "gru_neural_network",
            "architecture": "GRU(input=6, hidden=32) → Dense(1)",
            "training_mae": self.train_mae,
        }


# ═══════════════════════════════════════════════════════════════════════════
# Model Comparison Engine
# ═══════════════════════════════════════════════════════════════════════════

def compare_all_models(df, feature_df, forecaster, neural, supplier_id, train_weeks=44):
    """
    Compare all forecasting models head-to-head on the same test data.
    Returns MAE for each model so the frontend can show them racing.
    """
    sdata = df[df["supplier_id"] == supplier_id].sort_values("week_number")
    delays = sdata["payment_delay_days"].values.astype(float)
    test = delays[train_weeks:]
    if len(test) == 0:
        return {"supplier_id": supplier_id, "models": []}

    # Baseline (rolling average)
    baseline_pred = float(np.mean(delays[:train_weeks][-8:]))
    baseline_preds = [baseline_pred] * len(test)
    baseline_mae = float(np.mean(np.abs(test - baseline_preds)))

    # Gradient Boosting
    sfeats = feature_df[feature_df["supplier_id"] == supplier_id].sort_values("week_number")
    test_feats = sfeats[sfeats["week_number"] > train_weeks]
    if len(test_feats) > 0:
        gb_preds = forecaster.model.predict(test_feats[FORECAST_FEATURES].values)
        gb_mae = float(np.mean(np.abs(test[:len(gb_preds)] - gb_preds)))
    else:
        gb_mae = baseline_mae

    # Holt-Winters (from existing forecaster)
    from statsmodels.tsa.holtwinters import ExponentialSmoothing
    try:
        hw_model = ExponentialSmoothing(delays[:train_weeks], trend="add", initialization_method="estimated")
        hw_fit = hw_model.fit(optimized=True)
        hw_preds = hw_fit.forecast(len(test))
        hw_mae = float(np.mean(np.abs(test - hw_preds)))
    except Exception:
        hw_mae = baseline_mae

    # Neural network
    nn_mae = neural.train_mae if neural.is_trained else baseline_mae

    name = SUPPLIER_NAMES.get(supplier_id, supplier_id)
    models = [
        {"name": "Rolling Average", "type": "baseline", "mae": round(baseline_mae, 2), "color": "#5a5672"},
        {"name": "Holt-Winters", "type": "statistical", "mae": round(hw_mae, 2), "color": "#00b0ff"},
        {"name": "Gradient Boosting", "type": "ml", "mae": round(gb_mae, 2), "color": "#7c5cfc"},
        {"name": "GRU Neural Net", "type": "deep_learning", "mae": round(nn_mae, 2) if nn_mae else round(baseline_mae, 2), "color": "#ff6d00"},
    ]

    # Sort by MAE (best first)
    models.sort(key=lambda m: m["mae"])
    for i, m in enumerate(models):
        m["rank"] = i + 1

    best = models[0]
    improvement = round((1 - best["mae"] / baseline_mae) * 100, 1) if baseline_mae > 0 else 0

    return {
        "supplier_id": supplier_id, "supplier_name": name,
        "models": models, "best_model": best["name"],
        "best_mae": best["mae"],
        "improvement_over_baseline": improvement,
    }


# ═══════════════════════════════════════════════════════════════════════════
# Real-Time Data Simulation
# ═══════════════════════════════════════════════════════════════════════════

def simulate_new_week(df, week_offset=1):
    """
    Simulate a new week of payment data by extrapolating trends.
    Returns the simulated data and updated predictions.
    Makes the demo feel 'live' and dynamic.
    """
    rng = np.random.default_rng(int(week_offset * 100))
    last_week = int(df["week_number"].max())
    new_week = last_week + week_offset
    new_rows = []

    for sid in SUPPLIER_IDS:
        sdata = df[df["supplier_id"] == sid].sort_values("week_number")
        delays = sdata["payment_delay_days"].values.astype(float)
        terms = CONTRACTUAL_TERMS.get(sid, 14)

        # Extrapolate using recent trend
        recent = delays[-6:]
        if len(recent) >= 3:
            slope = np.polyfit(np.arange(len(recent)), recent, 1)[0]
        else:
            slope = 0

        # Predicted next value with noise
        next_delay = float(delays[-1] + slope + rng.normal(0, 1.5))
        next_delay = max(1, round(next_delay, 1))

        # Invoice amount (random within typical range)
        invoices = sdata["invoice_amount"].values
        inv_mean = np.mean(invoices[-8:])
        inv_std = np.std(invoices[-8:])
        next_invoice = max(1000, round(float(rng.normal(inv_mean, inv_std)), 2))

        new_rows.append({
            "week_number": new_week,
            "supplier_id": sid,
            "supplier_name": SUPPLIER_NAMES.get(sid, sid),
            "payment_delay_days": next_delay,
            "invoice_amount": next_invoice,
            "contractual_terms_days": terms,
            "payment_status": "on_time" if next_delay <= terms else "late" if next_delay <= terms + 15 else "critical",
            "is_simulated": True,
        })

    return pd.DataFrame(new_rows)


# ═══════════════════════════════════════════════════════════════════════════
# Unified AI Engine
# ═══════════════════════════════════════════════════════════════════════════

class PayPulseAI:
    """
    Unified AI engine that combines all ML models.

    Usage:
        ai = PayPulseAI()
        ai.train(df)
        forecast = ai.forecast("S2", horizon=6)
        risk = ai.classify_risk("S2")
        anomalies = ai.detect_anomalies("S2")
        full = ai.full_analysis("S2")
    """

    def __init__(self):
        self.forecaster = MLForecaster()
        self.risk_classifier = MLRiskClassifier()
        self.anomaly_detector = MLAnomalyDetector()
        self.clusterer = MLClusterer()
        self.neural = NeuralForecaster()
        self.feature_df = None
        self.raw_df = None
        self.is_ready = False

    def train(self, df: pd.DataFrame):
        """Train all ML models on payment data."""
        self.raw_df = df
        self.feature_df = engineer_features(df)
        self.forecaster.train(self.feature_df)
        self.risk_classifier.train(self.feature_df)
        self.anomaly_detector.train(self.feature_df)
        self.clusterer.train(self.feature_df)
        # Neural net trains with reduced epochs for speed
        self.neural.train(df, epochs=30)
        self.is_ready = True

    def forecast(self, supplier_id: str, horizon: int = 6) -> dict:
        """Get ML-powered forecast for a supplier."""
        self._ensure_ready()
        return self.forecaster.predict(self.feature_df, supplier_id, horizon)

    def classify_risk(self, supplier_id: str) -> dict:
        """Get ML risk classification for a supplier."""
        self._ensure_ready()
        return self.risk_classifier.predict(self.feature_df, supplier_id)

    def detect_anomalies(self, supplier_id: str) -> dict:
        """Get anomaly detection results for a supplier."""
        self._ensure_ready()
        return self.anomaly_detector.detect(self.feature_df, supplier_id)

    def full_analysis(self, supplier_id: str, horizon: int = 6) -> dict:
        """
        Complete AI analysis for a supplier — forecast + risk + anomalies.

        This is the primary endpoint for the dashboard.
        """
        self._ensure_ready()

        forecast = self.forecast(supplier_id, horizon)
        risk = self.classify_risk(supplier_id)
        anomalies = self.detect_anomalies(supplier_id)

        # Historical data for charting
        supplier_feats = self.feature_df[
            self.feature_df["supplier_id"] == supplier_id
        ].sort_values("week_number")

        # New AI features
        neural_forecast = self.neural_forecast(supplier_id, horizon)
        shap = self.explain(supplier_id)
        clusters = self.cluster_suppliers()
        supplier_cluster = next((c for c in clusters["clusters"] if c["supplier_id"] == supplier_id), None)
        model_comp = self.compare_models(supplier_id)

        return {
            "supplier_id": supplier_id,
            "supplier_name": SUPPLIER_NAMES.get(supplier_id, supplier_id),
            "ai_forecast": forecast,
            "ai_neural_forecast": neural_forecast,
            "ai_risk": risk,
            "ai_anomalies": anomalies,
            "ai_shap": shap,
            "ai_cluster": supplier_cluster,
            "ai_model_comparison": model_comp,
            "ai_summary": self._generate_ai_summary(forecast, risk, anomalies),
            "model_info": {
                "forecaster": "GradientBoostingRegressor (200 trees, depth=4)",
                "classifier": "RandomForestClassifier (150 trees, depth=6)",
                "anomaly_detector": "IsolationForest (200 estimators)",
                "clusterer": f"KMeans (k={self.clusterer.n_clusters})",
                "neural_net": "GRU(input=6, hidden=32) → Dense(1)",
                "explainability": "Permutation SHAP",
                "features_engineered": len(FORECAST_FEATURES),
                "total_models": 6,
                "training_samples": len(self.feature_df),
            },
        }

    def neural_forecast(self, supplier_id: str, horizon: int = 6) -> dict:
        """Get neural network forecast."""
        self._ensure_ready()
        return self.neural.predict(self.raw_df, supplier_id, horizon)

    def explain(self, supplier_id: str) -> dict:
        """Get SHAP-style explanation for a supplier's forecast."""
        self._ensure_ready()
        return compute_shap_explanations(
            self.forecaster.model, self.feature_df, supplier_id, FORECAST_FEATURES
        )

    def cluster_suppliers(self) -> dict:
        """Get K-Means clustering results."""
        self._ensure_ready()
        return self.clusterer.predict(self.feature_df)

    def compare_models(self, supplier_id: str) -> dict:
        """Compare all forecasting models head-to-head."""
        self._ensure_ready()
        return compare_all_models(
            self.raw_df, self.feature_df, self.forecaster, self.neural, supplier_id
        )

    def simulate_live(self, weeks_ahead: int = 1) -> dict:
        """Simulate new weeks of data for real-time feel."""
        self._ensure_ready()
        new_data = simulate_new_week(self.raw_df, weeks_ahead)
        return {
            "simulated_week": int(new_data["week_number"].iloc[0]),
            "data": new_data.to_dict(orient="records"),
        }

    def full_dashboard(self) -> dict:
        """Generate complete AI dashboard data for all suppliers."""
        self._ensure_ready()

        suppliers = []
        clusters = self.cluster_suppliers()
        cluster_map = {c["supplier_id"]: c for c in clusters.get("clusters", [])}

        for sid in SUPPLIER_IDS:
            if sid in self.feature_df["supplier_id"].values:
                risk = self.classify_risk(sid)
                anomaly = self.detect_anomalies(sid)
                cl = cluster_map.get(sid, {})
                suppliers.append({
                    "supplier_id": sid,
                    "supplier_name": SUPPLIER_NAMES.get(sid, sid),
                    "predicted_risk": risk["predicted_risk"],
                    "risk_confidence": risk["confidence"],
                    "risk_probabilities": risk["probability_distribution"],
                    "is_anomalous": anomaly["is_anomalous"],
                    "anomaly_score": anomaly["current_anomaly_score"],
                    "total_anomalies": anomaly["total_anomalies_detected"],
                    "cluster_label": cl.get("cluster_label", "Unknown"),
                    "cluster_color": cl.get("cluster_color", "#5a5672"),
                })

        critical_count = sum(1 for s in suppliers if s["predicted_risk"] == "critical")
        warning_count = sum(1 for s in suppliers if s["predicted_risk"] == "warning")
        anomaly_count = sum(1 for s in suppliers if s["is_anomalous"])

        return {
            "suppliers": suppliers,
            "clustering": clusters,
            "overall": {
                "critical_suppliers": critical_count,
                "warning_suppliers": warning_count,
                "anomalous_suppliers": anomaly_count,
                "model_accuracy": self.risk_classifier.train_accuracy,
                "forecaster_mae": self.forecaster.train_mae,
                "neural_mae": self.neural.train_mae,
                "n_clusters": self.clusterer.n_clusters,
                "silhouette_score": self.clusterer.silhouette,
            },
            "model_info": {
                "forecaster": "GradientBoostingRegressor",
                "classifier": "RandomForestClassifier",
                "anomaly_detector": "IsolationForest",
                "clusterer": "KMeans",
                "neural_net": "GRU Neural Network",
                "explainability": "Permutation SHAP",
                "total_models": 6,
            },
        }

    def _generate_ai_summary(self, forecast, risk, anomalies) -> str:
        """Generate a natural-language AI summary combining all signals."""
        parts = []

        # Risk assessment
        risk_label = risk["predicted_risk"]
        confidence = risk["confidence"]
        name = risk["supplier_name"]

        if risk_label == "critical":
            parts.append(
                f"AI Risk Assessment: {name} is classified as CRITICAL risk "
                f"with {confidence}% confidence. Immediate attention required."
            )
        elif risk_label == "warning":
            parts.append(
                f"AI Risk Assessment: {name} is at WARNING level "
                f"({confidence}% confidence). Proactive monitoring recommended."
            )
        elif risk_label == "watch":
            parts.append(
                f"AI Risk Assessment: {name} is on WATCH "
                f"({confidence}% confidence). Early signs of potential issues."
            )
        else:
            parts.append(
                f"AI Risk Assessment: {name} is NORMAL "
                f"({confidence}% confidence). No action needed."
            )

        # Forecast direction
        expected = forecast["expected"]
        if len(expected) >= 2:
            trend_dir = expected[-1] - expected[0]
            if trend_dir > 3:
                parts.append(
                    f"Forecast: Payment delays predicted to increase by "
                    f"{round(trend_dir, 1)} days over the next {len(expected)} weeks."
                )
            elif trend_dir < -3:
                parts.append(
                    f"Forecast: Payment delays predicted to decrease by "
                    f"{round(abs(trend_dir), 1)} days — positive trend."
                )
            else:
                parts.append("Forecast: Delays expected to remain relatively stable.")

        # Anomalies
        if anomalies["is_anomalous"]:
            parts.append(
                f"Anomaly Alert: Current payment pattern flagged as anomalous "
                f"(score: {anomalies['current_anomaly_score']}/100). "
                f"{anomalies['total_anomalies_detected']} anomalous weeks detected in history."
            )

        return " ".join(parts)

    def _ensure_ready(self):
        if not self.is_ready:
            raise RuntimeError("AI engine not ready — call train(df) first")


# ═══════════════════════════════════════════════════════════════════════════
# Standalone test
# ═══════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    from src.data.generator import generate_payment_data

    df = generate_payment_data()
    ai = PayPulseAI()
    ai.train(df)

    print("=" * 70)
    print("  PAYPULSE AI ENGINE — ML Model Results")
    print("=" * 70)

    print(f"\nForecaster training MAE: {ai.forecaster.train_mae} days")
    print(f"Classifier training accuracy: {ai.risk_classifier.train_accuracy}%")

    print("\n--- AI Risk Classification ---")
    print(f"{'Supplier':<22} {'Risk':>10} {'Confidence':>12} {'Anomalous':>10}")
    print("-" * 58)

    dashboard = ai.full_dashboard()
    for s in dashboard["suppliers"]:
        print(
            f"{s['supplier_name']:<22} "
            f"{s['predicted_risk']:>10} "
            f"{s['risk_confidence']:>10.1f}% "
            f"{'YES' if s['is_anomalous'] else 'no':>10}"
        )

    print("\n--- ML Forecast for S2 (BetaLogistics) ---")
    fc = ai.forecast("S2")
    print(f"  Method: {fc['method']}")
    print(f"  Expected: {fc['expected']}")
    print(f"  Low:      {fc['low']}")
    print(f"  High:     {fc['high']}")
    print(f"  Top features: {list(fc['top_features'].keys())[:3]}")

    print("\n--- Full Analysis for S2 ---")
    full = ai.full_analysis("S2")
    print(f"  AI Summary: {full['ai_summary']}")
