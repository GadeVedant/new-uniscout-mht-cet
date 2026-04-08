"""
Cold_Start_Handler: tiered fallback predictions for unseen college-branch-category combinations.

Feature: mhtcet-cutoff-prediction
Requirements: 4.1–4.5
"""
from __future__ import annotations

import logging
import pickle
from pathlib import Path

import numpy as np
import pandas as pd

logger = logging.getLogger(__name__)

DEFAULT_HANDLER_PATH = Path(__file__).parent.parent / "models" / "cold_start_handler.pkl"


class ColdStartHandler:
    """Provides tiered fallback predictions for unseen combinations.

    Tiers (in order of preference):
      1. district_mean  — keyed by (district, category, cap_round)  → confidence_cap 0.50
      2. state_mean     — keyed by (category, cap_round)            → confidence_cap 0.35
      3. global_median  — keyed by (category, cap_round)            → confidence_cap 0.25
      4. absolute fallback — global median across all data          → confidence_cap 0.25
    """

    def __init__(self) -> None:
        self.district_mean: dict[tuple, float] = {}
        self.state_mean: dict[tuple, float] = {}
        self.global_median: dict[tuple, float] = {}
        self._absolute_fallback: float = 50.0  # last-resort value

    # ------------------------------------------------------------------
    # fit
    # ------------------------------------------------------------------
    def fit(self, df: pd.DataFrame) -> "ColdStartHandler":
        """Populate lookup tables from training data.

        Parameters
        ----------
        df : pd.DataFrame
            Normalised training data with at least the columns:
            district, category, cap_round, cutoff_percentile.
        """
        required = {"category", "cap_round", "cutoff_percentile"}
        missing = required - set(df.columns)
        if missing:
            raise ValueError(f"ColdStartHandler.fit: missing columns {missing}")

        df = df.copy()
        df["cutoff_percentile"] = pd.to_numeric(df["cutoff_percentile"], errors="coerce")
        df = df.dropna(subset=["cutoff_percentile"])

        # ---- 1. district_mean: (district, category, cap_round) → mean ----
        if "district" in df.columns:
            district_grp = (
                df.dropna(subset=["district"])
                .groupby(["district", "category", "cap_round"])["cutoff_percentile"]
                .mean()
            )
            self.district_mean = {k: float(v) for k, v in district_grp.items()}
        else:
            self.district_mean = {}

        # ---- 2. state_mean: (category, cap_round) → mean -----------------
        state_grp = (
            df.groupby(["category", "cap_round"])["cutoff_percentile"].mean()
        )
        self.state_mean = {k: float(v) for k, v in state_grp.items()}

        # ---- 3. global_median: (category, cap_round) → median ------------
        global_med_grp = (
            df.groupby(["category", "cap_round"])["cutoff_percentile"].median()
        )
        self.global_median = {k: float(v) for k, v in global_med_grp.items()}

        # ---- 4. absolute fallback ----------------------------------------
        self._absolute_fallback = float(df["cutoff_percentile"].median())

        logger.info(
            "ColdStartHandler.fit: %d district keys, %d state keys, %d global keys",
            len(self.district_mean),
            len(self.state_mean),
            len(self.global_median),
        )
        return self

    # ------------------------------------------------------------------
    # get_fallback
    # ------------------------------------------------------------------
    def get_fallback(
        self,
        branch_name: str,
        category: str,
        cap_round: str,
        district: str = "",
        college_code: str = "",
    ) -> dict:
        """Return a tiered fallback prediction dict.

        Returns
        -------
        dict with keys:
            p50              : float  — fallback cutoff estimate
            confidence_score : float  — capped at tier limit
            fallback_reason  : str    — "district_average" | "state_average" | "global_median"
        """
        # Tier 1 — district
        if district:
            key = (district, category, cap_round)
            if key in self.district_mean:
                return {
                    "p50": self.district_mean[key],
                    "confidence_score": 0.50,
                    "fallback_reason": "district_average",
                }

        # Tier 2 — state
        state_key = (category, cap_round)
        if state_key in self.state_mean:
            return {
                "p50": self.state_mean[state_key],
                "confidence_score": 0.35,
                "fallback_reason": "state_average",
            }

        # Tier 3 — global median for (category, cap_round)
        if state_key in self.global_median:
            return {
                "p50": self.global_median[state_key],
                "confidence_score": 0.25,
                "fallback_reason": "global_median",
            }

        # Tier 4 — absolute fallback (guarantee non-null)
        return {
            "p50": self._absolute_fallback,
            "confidence_score": 0.25,
            "fallback_reason": "global_median",
        }

    # ------------------------------------------------------------------
    # persistence
    # ------------------------------------------------------------------
    def save(self, path: str | Path = DEFAULT_HANDLER_PATH) -> None:
        """Pickle the handler to disk."""
        path = Path(path)
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "wb") as f:
            pickle.dump(self, f)
        logger.info("ColdStartHandler saved to %s", path)

    @classmethod
    def load(cls, path: str | Path = DEFAULT_HANDLER_PATH) -> "ColdStartHandler":
        """Load a pickled handler from disk."""
        path = Path(path)
        if not path.exists():
            raise FileNotFoundError(
                f"ColdStartHandler artifact not found at {path}. Run fit() first."
            )
        with open(path, "rb") as f:
            handler = pickle.load(f)
        logger.info("ColdStartHandler loaded from %s", path)
        return handler
