"""
FeatureEngineer: computes all engineered features from normalised cutoff data.

Features:
  Lag features    : cutoff_t1, cutoff_t2, cutoff_t3 (per college+branch+category+round)
  Volatility      : cutoff_volatility (std of available lags)
  Round deltas    : delta_12, delta_23, delta_13 (cutoff drop across rounds)
  Prestige        : college_prestige_score (avg cutoff across branches, latest year)
  Demand          : branch_demand_index (avg cutoff across colleges, latest year)
  Location        : location_influence (avg cutoff per district)
  Global shift    : global_cutoff_shift (year-over-year macro shift)
  Seat features   : total_seats, seat_density
  Encoded cats    : gender, reservation_category, university_scope, special_quota,
                    round, branch_name, college_code (label encoded)
"""
from __future__ import annotations

import logging
import pickle
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.preprocessing import LabelEncoder

logger = logging.getLogger(__name__)

DEFAULT_SCALER_PATH = Path(__file__).parent.parent / "models" / "feature_scaler.pkl"

# Group key for lag/volatility/delta features
_LAG_GROUP = ["college_code", "branch_code", "category", "round"]

# Final feature columns fed to the model
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


class FeatureEngineer:

    def __init__(self, scaler_path: str | Path = DEFAULT_SCALER_PATH) -> None:
        self.scaler_path = Path(scaler_path)
        self._stats: dict[str, Any] = {}

    # ------------------------------------------------------------------
    # fit_transform — training time
    # ------------------------------------------------------------------
    def fit_transform(self, df: pd.DataFrame) -> pd.DataFrame:
        df = df.copy()
        df = self._ensure_numeric(df)

        df, lag_stats       = self._compute_lags(df, fit=True)
        df, vol_stats       = self._compute_volatility(df, fit=True)
        df, delta_stats     = self._compute_round_deltas(df, fit=True)
        df, prestige_stats  = self._compute_college_prestige(df, fit=True)
        df, demand_stats    = self._compute_branch_demand(df, fit=True)
        df, loc_stats       = self._compute_location_influence(df, fit=True)
        df, shift_val       = self._compute_global_shift(df, fit=True)
        df, seat_stats      = self._compute_seat_features(df, fit=True)
        df, encoders        = self._encode_categoricals(df, fit=True)

        self._stats = {
            "lag_stats": lag_stats,
            "vol_stats": vol_stats,
            "delta_stats": delta_stats,
            "prestige_stats": prestige_stats,
            "demand_stats": demand_stats,
            "loc_stats": loc_stats,
            "global_shift": shift_val,
            "seat_stats": seat_stats,
            "encoders": encoders,
        }
        self._persist()
        logger.info("FeatureEngineer.fit_transform: %d rows, %d features", len(df), len(FEATURE_COLUMNS))
        return df

    # ------------------------------------------------------------------
    # transform — inference time
    # ------------------------------------------------------------------
    def transform(self, df: pd.DataFrame) -> pd.DataFrame:
        if not self._stats:
            self._load()
        df = df.copy()
        df = self._ensure_numeric(df)
        s = self._stats

        df, _ = self._compute_lags(df, fit=False, stats=s["lag_stats"])
        df, _ = self._compute_volatility(df, fit=False, stats=s["vol_stats"])
        df, _ = self._compute_round_deltas(df, fit=False, stats=s["delta_stats"])
        df, _ = self._compute_college_prestige(df, fit=False, stats=s["prestige_stats"])
        df, _ = self._compute_branch_demand(df, fit=False, stats=s["demand_stats"])
        df, _ = self._compute_location_influence(df, fit=False, stats=s["loc_stats"])
        df["global_cutoff_shift"] = s["global_shift"]
        df, _ = self._compute_seat_features(df, fit=False, stats=s["seat_stats"])
        df, _ = self._encode_categoricals(df, fit=False, encoders=s["encoders"])
        return df

    # ==================================================================
    # Feature computation methods
    # ==================================================================

    def _ensure_numeric(self, df: pd.DataFrame) -> pd.DataFrame:
        for col in ["cutoff_percentile", "year", "round", "total_seats"]:
            if col in df.columns:
                df[col] = pd.to_numeric(df[col], errors="coerce")
        return df

    # ------------------------------------------------------------------
    # Lag features: cutoff_t1, cutoff_t2, cutoff_t3
    # ------------------------------------------------------------------
    def _compute_lags(self, df, fit, stats=None):
        df = df.sort_values(_LAG_GROUP + ["year"]).copy()
        global_mean = float(df["cutoff_percentile"].mean())

        for lag in (1, 2, 3):
            col = f"cutoff_t{lag}"
            df[col] = df.groupby(_LAG_GROUP)["cutoff_percentile"].shift(lag)

        df["is_cold_start"] = df[["cutoff_t1", "cutoff_t2", "cutoff_t3"]].isna().any(axis=1)

        # branch_new: 1 when no lag history exists (new branch, cold start)
        df["branch_new"] = df["is_cold_start"].astype(int)

        # Impute missing lags with group mean
        group_mean_s = df.groupby(_LAG_GROUP)["cutoff_percentile"].transform("mean").fillna(global_mean)
        for lag in (1, 2, 3):
            col = f"cutoff_t{lag}"
            missing = df[col].isna()
            if missing.any():
                df.loc[missing, col] = group_mean_s[missing]

        lag_stats = {"global_mean": global_mean}
        return df, lag_stats

    # ------------------------------------------------------------------
    # Volatility: std of lags
    # ------------------------------------------------------------------
    def _compute_volatility(self, df, fit, stats=None):
        df["cutoff_volatility"] = df.groupby(_LAG_GROUP)["cutoff_percentile"].transform("std").fillna(0.0)
        vol_stats = {}
        return df, vol_stats

    # ------------------------------------------------------------------
    # Round deltas: delta_12, delta_23, delta_13
    # ------------------------------------------------------------------
    def _compute_round_deltas(self, df, fit, stats=None):
        """Compute cutoff drop across rounds per (college, branch, category, year)."""
        key = ["college_code", "branch_code", "category", "year"]

        pivot = df.pivot_table(
            index=key, columns="round",
            values="cutoff_percentile", aggfunc="mean"
        )

        r1 = pivot.get(1, pd.Series(np.nan, index=pivot.index))
        r2 = pivot.get(2, pd.Series(np.nan, index=pivot.index))
        r3 = pivot.get(3, pd.Series(np.nan, index=pivot.index))

        delta_df = pd.DataFrame({
            "delta_12": (r1 - r2).fillna(0.0),
            "delta_23": (r2 - r3).fillna(0.0),
            "delta_13": (r1 - r3).fillna(0.0),
        }).reset_index()

        # Merge back
        df = df.merge(delta_df, on=key, how="left")
        for col in ["delta_12", "delta_23", "delta_13"]:
            df[col] = df[col].fillna(0.0)

        delta_stats = {}
        return df, delta_stats

    # ------------------------------------------------------------------
    # College prestige: avg cutoff across branches (latest year)
    # ------------------------------------------------------------------
    def _compute_college_prestige(self, df, fit, stats=None):
        global_mean = float(df["cutoff_percentile"].mean())
        if fit:
            latest = df["year"].max()
            prestige_map = (
                df[df["year"] == latest]
                .groupby("college_code")["cutoff_percentile"].mean()
                .to_dict()
            )
            stats = {"prestige_map": prestige_map, "global_mean": global_mean}
        prestige_map = stats["prestige_map"]
        fallback = stats.get("global_mean", global_mean)
        df["college_prestige_score"] = df["college_code"].map(prestige_map).fillna(fallback)
        return df, stats

    # ------------------------------------------------------------------
    # Branch demand: avg cutoff across colleges (latest year)
    # ------------------------------------------------------------------
    def _compute_branch_demand(self, df, fit, stats=None):
        global_mean = float(df["cutoff_percentile"].mean())
        if fit:
            latest = df["year"].max()
            demand_map = (
                df[df["year"] == latest]
                .groupby("branch_name_norm")["cutoff_percentile"].mean()
                .to_dict()
            )
            stats = {"demand_map": demand_map, "global_mean": global_mean}
        demand_map = stats["demand_map"]
        fallback = stats.get("global_mean", global_mean)
        df["branch_demand_index"] = df["branch_name_norm"].map(demand_map).fillna(fallback)
        return df, stats

    # ------------------------------------------------------------------
    # Location influence: avg cutoff per district
    # ------------------------------------------------------------------
    def _compute_location_influence(self, df, fit, stats=None):
        global_mean = float(df["cutoff_percentile"].mean())
        if fit:
            loc_map = {}
            if "district" in df.columns:
                loc_map = df.groupby("district")["cutoff_percentile"].mean().to_dict()
            stats = {"loc_map": loc_map, "global_mean": global_mean}
        loc_map = stats["loc_map"]
        fallback = stats.get("global_mean", global_mean)
        loc_series = pd.Series(np.nan, index=df.index)
        if "district" in df.columns:
            loc_series = df["district"].map(loc_map)
        df["location_influence"] = loc_series.fillna(fallback)

        # Explicit HU/OHU/State flags — help model learn scope-specific patterns
        df["is_home_univ"]  = (df["university_scope"] == "Home").astype(int)
        df["is_other_univ"] = (df["university_scope"] == "Other").astype(int)
        df["is_state"]      = (df["university_scope"] == "State").astype(int)

        # HU × prestige interaction — HU cutoffs are more sensitive to college prestige
        if "college_prestige_score" in df.columns:
            df["hu_interaction"] = df["is_home_univ"] * df["college_prestige_score"]
        else:
            df["hu_interaction"] = 0.0

        return df, stats

    # ------------------------------------------------------------------
    # Global cutoff shift: year-over-year macro change
    # ------------------------------------------------------------------
    def _compute_global_shift(self, df, fit, stats=None):
        if fit:
            years = sorted(df["year"].dropna().unique())
            if len(years) >= 2:
                shift = float(
                    df[df["year"] == years[-1]]["cutoff_percentile"].mean() -
                    df[df["year"] == years[-2]]["cutoff_percentile"].mean()
                )
            else:
                shift = 0.0
        else:
            shift = stats if stats is not None else 0.0
        df["global_cutoff_shift"] = shift
        return df, shift

    # ------------------------------------------------------------------
    # Seat features: total_seats, seat_density, seat_available_flag
    # ------------------------------------------------------------------
    def _compute_seat_features(self, df, fit, stats=None):
        global_median = float(df["total_seats"].median()) if "total_seats" in df.columns and df["total_seats"].notna().any() else 60.0
        if fit:
            branch_median = df.groupby("branch_name_norm")["total_seats"].median().to_dict()
            stats = {"branch_median": branch_median, "global_median": global_median}

        branch_median = stats["branch_median"]
        fallback = stats.get("global_median", global_median)

        # Flag whether seat data was actually available
        df["seat_available_flag"] = df["total_seats"].notna().astype(int)

        if "total_seats" in df.columns:
            # Fill missing with branch median, then global median
            df["total_seats"] = df["total_seats"].fillna(
                df["branch_name_norm"].map(branch_median).fillna(fallback)
            )
        else:
            df["total_seats"] = fallback

        # seat_density = branch total seats / college total seats
        college_total = df.groupby("college_code")["total_seats"].transform("sum").replace(0, np.nan)
        df["seat_density"] = (df["total_seats"] / college_total).fillna(0.0)

        # cutoff_rank_in_college: percentile rank of cutoff within (college, round, year)
        # captures intra-college competition — higher rank = more competitive seat
        df["cutoff_rank_in_college"] = df.groupby(
            ["college_code", "round", "year"]
        )["cutoff_percentile"].rank(pct=True, method="average").fillna(0.5)

        return df, stats

    # ------------------------------------------------------------------
    # Label encode categorical features
    # ------------------------------------------------------------------
    def _encode_categoricals(self, df, fit, encoders=None):
        cols = {
            "gender":               "gender_enc",
            "reservation_category": "reservation_enc",
            "university_scope":     "scope_enc",
            "special_quota":        "quota_enc",
            "round":                "round_enc",
            "branch_name_norm":     "branch_enc",
            "college_code":         "college_enc",
        }
        if fit:
            encoders = {}
            for src, tgt in cols.items():
                le = LabelEncoder()
                vals = df[src].astype(str).fillna("unknown") if src in df.columns else pd.Series(["unknown"] * len(df))
                df[tgt] = le.fit_transform(vals)
                encoders[src] = le
        else:
            for src, tgt in cols.items():
                le: LabelEncoder = encoders[src]
                known = set(le.classes_)
                vals = df[src].astype(str).fillna("unknown") if src in df.columns else pd.Series(["unknown"] * len(df))
                safe = vals.apply(lambda v: v if v in known else le.classes_[0])
                df[tgt] = le.transform(safe)

        return df, encoders

    # ==================================================================
    # Persistence
    # ==================================================================

    def _persist(self) -> None:
        self.scaler_path.parent.mkdir(parents=True, exist_ok=True)
        with open(self.scaler_path, "wb") as f:
            pickle.dump(self._stats, f)
        logger.info("FeatureEngineer: stats saved to %s", self.scaler_path)

    def _load(self) -> None:
        if not self.scaler_path.exists():
            raise FileNotFoundError(f"feature_scaler.pkl not found at {self.scaler_path}")
        with open(self.scaler_path, "rb") as f:
            self._stats = pickle.load(f)
        logger.info("FeatureEngineer: stats loaded from %s", self.scaler_path)
