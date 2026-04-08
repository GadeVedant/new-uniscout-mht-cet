"""
Predictor: loads model artifacts and serves inference for MHT-CET cutoff prediction.

Feature: mhtcet-cutoff-prediction
Requirements: 4.1–4.5, 5.1–5.9, 6.8, 10.1
"""
from __future__ import annotations

import json
import logging
import math
import os
import pickle
import time
from datetime import datetime
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Environment-configurable constants
# ---------------------------------------------------------------------------
EPSILON: float = float(os.getenv("ML_EPSILON", "0.2"))
SIGMOID_K: float = float(os.getenv("ML_SIGMOID_K", "2.5"))
CONFIDENCE_W1: float = float(os.getenv("ML_CONFIDENCE_W1", "0.6"))
CONFIDENCE_W2: float = float(os.getenv("ML_CONFIDENCE_W2", "0.4"))
MAX_BATCH_SIZE: int = int(os.getenv("MAX_BATCH_SIZE", "200"))
SHAP_BATCH_THRESHOLD: int = int(os.getenv("SHAP_BATCH_THRESHOLD", "20"))
SHAP_SAMPLE_THRESHOLD: int = int(os.getenv("SHAP_SAMPLE_THRESHOLD", "10"))
ML_BATCH_TIMEOUT_MS: float = float(os.getenv("ML_BATCH_TIMEOUT_MS", "120"))

# ---------------------------------------------------------------------------
# SHAP label map
# ---------------------------------------------------------------------------
SHAP_LABEL_MAP: dict[str, str] = {
    "cutoff_t1": "Recent cutoff trend",
    "cutoff_t2": "Historical cutoff trend",
    "cutoff_t3": "Long-term cutoff trend",
    "branch_demand_index": "High branch demand",
    "college_prestige_score": "College prestige",
    "category_fill_rate": "Low seat availability",
    "cutoff_volatility": "Volatile cutoff history",
    "cap_round_delta": "Round-to-round cutoff shift",
    "global_cutoff_shift": "Macro cutoff trend",
    "seat_count": "Seat count",
    "location_influence": "Location demand",
    "exam_type": "Exam type",
}

# ---------------------------------------------------------------------------
# Pure math helpers (exported for testing)
# ---------------------------------------------------------------------------

def sigmoid(x: float) -> float:
    """Standard sigmoid function, numerically stable."""
    if x >= 0:
        return 1.0 / (1.0 + math.exp(-x))
    else:
        ex = math.exp(x)
        return ex / (1.0 + ex)


def compute_admission_probability(
    student_percentile: float,
    p50: float,
    p10: float,
    p90: float,
    k: float = SIGMOID_K,
    epsilon: float = EPSILON,
) -> float:
    """Compute admission probability as sigmoid(k * z) * 100.

    z = (student_percentile - p50) / max(p90 - p10, epsilon)
    """
    interval = max(p90 - p10, epsilon)
    z = (student_percentile - p50) / interval
    return sigmoid(k * z) * 100.0


def apply_epsilon_fix(
    p10: float,
    p50: float,
    p90: float,
    epsilon: float = EPSILON,
) -> tuple[float, float, float]:
    """Enforce p10 <= p50 <= p90 using epsilon fix."""
    if p10 > p50:
        p10 = p50 - epsilon
    if p90 < p50:
        p90 = p50 + epsilon
    return p10, p50, p90


def compute_confidence_score(
    interval_width: float,
    sample_size: int,
    raw_min: float | None = None,
    raw_max: float | None = None,
    w1: float = CONFIDENCE_W1,
    w2: float = CONFIDENCE_W2,
    epsilon: float = EPSILON,
) -> float:
    """Compute confidence score using deterministic formula, normalised to [0,1]."""
    raw = w1 * (1.0 / max(interval_width, epsilon)) + w2 * math.log(sample_size + 1)
    if raw_min is not None and raw_max is not None and raw_max > raw_min:
        score = (raw - raw_min) / (raw_max - raw_min)
    else:
        # Fallback: clip raw directly (reasonable bounds)
        score = raw
    return float(max(0.0, min(1.0, score)))


def derive_admission_band(admission_probability: float) -> str:
    """Map admission_probability [0,100] to admission band label."""
    if admission_probability >= 80.0:
        return "Safe"
    elif admission_probability >= 50.0:
        return "Likely"
    elif admission_probability >= 20.0:
        return "Moderate"
    else:
        return "Risky"


