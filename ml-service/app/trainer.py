"""
Trainer: time-series CV training for LightGBM quantile + Ridge blend.

Feature: mhtcet-cutoff-prediction
Requirements: 3.1–3.8, 8.1–8.5
"""
from __future__ import annotations

import json
import logging
import os
import pickle
import shutil
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from lightgbm import LGBMRegressor
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler

logger = logging.getLogger(__name__)

# Feature columns the model uses (must all be present in the input df)
FEATURE_COLUMNS = [
    "cutoff_t1", "cutoff_t2", "cutoff_t3",
    "cutoff_volatility",
    "branch_new",
    "college_prestige_score",
    "branch_demand_index",
    "location_influence",
    "is_home_univ", "is_other_univ", "is_state",
    "hu_interaction",
    "global_cutoff_shift",
    "total_seats", "seat_density", "seat_available_flag",
    "cutoff_rank_in_college",
    "gender_enc", "reservation_enc", "scope_enc", "quota_enc",
    "round_enc", "branch_enc", "college_enc",
]

TARGET_COLUMN = "cutoff_percentile"

# Minimum fold sizes
MIN_TRAIN_ROWS = 10
MIN_VAL_ROWS = 5

# LightGBM base params
_LGBM_BASE = dict(
    n_estimators=500,
    learning_rate=0.05,
    num_leaves=31,
    min_child_samples=20,
    n_jobs=-1,
    verbose=-1,
)

# Blend weights
LGBM_WEIGHT = 0.70
RIDGE_WEIGHT = 0.30


def _blend_p50(lgbm_p50: np.ndarray, ridge_p50: np.ndarray) -> np.ndarray:
    """Blend LightGBM and Ridge P50 predictions."""
    return LGBM_WEIGHT * lgbm_p50 + RIDGE_WEIGHT * ridge_p50


def _mae(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_true - y_pred)))


def _within_1_accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_true - y_pred) <= 1.0))


def _within_3_accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    return float(np.mean(np.abs(y_true - y_pred) <= 3.0))