def derive_confidence_label(confidence_score: float) -> str:
    """Map confidence_score [0,1] to confidence label."""
    if confidence_score > 0.75:
        return "High confidence"
    elif confidence_score >= 0.50:
        return "Medium confidence"
    else:
        return "Low confidence (estimated)"


# ---------------------------------------------------------------------------
# Predictor class
# ---------------------------------------------------------------------------

class Predictor:
    """Loads model artifacts and serves predictions."""

    def __init__(self) -> None:
        self._loaded: bool = False
        self._lgbm_p10: Any = None
        self._lgbm_p50: Any = None
        self._lgbm_p90: Any = None
        self._ridge: Any = None
        self._ridge_scaler: Any = None
        self._feature_engineer: Any = None
        self._feature_columns: list[str] = []
        self._fe_stats: dict = {}
        self._model_metadata: dict = {}
        self._cold_start_handler: Any = None
        self._shap_explainer: Any = None

    # ------------------------------------------------------------------
    # 8.1 load_artifacts
    # ------------------------------------------------------------------
    def load_artifacts(self, model_dir: str) -> None:
        """Load all required model artifacts from model_dir.

        Raises FileNotFoundError if any required artifact is missing.
        """
        from app.feature_engineer import FeatureEngineer

        model_path = Path(model_dir)

        required = [
            "lgbm_p10.txt",
            "lgbm_p50.txt",
            "lgbm_p90.txt",
            "ridge_p50.pkl",
            "feature_scaler.pkl",
            "feature_columns.json",
        ]
        for fname in required:
            fpath = model_path / fname
            if not fpath.exists():
                raise FileNotFoundError(
                    f"Required model artifact not found: {fpath}. "
                    "Run training first (python train.py)."
                )

        # Load LightGBM boosters
        import lightgbm as lgb
        self._lgbm_p10 = lgb.Booster(model_file=str(model_path / "lgbm_p10.txt"))
        self._lgbm_p50 = lgb.Booster(model_file=str(model_path / "lgbm_p50.txt"))
        self._lgbm_p90 = lgb.Booster(model_file=str(model_path / "lgbm_p90.txt"))

        # Load Ridge model + scaler
        with open(model_path / "ridge_p50.pkl", "rb") as f:
            ridge_bundle = pickle.load(f)
        self._ridge = ridge_bundle["model"]
        self._ridge_scaler = ridge_bundle["scaler"]

        # Load feature columns
        with open(model_path / "feature_columns.json") as f:
            self._feature_columns = json.load(f)

        # Load FeatureEngineer with stored stats
        fe_scaler_path = model_path / "feature_scaler.pkl"
        self._feature_engineer = FeatureEngineer(scaler_path=fe_scaler_path)
        self._feature_engineer._load()
        self._fe_stats = self._feature_engineer._stats

        # Load optional model metadata
        meta_path = model_path / "model_metadata.json"
        if meta_path.exists():
            with open(meta_path) as f:
                self._model_metadata = json.load(f)

        # Load optional ColdStartHandler
        cs_path = model_path / "cold_start_handler.pkl"
        if cs_path.exists():
            try:
                with open(cs_path, "rb") as f:
                    self._cold_start_handler = pickle.load(f)
                logger.info("Predictor: ColdStartHandler loaded from %s", cs_path)
            except Exception as exc:
                logger.warning("Predictor: failed to load ColdStartHandler: %s", exc)
                self._cold_start_handler = None

        # Reset SHAP explainer (will be lazily initialised)
        self._shap_explainer = None

        self._loaded = True
        logger.info(
            "Predictor: artifacts loaded from %s (version=%s)",
            model_dir,
            self._model_metadata.get("model_version", "unknown"),
        )

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    def _require_loaded(self) -> None:
        if not self._loaded:
            from fastapi import HTTPException
            raise HTTPException(
                status_code=503,
                detail="Model artifacts not loaded. Trigger POST /api/train first.",
            )

    def _build_input_df(self, request: Any) -> pd.DataFrame:
        """Build a single-row DataFrame from a PredictionRequest."""
        current_year = datetime.now().year
        return pd.DataFrame([{
            "college_code": request.college_code,
            "branch_name": request.branch_name,
            "category": request.category,
            "cap_round": request.cap_round,
            "year": current_year,
            "cutoff_percentile": request.student_percentile,
            "exam_type": request.exam_type,
            "district": request.district,
            "location": request.district,  # use district as location proxy
            "intake": None,
        }])

    def _get_sample_size(self, college_code: str, branch_name: str, category: str) -> int:
        """Look up sample_size from feature_scaler stats."""
        lookup: dict = self._fe_stats.get("sample_size_lookup", {})
        key = (college_code, branch_name, category)
        return int(lookup.get(key, 1))

    def _get_raw_min_max(self) -> tuple[float | None, float | None]:
        """Retrieve raw_min / raw_max from feature_scaler stats if stored."""
        raw_min = self._fe_stats.get("raw_min")
        raw_max = self._fe_stats.get("raw_max")
        return raw_min, raw_max

    def _compute_shap_top_factors(self, X_row: np.ndarray) -> list[str]:
        """Compute SHAP top-3 factors for a single row."""
        try:
            import shap
            if self._shap_explainer is None:
                self._shap_explainer = shap.TreeExplainer(self._lgbm_p50)
            shap_values = self._shap_explainer.shap_values(X_row)
            # shap_values shape: (1, n_features) or (n_features,)
            if hasattr(shap_values, "shape") and len(shap_values.shape) == 2:
                abs_vals = np.abs(shap_values[0])
            else:
                abs_vals = np.abs(shap_values)
            top_indices = np.argsort(abs_vals)[::-1][:3]
            factors = []
            for idx in top_indices:
                if idx < len(self._feature_columns):
                    feat_name = self._feature_columns[idx]
                    label = SHAP_LABEL_MAP.get(feat_name, feat_name)
                    factors.append(label)
            return factors if factors else ["Recent cutoff trend"]
        except Exception as exc:
            logger.warning("Predictor: SHAP computation failed: %s", exc)
            return ["Recent cutoff trend"]

    # ------------------------------------------------------------------
    # 8.2 predict
    # ------------------------------------------------------------------
    def predict(
        self,
        request: Any,
        request_id: str | None = None,
        _force_shap: bool | None = None,
    ) -> Any:
        """Run inference for a single PredictionRequest."""
        from app.schemas import PredictionResult

        self._require_loaded()
        t_start = time.perf_counter()

        # Build input DataFrame and apply feature engineering
        df = self._build_input_df(request)
        df_feat = self._feature_engineer.transform(df)

        # Determine if cold start
        is_cold_start = bool(df_feat["is_cold_start"].iloc[0])

        # Extract feature matrix
        X = df_feat[self._feature_columns].values.astype(float)

        # Sample size for confidence
        sample_size = self._get_sample_size(
            request.college_code, request.branch_name, request.category
        )

        fallback_reason: str | None = None

        # ------------------------------------------------------------------
        # 8.4 Cold start handling
        # ------------------------------------------------------------------
        if is_cold_start and self._cold_start_handler is not None:
            cs_result = self._cold_start_handler.get_fallback(
                branch_name=request.branch_name,
                category=request.category,
                cap_round=request.cap_round,
                district=request.district,
                college_code=request.college_code,
            )
            p50_cs: float = float(cs_result["p50"])
            confidence_cap: float = float(cs_result["confidence_score"])
            fallback_reason = cs_result["fallback_reason"]

            # Use LightGBM for P10/P90 bounds, override P50 with cold-start estimate
            pred_p10 = float(self._lgbm_p10.predict(X)[0])
            pred_p90 = float(self._lgbm_p90.predict(X)[0])
            p50 = p50_cs

            # Apply epsilon fix
            p10, p50, p90 = apply_epsilon_fix(pred_p10, p50, pred_p90)

            # Confidence score capped at cold-start tier limit
            raw_min, raw_max = self._get_raw_min_max()
            interval_width = p90 - p10
            conf = compute_confidence_score(
                interval_width, sample_size, raw_min, raw_max
            )
            confidence_score = min(conf, confidence_cap)
        else:
            # Normal ML inference
            pred_lgbm_p10 = float(self._lgbm_p10.predict(X)[0])
            pred_lgbm_p50 = float(self._lgbm_p50.predict(X)[0])
            pred_lgbm_p90 = float(self._lgbm_p90.predict(X)[0])

            # Ridge P50
            X_scaled = self._ridge_scaler.transform(X)
            pred_ridge_p50 = float(self._ridge.predict(X_scaled)[0])

            # Blend P50
            p50 = 0.70 * pred_lgbm_p50 + 0.30 * pred_ridge_p50

            # Apply epsilon fix
            p10, p50, p90 = apply_epsilon_fix(pred_lgbm_p10, p50, pred_lgbm_p90)

            # Confidence score
            raw_min, raw_max = self._get_raw_min_max()
            interval_width = p90 - p10
            confidence_score = compute_confidence_score(
                interval_width, sample_size, raw_min, raw_max
            )

        # Admission probability
        admission_probability = compute_admission_probability(
            request.student_percentile, p50, p10, p90
        )

        # Admission band and confidence label
        admission_band = derive_admission_band(admission_probability)
        confidence_label = derive_confidence_label(confidence_score)

        # SHAP top_factors
        # Compute when: request.explain == True OR sample_size > SHAP_SAMPLE_THRESHOLD
        # _force_shap allows tests to override
        if _force_shap is not None:
            do_shap = _force_shap
        else:
            do_shap = getattr(request, "explain", False) or (sample_size > SHAP_SAMPLE_THRESHOLD)

        if do_shap:
            top_factors = self._compute_shap_top_factors(X)
        else:
            top_factors = []

        # Predicted year
        predicted_year = self._model_metadata.get("predicted_year", datetime.now().year + 1)

        latency_ms = (time.perf_counter() - t_start) * 1000.0

        # Structured log
        logger.info(
            json.dumps({
                "event": "prediction",
                "request_id": request_id,
                "college_code": request.college_code,
                "branch_name": request.branch_name,
                "category": request.category,
                "cap_round": request.cap_round,
                "student_percentile": request.student_percentile,
                "p10": round(p10, 4),
                "p50": round(p50, 4),
                "p90": round(p90, 4),
                "latency_ms": round(latency_ms, 2),
                "fallback_reason": fallback_reason,
                "model_version": self._model_metadata.get("model_version", "unknown"),
            })
        )

        return PredictionResult(
            p10=round(p10, 4),
            p50=round(p50, 4),
            p90=round(p90, 4),
            admission_probability=round(admission_probability, 4),
            confidence_score=round(confidence_score, 6),
            confidence_label=confidence_label,
            admission_band=admission_band,
            top_factors=top_factors,
            predicted_year=int(predicted_year),
            fallback_reason=fallback_reason,
        )

    # ------------------------------------------------------------------
    # 8.3 predict_batch
    # ------------------------------------------------------------------
    def predict_batch(
        self,
        requests: list[Any],
        request_id: str | None = None,
    ) -> list[Any]:
        """Run inference for a batch of PredictionRequests."""
        from fastapi import HTTPException
        from app.schemas import PredictionResult

        self._require_loaded()

        if len(requests) > MAX_BATCH_SIZE:
            raise HTTPException(
                status_code=413,
                detail=f"Batch size {len(requests)} exceeds maximum allowed {MAX_BATCH_SIZE}.",
            )

        results: list[Any] = []
        batch_start = time.perf_counter()

        for i, req in enumerate(requests):
            # Check soft timeout budget
            elapsed_ms = (time.perf_counter() - batch_start) * 1000.0
            budget_exceeded = elapsed_ms > ML_BATCH_TIMEOUT_MS

            # Skip SHAP for items beyond threshold or when budget exceeded
            skip_shap = (i >= SHAP_BATCH_THRESHOLD) or budget_exceeded

            try:
                result = self.predict(
                    req,
                    request_id=request_id,
                    _force_shap=(False if skip_shap else None),
                )
                results.append(result)
            except Exception as exc:
                logger.warning(
                    "Predictor.predict_batch: item %d failed: %s", i, exc
                )
                # Partial success: return error result for this item
                results.append(
                    PredictionResult(
                        p10=0.0,
                        p50=0.0,
                        p90=0.0,
                        admission_probability=0.0,
                        confidence_score=0.0,
                        confidence_label="Low confidence (estimated)",
                        admission_band="Risky",
                        top_factors=[],
                        predicted_year=datetime.now().year + 1,
                        fallback_reason="error",
                    )
                )

        return results


# Module-level singleton
predictor = Predictor()