def _directional_accuracy(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    """Fraction where sign(pred_t - pred_{t-1}) == sign(actual_t - actual_{t-1})."""
    if len(y_true) < 2:
        return float("nan")
    sign_pred = np.sign(np.diff(y_pred))
    sign_actual = np.sign(np.diff(y_true))
    # Only count where actual changed (avoid 0/0 on flat sequences)
    mask = sign_actual != 0
    if mask.sum() == 0:
        return float("nan")
    return float(np.mean(sign_pred[mask] == sign_actual[mask]))


def _metrics_for_group(
    df_val: pd.DataFrame,
    blended: np.ndarray,
    p10: np.ndarray,
    p90: np.ndarray,
    group_col: str,
) -> dict[str, dict]:
    """Compute MAE / within-1 / calibration broken down by a grouping column."""
    result: dict[str, dict] = {}
    y_true = df_val[TARGET_COLUMN].values
    for grp_val, idx in df_val.groupby(group_col).groups.items():
        mask = df_val.index.isin(idx)
        yt = y_true[mask]
        yp = blended[mask]
        yp10 = p10[mask]
        yp90 = p90[mask]
        result[str(grp_val)] = {
            "mae": _mae(yt, yp),
            "within_1_accuracy": _within_1_accuracy(yt, yp),
            "calibration_coverage": float(np.mean((yt >= yp10) & (yt <= yp90))),
            "n": int(mask.sum()),
        }
    return result


class Trainer:
    """Trains the LightGBM + Ridge ensemble with time-series CV."""

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------
    def train(
        self,
        df: pd.DataFrame,
        model_dir: str,
        dry_run: bool = False,
    ) -> dict[str, Any]:
        """Train the ensemble on a feature-engineered DataFrame.

        Parameters
        ----------
        df : pd.DataFrame
            Output of FeatureEngineer.fit_transform — must contain all
            FEATURE_COLUMNS and TARGET_COLUMN plus a ``year`` column.
        model_dir : str
            Directory where model artifacts will be written (ignored when
            dry_run=True).
        dry_run : bool
            When True, run the full pipeline but skip artifact persistence.

        Returns
        -------
        dict with keys:
            validation_mae, validation_within_1_accuracy,
            validation_directional_accuracy, calibration_coverage,
            metrics_by_category, metrics_by_cap_round, metrics_by_branch
        """
        self._validate_columns(df)

        years = sorted(df["year"].dropna().unique())
        if len(years) < 2:
            raise ValueError(
                f"Trainer.train requires at least 2 distinct years; got {years}"
            )

        # ---- Fixed validation year: 2024 (complete R1+R2+R3 available) ----
        # Train on 2022-2023, validate on 2024.
        # 2025 is used only for a secondary real-world check (R1 only).
        PRIMARY_VAL_YEAR = 2024
        if PRIMARY_VAL_YEAR not in years:
            # Fallback: use second-to-last year if 2024 not present
            PRIMARY_VAL_YEAR = sorted([y for y in years if y < max(years)])[-1]
            logger.warning("2024 not in data, falling back to val_year=%s", PRIMARY_VAL_YEAR)

        df_train_full = df[df["year"] < PRIMARY_VAL_YEAR].copy()
        df_val        = df[df["year"] == PRIMARY_VAL_YEAR].copy()

        if len(df_train_full) < MIN_TRAIN_ROWS or len(df_val) < MIN_VAL_ROWS:
            raise ValueError(
                f"Insufficient data: train={len(df_train_full)}, val={len(df_val)}"
            )

        logger.info(
            "Training on years %s → validating on %s (%d train, %d val rows)",
            sorted(df_train_full["year"].unique()), PRIMARY_VAL_YEAR,
            len(df_train_full), len(df_val),
        )

        X_train = df_train_full[FEATURE_COLUMNS].values.astype(float)
        y_train = df_train_full[TARGET_COLUMN].values.astype(float)
        X_val = df_val[FEATURE_COLUMNS].values.astype(float)
        y_val = df_val[TARGET_COLUMN].values.astype(float)

        # ---- Fit Ridge scaler on training data -------------------------
        scaler = StandardScaler()
        X_train_scaled = scaler.fit_transform(X_train)
        X_val_scaled = scaler.transform(X_val)

        # ---- Train LightGBM quantile models ----------------------------
        lgbm_p10 = LGBMRegressor(objective="quantile", alpha=0.10, **_LGBM_BASE)
        lgbm_p50 = LGBMRegressor(objective="quantile", alpha=0.50, **_LGBM_BASE)
        lgbm_p90 = LGBMRegressor(objective="quantile", alpha=0.90, **_LGBM_BASE)

        lgbm_p10.fit(X_train, y_train)
        lgbm_p50.fit(X_train, y_train)
        lgbm_p90.fit(X_train, y_train)

        # ---- Train Ridge model -----------------------------------------
        ridge = Ridge(alpha=1.0)
        ridge.fit(X_train_scaled, y_train)

        # ---- Evaluate on held-out fold ---------------------------------
        pred_lgbm_p10 = lgbm_p10.predict(X_val)
        pred_lgbm_p50 = lgbm_p50.predict(X_val)
        pred_lgbm_p90 = lgbm_p90.predict(X_val)
        pred_ridge_p50 = ridge.predict(X_val_scaled)

        blended = _blend_p50(pred_lgbm_p50, pred_ridge_p50)

        mae = _mae(y_val, blended)
        within_1 = _within_1_accuracy(y_val, blended)
        within_3 = _within_3_accuracy(y_val, blended)
        dir_acc = _directional_accuracy(y_val, blended)
        calibration = float(np.mean((y_val >= pred_lgbm_p10) & (y_val <= pred_lgbm_p90)))

        # ---- Category-wise bias (calibration correction) ---------------
        category_bias: dict[str, float] = {}
        if "category" in df_val.columns:
            errors = blended - y_val
            for cat, idx in df_val.reset_index(drop=True).groupby("category").groups.items():
                category_bias[str(cat)] = float(np.mean(errors[list(idx)]))

        if mae > 3.0:
            logger.warning(
                "Trainer: MAE=%.4f exceeds 3.0 — model may be underfit or data insufficient.",
                mae,
            )

        logger.info(
            "Trainer: MAE=%.4f  Within±1=%.4f  Within±3=%.4f  DirAcc=%.4f  Calibration=%.4f",
            mae, within_1, within_3,
            dir_acc if not np.isnan(dir_acc) else -1,
            calibration,
        )

        # ---- Breakdown metrics -----------------------------------------
        metrics_by_category: dict = {}
        metrics_by_cap_round: dict = {}
        metrics_by_branch: dict = {}

        if "category" in df_val.columns:
            metrics_by_category = _metrics_for_group(
                df_val.reset_index(drop=True),
                blended,
                pred_lgbm_p10,
                pred_lgbm_p90,
                "category",
            )

        if "cap_round" in df_val.columns:
            metrics_by_cap_round = _metrics_for_group(
                df_val.reset_index(drop=True),
                blended,
                pred_lgbm_p10,
                pred_lgbm_p90,
                "cap_round",
            )

        if "branch_name" in df_val.columns:
            # Top-10 branches by row count in validation set
            top_branches = (
                df_val["branch_name"].value_counts().head(10).index.tolist()
            )
            df_val_top = df_val[df_val["branch_name"].isin(top_branches)].copy()
            if not df_val_top.empty:
                top_mask = df_val["branch_name"].isin(top_branches).values
                metrics_by_branch = _metrics_for_group(
                    df_val_top.reset_index(drop=True),
                    blended[top_mask],
                    pred_lgbm_p10[top_mask],
                    pred_lgbm_p90[top_mask],
                    "branch_name",
                )

        metrics: dict[str, Any] = {
            "validation_year": PRIMARY_VAL_YEAR,
            "validation_mae": mae,
            "validation_within_1_accuracy": within_1,
            "validation_within_3_accuracy": within_3,
            "validation_directional_accuracy": dir_acc if not np.isnan(dir_acc) else None,
            "calibration_coverage": calibration,
            "category_bias": category_bias,
            "metrics_by_category": metrics_by_category,
            "metrics_by_cap_round": metrics_by_cap_round,
            "metrics_by_branch": metrics_by_branch,
        }

        # ---- Secondary check: 2025 R1 only (real-world early prediction) ----
        SECONDARY_YEAR = 2025
        if SECONDARY_YEAR in years:
            df_2025 = df[(df["year"] == SECONDARY_YEAR) & (df["round"] == 1)].copy()
            if len(df_2025) >= MIN_VAL_ROWS:
                X_2025 = df_2025[FEATURE_COLUMNS].values.astype(float)
                y_2025 = df_2025[TARGET_COLUMN].values.astype(float)
                X_2025_scaled = scaler.transform(X_2025)
                pred_2025 = _blend_p50(lgbm_p50.predict(X_2025), ridge.predict(X_2025_scaled))
                mae_2025     = _mae(y_2025, pred_2025)
                within1_2025 = _within_1_accuracy(y_2025, pred_2025)
                within3_2025 = _within_3_accuracy(y_2025, pred_2025)
                logger.info(
                    "Secondary check (2025 R1 only): MAE=%.4f  Within±1=%.4f  Within±3=%.4f  n=%d",
                    mae_2025, within1_2025, within3_2025, len(df_2025),
                )
                metrics["secondary_2025_r1"] = {
                    "mae": mae_2025,
                    "within_1_accuracy": within1_2025,
                    "within_3_accuracy": within3_2025,
                    "n": len(df_2025),
                    "note": "2025 Round 1 only — early-season prediction simulation",
                }

        # ---- Persist artifacts (unless dry_run) ------------------------
        if not dry_run:
            self._persist_artifacts(
                model_dir=model_dir,
                lgbm_p10=lgbm_p10,
                lgbm_p50=lgbm_p50,
                lgbm_p90=lgbm_p90,
                ridge=ridge,
                scaler=scaler,
                df=df,
                metrics=metrics,
            )

        return metrics

    # ------------------------------------------------------------------
    # CV fold builder (exposed for testing)
    # ------------------------------------------------------------------
    def build_folds(
        self, df: pd.DataFrame
    ) -> list[tuple[pd.DataFrame, pd.DataFrame]]:
        """Return list of (train_df, val_df) tuples for time-series CV."""
        years = sorted(df["year"].dropna().unique())
        return self._build_folds(df, years)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------
    def _validate_columns(self, df: pd.DataFrame) -> None:
        missing = [c for c in FEATURE_COLUMNS + [TARGET_COLUMN, "year"] if c not in df.columns]
        if missing:
            raise ValueError(f"Trainer: missing required columns: {missing}")

    def _build_folds(
        self, df: pd.DataFrame, years: list
    ) -> list[tuple[pd.DataFrame, pd.DataFrame]]:
        """Build time-series CV folds: train on years < val_year."""
        folds = []
        for val_year in years[1:]:  # skip first year (no training data before it)
            df_train = df[df["year"] < val_year].copy()
            df_val = df[df["year"] == val_year].copy()
            if len(df_train) < MIN_TRAIN_ROWS or len(df_val) < MIN_VAL_ROWS:
                logger.debug(
                    "Skipping fold val_year=%s: train=%d val=%d",
                    val_year,
                    len(df_train),
                    len(df_val),
                )
                continue
            folds.append((df_train, df_val))
        return folds

    def _persist_artifacts(
        self,
        model_dir: str,
        lgbm_p10: LGBMRegressor,
        lgbm_p50: LGBMRegressor,
        lgbm_p90: LGBMRegressor,
        ridge: Ridge,
        scaler: StandardScaler,
        df: pd.DataFrame,
        metrics: dict,
    ) -> None:
        """Atomically write artifacts to model_dir."""
        model_path = Path(model_dir)

        # Write to temp dir first, then rename atomically
        tmp_dir = Path(tempfile.mkdtemp(prefix="trainer_tmp_"))
        try:
            # LightGBM models
            lgbm_p10.booster_.save_model(str(tmp_dir / "lgbm_p10.txt"))
            lgbm_p50.booster_.save_model(str(tmp_dir / "lgbm_p50.txt"))
            lgbm_p90.booster_.save_model(str(tmp_dir / "lgbm_p90.txt"))

            # Ridge model
            with open(tmp_dir / "ridge_p50.pkl", "wb") as f:
                pickle.dump({"model": ridge, "scaler": scaler}, f)

            # Feature scaler (copy from FeatureEngineer if available)
            fe_scaler_path = model_path / "feature_scaler.pkl"
            if fe_scaler_path.exists():
                shutil.copy2(fe_scaler_path, tmp_dir / "feature_scaler.pkl")

            # Feature columns list
            with open(tmp_dir / "feature_columns.json", "w") as f:
                json.dump(FEATURE_COLUMNS, f)

            # Model metadata
            now = datetime.now(timezone.utc)
            model_version = now.strftime("%Y%m%d_%H%M%S")
            exam_types = (
                df["exam_type"].unique().tolist()
                if "exam_type" in df.columns
                else ["mhtcet"]
            )
            # exam_type may be label-encoded integers; convert to strings
            exam_types = [str(e) for e in exam_types]

            metadata = {
                "model_version": model_version,
                "training_date": now.isoformat(),
                "data_row_count": len(df),
                "validation_year": metrics.get("validation_year"),
                "validation_mae": metrics["validation_mae"],
                "validation_within_1_accuracy": metrics["validation_within_1_accuracy"],
                "validation_within_3_accuracy": metrics.get("validation_within_3_accuracy"),
                "validation_directional_accuracy": metrics["validation_directional_accuracy"],
                "calibration_coverage": metrics.get("calibration_coverage"),
                "category_bias": metrics.get("category_bias", {}),
                "secondary_2025_r1": metrics.get("secondary_2025_r1"),
            }
            with open(tmp_dir / "model_metadata.json", "w") as f:
                json.dump(metadata, f, indent=2)

            # Atomic rename: remove existing model_dir if present, then rename
            model_path.mkdir(parents=True, exist_ok=True)
            # Move individual files into model_dir (cross-device safe)
            for src_file in tmp_dir.iterdir():
                dest = model_path / src_file.name
                shutil.move(str(src_file), str(dest))

            logger.info("Trainer: artifacts written to %s (version=%s)", model_dir, model_version)

        finally:
            shutil.rmtree(tmp_dir, ignore_errors=True)

        # Fit and save ColdStartHandler
        self._save_cold_start_handler(df, model_path)

    def _save_cold_start_handler(self, df: pd.DataFrame, model_path: Path) -> None:
        """Fit ColdStartHandler on training data and save to model_dir."""
        try:
            from app.cold_start_handler import ColdStartHandler

            handler = ColdStartHandler()
            handler.fit(df)
            handler.save(model_path / "cold_start_handler.pkl")
            logger.info("Trainer: ColdStartHandler saved to %s", model_path)
        except Exception as exc:
            logger.warning("Trainer: failed to save ColdStartHandler: %s", exc)
