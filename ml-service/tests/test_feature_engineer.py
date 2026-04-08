"""
Unit tests for FeatureEngineer.fit_transform and transform.

Feature: mhtcet-cutoff-prediction
Requirements: 2.1–2.11, 9.1
"""
from __future__ import annotations

import pickle
import tempfile
from pathlib import Path

import numpy as np
import pandas as pd
import pytest

from app.feature_engineer import FeatureEngineer, _LAG_GROUP, _SAMPLE_GROUP


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

def _make_df(rows: list[dict]) -> pd.DataFrame:
    """Build a minimal DataFrame from a list of row dicts."""
    defaults = {
        "college_code": "C1",
        "college_name": "Test College",
        "branch_name": "CS",
        "category": "OPEN",
        "cap_round": "I",
        "year": 2022,
        "cutoff_percentile": 80.0,
        "location": "Pune",
        "district": "Pune",
        "fees": 50000,
        "intake": 60,
        "exam_type": "mhtcet",
    }
    return pd.DataFrame([{**defaults, **r} for r in rows])


def _three_year_df() -> pd.DataFrame:
    """3 years of data for one group — enough for all lags."""
    return _make_df([
        {"year": 2021, "cutoff_percentile": 75.0},
        {"year": 2022, "cutoff_percentile": 78.0},
        {"year": 2023, "cutoff_percentile": 82.0},
    ])


def _fe(tmp_path: Path) -> FeatureEngineer:
    return FeatureEngineer(scaler_path=tmp_path / "feature_scaler.pkl")


# ---------------------------------------------------------------------------
# 2.1 — Lag features
# ---------------------------------------------------------------------------

class TestLagFeatures:
    def test_lag_values_correct(self, tmp_path):
        df = _three_year_df()
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        out = out.sort_values("year").reset_index(drop=True)

        # Year 2023 should have t1=2022 cutoff, t2=2021 cutoff
        row_2023 = out[out["year"] == 2023].iloc[0]
        assert row_2023["cutoff_t1"] == pytest.approx(78.0)
        assert row_2023["cutoff_t2"] == pytest.approx(75.0)

    def test_lag_t3_imputed_when_insufficient_history(self, tmp_path):
        """Only 2 years → t3 must be imputed (group mean)."""
        df = _make_df([
            {"year": 2022, "cutoff_percentile": 70.0},
            {"year": 2023, "cutoff_percentile": 80.0},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        row_2023 = out[out["year"] == 2023].iloc[0]
        # t3 is missing → imputed with group mean = (70+80)/2 = 75
        assert row_2023["cutoff_t3"] == pytest.approx(75.0)

    def test_is_cold_start_true_when_lag_imputed(self, tmp_path):
        df = _make_df([
            {"year": 2023, "cutoff_percentile": 80.0},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        assert out["is_cold_start"].all()

    def test_is_cold_start_false_when_full_history(self, tmp_path):
        df = _make_df([
            {"year": 2020, "cutoff_percentile": 70.0},
            {"year": 2021, "cutoff_percentile": 72.0},
            {"year": 2022, "cutoff_percentile": 74.0},
            {"year": 2023, "cutoff_percentile": 76.0},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        row_2023 = out[out["year"] == 2023].iloc[0]
        assert row_2023["is_cold_start"] is False or row_2023["is_cold_start"] == False

    def test_no_nan_lags_after_fit_transform(self, tmp_path):
        df = _three_year_df()
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        for col in ["cutoff_t1", "cutoff_t2", "cutoff_t3"]:
            assert out[col].isna().sum() == 0, f"{col} has NaN values"


# ---------------------------------------------------------------------------
# 2.2 — Volatility
# ---------------------------------------------------------------------------

class TestVolatility:
    def test_volatility_zero_for_single_row(self, tmp_path):
        df = _make_df([{"year": 2023, "cutoff_percentile": 80.0}])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        assert out["cutoff_volatility"].iloc[0] == pytest.approx(0.0)

    def test_volatility_nonzero_for_multiple_years(self, tmp_path):
        df = _three_year_df()
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        # Last row should have non-zero volatility
        last = out.sort_values("year").iloc[-1]
        assert last["cutoff_volatility"] > 0.0

    def test_volatility_matches_std(self, tmp_path):
        """For a group with 3 years, last row volatility = std of all 3 values."""
        df = _three_year_df()
        fe = _fe(tmp_path)
        out = fe.fit_transform(df).sort_values("year").reset_index(drop=True)
        expected_std = float(np.std([75.0, 78.0, 82.0], ddof=1))
        assert out.iloc[-1]["cutoff_volatility"] == pytest.approx(expected_std, rel=1e-3)


# ---------------------------------------------------------------------------
# 2.3 — CAP round delta
# ---------------------------------------------------------------------------

class TestCapRoundDelta:
    def test_delta_correct_when_both_rounds_present(self, tmp_path):
        df = _make_df([
            {"cap_round": "I",  "cutoff_percentile": 85.0, "year": 2023},
            {"cap_round": "II", "cutoff_percentile": 80.0, "year": 2023},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        row_r1 = out[out["cap_round"] == "I"].iloc[0]
        assert row_r1["cap_round_delta"] == pytest.approx(5.0)

    def test_delta_zero_when_round_missing(self, tmp_path):
        df = _make_df([
            {"cap_round": "I", "cutoff_percentile": 85.0, "year": 2023},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        assert out["cap_round_delta"].iloc[0] == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# 2.4 — College prestige score
# ---------------------------------------------------------------------------

class TestCollegePrestige:
    def test_prestige_equals_mean_in_most_recent_year(self, tmp_path):
        df = _make_df([
            {"year": 2022, "cutoff_percentile": 70.0, "branch_name": "CS"},
            {"year": 2023, "cutoff_percentile": 80.0, "branch_name": "CS"},
            {"year": 2023, "cutoff_percentile": 90.0, "branch_name": "IT"},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        # Most recent year = 2023; mean for C1 = (80+90)/2 = 85
        rows_2023 = out[out["year"] == 2023]
        assert rows_2023["college_prestige_score"].iloc[0] == pytest.approx(85.0)

    def test_prestige_fallback_for_unseen_college(self, tmp_path):
        df = _three_year_df()
        fe = _fe(tmp_path)
        fe.fit_transform(df)

        # Inference with unseen college
        inf_df = _make_df([{"college_code": "UNSEEN", "year": 2024, "cutoff_percentile": 70.0}])
        out = fe.transform(inf_df)
        # Should use global mean, not NaN
        assert pd.notna(out["college_prestige_score"].iloc[0])


# ---------------------------------------------------------------------------
# 2.5 — Branch demand index
# ---------------------------------------------------------------------------

class TestBranchDemand:
    def test_demand_equals_mean_in_most_recent_year(self, tmp_path):
        df = _make_df([
            {"year": 2022, "cutoff_percentile": 60.0, "college_code": "C1"},
            {"year": 2023, "cutoff_percentile": 80.0, "college_code": "C1"},
            {"year": 2023, "cutoff_percentile": 90.0, "college_code": "C2"},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        rows_2023 = out[out["year"] == 2023]
        # branch CS in 2023: mean of 80 and 90 = 85
        assert rows_2023["branch_demand_index"].iloc[0] == pytest.approx(85.0)


# ---------------------------------------------------------------------------
# 2.6 — Category fill rate
# ---------------------------------------------------------------------------

class TestCategoryFillRate:
    def test_fill_rate_present_when_intake_available(self, tmp_path):
        df = _make_df([{"intake": 60, "cutoff_percentile": 80.0}])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        assert 0.0 <= out["category_fill_rate"].iloc[0] <= 1.0

    def test_fill_rate_fallback_when_intake_missing(self, tmp_path):
        df = _make_df([
            {"intake": 60, "cutoff_percentile": 80.0, "category": "OPEN"},
            {"intake": np.nan, "cutoff_percentile": 70.0, "category": "OPEN"},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        # Row with missing intake should still have a valid fill rate
        row_missing = out[out["intake"].isna()].iloc[0]
        assert pd.notna(row_missing["category_fill_rate"])
        assert 0.0 <= row_missing["category_fill_rate"] <= 1.0


# ---------------------------------------------------------------------------
# 2.7 — Seat count
# ---------------------------------------------------------------------------

class TestSeatCount:
    def test_seat_count_equals_intake_when_present(self, tmp_path):
        df = _make_df([{"intake": 120}])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        assert out["seat_count"].iloc[0] == pytest.approx(120.0)

    def test_seat_count_imputed_with_branch_median(self, tmp_path):
        df = _make_df([
            {"intake": 60, "branch_name": "CS"},
            {"intake": 80, "branch_name": "CS"},
            {"intake": np.nan, "branch_name": "CS"},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        row_missing = out[out["intake"].isna()].iloc[0]
        # Branch median of [60, 80] = 70
        assert row_missing["seat_count"] == pytest.approx(70.0)


# ---------------------------------------------------------------------------
# 2.8 — Location influence
# ---------------------------------------------------------------------------

class TestLocationInfluence:
    def test_location_influence_equals_mean_cutoff_for_location(self, tmp_path):
        df = _make_df([
            {"location": "Pune", "cutoff_percentile": 80.0, "college_code": "C1"},
            {"location": "Pune", "cutoff_percentile": 90.0, "college_code": "C2"},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        assert out["location_influence"].iloc[0] == pytest.approx(85.0)

    def test_location_influence_fallback_for_unseen_location(self, tmp_path):
        df = _three_year_df()
        fe = _fe(tmp_path)
        fe.fit_transform(df)

        inf_df = _make_df([{"location": "UNKNOWN_CITY", "cutoff_percentile": 70.0}])
        out = fe.transform(inf_df)
        assert pd.notna(out["location_influence"].iloc[0])


# ---------------------------------------------------------------------------
# 2.9 — exam_type encoding
# ---------------------------------------------------------------------------

class TestExamTypeEncoding:
    def test_exam_type_is_integer(self, tmp_path):
        df = _three_year_df()
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        assert out["exam_type"].dtype in (np.int64, np.int32, int, "int64", "int32")

    def test_exam_type_consistent_at_inference(self, tmp_path):
        df = _three_year_df()
        fe = _fe(tmp_path)
        train_out = fe.fit_transform(df)
        train_val = int(train_out["exam_type"].iloc[0])

        inf_df = _make_df([{"exam_type": "mhtcet", "cutoff_percentile": 70.0}])
        inf_out = fe.transform(inf_df)
        assert int(inf_out["exam_type"].iloc[0]) == train_val

    def test_unseen_exam_type_does_not_raise(self, tmp_path):
        df = _three_year_df()
        fe = _fe(tmp_path)
        fe.fit_transform(df)

        inf_df = _make_df([{"exam_type": "jee", "cutoff_percentile": 70.0}])
        out = fe.transform(inf_df)  # should not raise
        assert pd.notna(out["exam_type"].iloc[0])


# ---------------------------------------------------------------------------
# 2.10 — Cold start flag
# ---------------------------------------------------------------------------

class TestColdStart:
    def test_cold_start_true_for_new_group(self, tmp_path):
        df = _make_df([{"year": 2023, "cutoff_percentile": 80.0}])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        assert bool(out["is_cold_start"].iloc[0]) is True

    def test_cold_start_false_for_group_with_3_years(self, tmp_path):
        df = _make_df([
            {"year": 2020, "cutoff_percentile": 70.0},
            {"year": 2021, "cutoff_percentile": 72.0},
            {"year": 2022, "cutoff_percentile": 74.0},
            {"year": 2023, "cutoff_percentile": 76.0},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        row_2023 = out[out["year"] == 2023].iloc[0]
        assert bool(row_2023["is_cold_start"]) is False


# ---------------------------------------------------------------------------
# 2.11 — Global cutoff shift
# ---------------------------------------------------------------------------

class TestGlobalCutoffShift:
    def test_shift_correct_for_two_years(self, tmp_path):
        df = _make_df([
            {"year": 2022, "cutoff_percentile": 70.0},
            {"year": 2023, "cutoff_percentile": 80.0},
        ])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        # shift = mean(2023) - mean(2022) = 80 - 70 = 10
        assert out["global_cutoff_shift"].iloc[0] == pytest.approx(10.0)

    def test_shift_zero_for_single_year(self, tmp_path):
        df = _make_df([{"year": 2023, "cutoff_percentile": 80.0}])
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        assert out["global_cutoff_shift"].iloc[0] == pytest.approx(0.0)


# ---------------------------------------------------------------------------
# Persistence and transform
# ---------------------------------------------------------------------------

class TestPersistenceAndTransform:
    def test_feature_scaler_pkl_created(self, tmp_path):
        df = _three_year_df()
        fe = _fe(tmp_path)
        fe.fit_transform(df)
        assert (tmp_path / "feature_scaler.pkl").exists()

    def test_sample_size_lookup_in_pkl(self, tmp_path):
        df = _three_year_df()
        fe = _fe(tmp_path)
        fe.fit_transform(df)
        with open(tmp_path / "feature_scaler.pkl", "rb") as f:
            stats = pickle.load(f)
        assert "sample_size_lookup" in stats
        key = ("C1", "CS", "OPEN")
        assert key in stats["sample_size_lookup"]
        assert stats["sample_size_lookup"][key] == 3

    def test_transform_uses_stored_stats_not_refit(self, tmp_path):
        """transform() should not recompute prestige from inference data."""
        train_df = _make_df([
            {"year": 2022, "cutoff_percentile": 90.0, "college_code": "C1"},
            {"year": 2023, "cutoff_percentile": 90.0, "college_code": "C1"},
        ])
        fe = _fe(tmp_path)
        fe.fit_transform(train_df)

        # Inference with different cutoff — prestige should still be 90 (from training)
        inf_df = _make_df([
            {"year": 2024, "cutoff_percentile": 50.0, "college_code": "C1"},
        ])
        out = fe.transform(inf_df)
        assert out["college_prestige_score"].iloc[0] == pytest.approx(90.0)

    def test_transform_loads_pkl_when_stats_empty(self, tmp_path):
        """A fresh FeatureEngineer instance should load pkl on transform()."""
        df = _three_year_df()
        fe1 = _fe(tmp_path)
        fe1.fit_transform(df)

        # New instance — no in-memory stats
        fe2 = _fe(tmp_path)
        inf_df = _make_df([{"year": 2024, "cutoff_percentile": 70.0}])
        out = fe2.transform(inf_df)  # should load pkl and not raise
        assert "college_prestige_score" in out.columns

    def test_all_11_feature_columns_present(self, tmp_path):
        df = _three_year_df()
        fe = _fe(tmp_path)
        out = fe.fit_transform(df)
        expected = [
            "cutoff_t1", "cutoff_t2", "cutoff_t3",
            "cutoff_volatility", "cap_round_delta",
            "college_prestige_score", "branch_demand_index",
            "category_fill_rate", "seat_count",
            "location_influence", "global_cutoff_shift",
            "exam_type", "is_cold_start",
        ]
        for col in expected:
            assert col in out.columns, f"Missing column: {col}"


# ===========================================================================
# Property-Based Tests (Tasks 4.3 – 4.11)
# Feature: mhtcet-cutoff-prediction
# ===========================================================================

from hypothesis import given, settings, assume
from hypothesis import strategies as st
import math


# ---------------------------------------------------------------------------
# Shared strategies
# ---------------------------------------------------------------------------

_CATEGORIES = ["OPEN", "OBC", "SC", "ST"]
_ROUNDS = ["I", "II", "III"]
_EXAM_TYPES = ["mhtcet", "jee", "neet"]

_cutoff = st.floats(min_value=1.0, max_value=99.0, allow_nan=False, allow_infinity=False)
_year_base = st.integers(min_value=2015, max_value=2022)
_n_extra = st.integers(min_value=0, max_value=4)  # extra years beyond base


def _build_group_df(
    college_code: str,
    branch_name: str,
    category: str,
    cap_round: str,
    years: list[int],
    cutoffs: list[float],
    exam_type: str = "mhtcet",
) -> pd.DataFrame:
    """Build a single-group DataFrame from parallel year/cutoff lists."""
    rows = []
    for y, c in zip(years, cutoffs):
        rows.append({
            "college_code": college_code,
            "college_name": "Test College",
            "branch_name": branch_name,
            "category": category,
            "cap_round": cap_round,
            "year": y,
            "cutoff_percentile": c,
            "location": "Pune",
            "district": "Pune",
            "fees": 50000,
            "intake": 60,
            "exam_type": exam_type,
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Property 5: Lag feature correctness (Task 4.3)
# Validates: Requirements 2.1
# ---------------------------------------------------------------------------

# Feature: mhtcet-cutoff-prediction, Property 5: For any group with ≥N years of history, cutoff_tN equals the cutoff exactly N years prior.

@settings(max_examples=100, deadline=None)
@given(
    year_base=_year_base,
    n_extra=st.integers(min_value=2, max_value=5),
    cutoffs=st.lists(_cutoff, min_size=6, max_size=6),
    category=st.sampled_from(_CATEGORIES),
    cap_round=st.sampled_from(_ROUNDS),
)
def test_property5_lag_feature_correctness(tmp_path, year_base, n_extra, cutoffs, category, cap_round):
    # Feature: mhtcet-cutoff-prediction, Property 5: For any group with ≥N years of history, cutoff_tN equals the cutoff exactly N years prior.
    n_years = n_extra + 3  # at least 5 years so all 3 lags are available for the last row
    years = list(range(year_base, year_base + n_years))
    used_cutoffs = cutoffs[:n_years] if n_years <= len(cutoffs) else cutoffs + [50.0] * (n_years - len(cutoffs))

    df = _build_group_df("C1", "CS", category, cap_round, years, used_cutoffs)
    fe = FeatureEngineer(scaler_path=tmp_path / "scaler.pkl")
    out = fe.fit_transform(df).sort_values("year").reset_index(drop=True)

    # The last row should have full lag history
    last_idx = len(out) - 1
    last_year = out.loc[last_idx, "year"]

    # Find the cutoff values for t-1, t-2, t-3 years
    for lag in (1, 2, 3):
        target_year = last_year - lag
        target_rows = out[out["year"] == target_year]
        if len(target_rows) == 0:
            continue
        expected = float(target_rows.iloc[0]["cutoff_percentile"])
        actual = float(out.loc[last_idx, f"cutoff_t{lag}"])
        assert abs(actual - expected) < 1e-6, (
            f"cutoff_t{lag} mismatch: expected {expected}, got {actual} (year={last_year}, lag={lag})"
        )


# ---------------------------------------------------------------------------
# Property 6: Volatility correctness (Task 4.4)
# Validates: Requirements 2.2
# ---------------------------------------------------------------------------

# Feature: mhtcet-cutoff-prediction, Property 6: cutoff_volatility equals std(cutoff_percentile) for each group (expanding std, ddof=1, 0 for single row).

@settings(max_examples=100, deadline=None)
@given(
    year_base=_year_base,
    cutoffs=st.lists(_cutoff, min_size=1, max_size=6),
    category=st.sampled_from(_CATEGORIES),
    cap_round=st.sampled_from(_ROUNDS),
)
def test_property6_volatility_correctness(tmp_path, year_base, cutoffs, category, cap_round):
    # Feature: mhtcet-cutoff-prediction, Property 6: cutoff_volatility equals std(cutoff_percentile) for each group (expanding std, ddof=1, 0 for single row).
    n = len(cutoffs)
    years = list(range(year_base, year_base + n))

    df = _build_group_df("C1", "CS", category, cap_round, years, cutoffs)
    fe = FeatureEngineer(scaler_path=tmp_path / "scaler.pkl")
    out = fe.fit_transform(df).sort_values("year").reset_index(drop=True)

    # For each row i, volatility should equal std of cutoffs[0..i] (expanding, ddof=1, 0 for single)
    for i in range(n):
        window = cutoffs[:i + 1]
        if len(window) == 1:
            expected_vol = 0.0
        else:
            expected_vol = float(np.std(window, ddof=1))
        actual_vol = float(out.loc[i, "cutoff_volatility"])
        assert abs(actual_vol - expected_vol) < 1e-4, (
            f"Row {i}: volatility mismatch: expected {expected_vol:.6f}, got {actual_vol:.6f}"
        )


# ---------------------------------------------------------------------------
# Property 7: cap_round_delta correctness (Task 4.5)
# Validates: Requirements 2.3
# ---------------------------------------------------------------------------

# Feature: mhtcet-cutoff-prediction, Property 7: For any combination where both Round I and Round II exist, cap_round_delta == cutoff_round_I − cutoff_round_II.

@settings(max_examples=100, deadline=None)
@given(
    cutoff_r1=_cutoff,
    cutoff_r2=_cutoff,
    year=st.integers(min_value=2018, max_value=2024),
    category=st.sampled_from(_CATEGORIES),
)
def test_property7_cap_round_delta_correctness(tmp_path, cutoff_r1, cutoff_r2, year, category):
    # Feature: mhtcet-cutoff-prediction, Property 7: For any combination where both Round I and Round II exist, cap_round_delta == cutoff_round_I − cutoff_round_II.
    rows = [
        {
            "college_code": "C1", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "I", "year": year,
            "cutoff_percentile": cutoff_r1, "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        },
        {
            "college_code": "C1", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "II", "year": year,
            "cutoff_percentile": cutoff_r2, "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        },
    ]
    df = pd.DataFrame(rows)
    fe = FeatureEngineer(scaler_path=tmp_path / "scaler.pkl")
    out = fe.fit_transform(df)

    row_r1 = out[out["cap_round"] == "I"].iloc[0]
    expected_delta = cutoff_r1 - cutoff_r2
    actual_delta = float(row_r1["cap_round_delta"])
    assert abs(actual_delta - expected_delta) < 1e-6, (
        f"cap_round_delta mismatch: expected {expected_delta:.6f}, got {actual_delta:.6f}"
    )


# ---------------------------------------------------------------------------
# Property 8: Prestige and demand index correctness (Task 4.6)
# Validates: Requirements 2.4, 2.5
# ---------------------------------------------------------------------------

# Feature: mhtcet-cutoff-prediction, Property 8: college_prestige_score and branch_demand_index equal the respective means in the most recent year.

@settings(max_examples=100, deadline=None)
@given(
    cutoffs_2022=st.lists(_cutoff, min_size=1, max_size=4),
    cutoffs_2023=st.lists(_cutoff, min_size=1, max_size=4),
    category=st.sampled_from(_CATEGORIES),
)
def test_property8_prestige_and_demand_correctness(tmp_path, cutoffs_2022, cutoffs_2023, category):
    # Feature: mhtcet-cutoff-prediction, Property 8: college_prestige_score and branch_demand_index equal the respective means in the most recent year.
    rows = []
    branches = [f"BR{i}" for i in range(len(cutoffs_2022))]
    for i, c in enumerate(cutoffs_2022):
        rows.append({
            "college_code": "C1", "college_name": "Test", "branch_name": branches[i],
            "category": category, "cap_round": "I", "year": 2022,
            "cutoff_percentile": c, "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        })
    for i, c in enumerate(cutoffs_2023):
        br = f"BR{i}"
        rows.append({
            "college_code": "C1", "college_name": "Test", "branch_name": br,
            "category": category, "cap_round": "I", "year": 2023,
            "cutoff_percentile": c, "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        })

    df = pd.DataFrame(rows)
    fe = FeatureEngineer(scaler_path=tmp_path / "scaler.pkl")
    out = fe.fit_transform(df)

    # college_prestige_score for C1 = mean of all 2023 cutoffs for C1
    expected_prestige = float(np.mean(cutoffs_2023))
    rows_2023 = out[out["year"] == 2023]
    for _, row in rows_2023.iterrows():
        assert abs(float(row["college_prestige_score"]) - expected_prestige) < 1e-4, (
            f"college_prestige_score mismatch: expected {expected_prestige:.4f}, got {row['college_prestige_score']:.4f}"
        )

    # branch_demand_index for each branch in 2023 = mean cutoff for that branch in 2023
    for i, c in enumerate(cutoffs_2023):
        br = f"BR{i}"
        branch_rows_2023 = out[(out["year"] == 2023) & (out["branch_name"] == br)]
        if len(branch_rows_2023) == 0:
            continue
        # All rows for this branch in 2023 from C1 — demand = mean across all colleges for this branch in 2023
        # Since only C1 exists, demand = c
        expected_demand = c
        actual_demand = float(branch_rows_2023.iloc[0]["branch_demand_index"])
        assert abs(actual_demand - expected_demand) < 1e-4, (
            f"branch_demand_index mismatch for {br}: expected {expected_demand:.4f}, got {actual_demand:.4f}"
        )


# ---------------------------------------------------------------------------
# Property 9: Fill rate and seat count imputation (Task 4.7)
# Validates: Requirements 2.6, 2.7
# ---------------------------------------------------------------------------

# Feature: mhtcet-cutoff-prediction, Property 9: category_fill_rate and seat_count are correct when intake is present; median fallback when intake is missing.

@settings(max_examples=100, deadline=None)
@given(
    intakes=st.lists(st.integers(min_value=10, max_value=200), min_size=2, max_size=5),
    cutoffs=st.lists(_cutoff, min_size=2, max_size=5),
    category=st.sampled_from(_CATEGORIES),
)
def test_property9_fill_rate_and_seat_count_imputation(tmp_path, intakes, cutoffs, category):
    # Feature: mhtcet-cutoff-prediction, Property 9: category_fill_rate and seat_count are correct when intake is present; median fallback when intake is missing.
    n = min(len(intakes), len(cutoffs))
    assume(n >= 2)

    rows = []
    for i in range(n):
        rows.append({
            "college_code": f"C{i}", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "I", "year": 2023,
            "cutoff_percentile": float(cutoffs[i]), "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": float(intakes[i]), "exam_type": "mhtcet",
        })
    # Add one row with missing intake
    rows.append({
        "college_code": "CMISSING", "college_name": "Test", "branch_name": "CS",
        "category": category, "cap_round": "I", "year": 2023,
        "cutoff_percentile": 50.0, "location": "Pune", "district": "Pune",
        "fees": 50000, "intake": np.nan, "exam_type": "mhtcet",
    })

    df = pd.DataFrame(rows)
    fe = FeatureEngineer(scaler_path=tmp_path / "scaler.pkl")
    out = fe.fit_transform(df)

    # Rows with intake present: seat_count == intake
    for i in range(n):
        row = out[out["college_code"] == f"C{i}"].iloc[0]
        assert abs(float(row["seat_count"]) - float(intakes[i])) < 1e-6, (
            f"seat_count mismatch for C{i}: expected {intakes[i]}, got {row['seat_count']}"
        )
        # fill_rate should be in [0, 1]
        assert 0.0 <= float(row["category_fill_rate"]) <= 1.0

    # Row with missing intake: seat_count == branch median of CS
    branch_median = float(np.median([float(x) for x in intakes[:n]]))
    missing_row = out[out["college_code"] == "CMISSING"].iloc[0]
    assert abs(float(missing_row["seat_count"]) - branch_median) < 1e-4, (
        f"seat_count fallback mismatch: expected median {branch_median}, got {missing_row['seat_count']}"
    )
    # fill_rate for missing intake row should still be valid
    assert pd.notna(missing_row["category_fill_rate"])
    assert 0.0 <= float(missing_row["category_fill_rate"]) <= 1.0


# ---------------------------------------------------------------------------
# Property 10: Location influence correctness (Task 4.8)
# Validates: Requirements 2.8
# ---------------------------------------------------------------------------

# Feature: mhtcet-cutoff-prediction, Property 10: location_influence equals mean cutoff of all colleges in that location/district.

@settings(max_examples=100, deadline=None)
@given(
    cutoffs=st.lists(_cutoff, min_size=1, max_size=6),
    location=st.text(alphabet=st.characters(whitelist_categories=("Lu", "Ll")), min_size=3, max_size=10),
    category=st.sampled_from(_CATEGORIES),
)
def test_property10_location_influence_correctness(tmp_path, cutoffs, location, category):
    # Feature: mhtcet-cutoff-prediction, Property 10: location_influence equals mean cutoff of all colleges in that location/district.
    rows = []
    for i, c in enumerate(cutoffs):
        rows.append({
            "college_code": f"C{i}", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "I", "year": 2023,
            "cutoff_percentile": float(c), "location": location, "district": location,
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        })

    df = pd.DataFrame(rows)
    fe = FeatureEngineer(scaler_path=tmp_path / "scaler.pkl")
    out = fe.fit_transform(df)

    expected_influence = float(np.mean(cutoffs))
    for _, row in out.iterrows():
        actual = float(row["location_influence"])
        assert abs(actual - expected_influence) < 1e-4, (
            f"location_influence mismatch: expected {expected_influence:.4f}, got {actual:.4f}"
        )


# ---------------------------------------------------------------------------
# Property 11: exam_type encoding consistency (Task 4.9)
# Validates: Requirements 2.9, 9.1, 9.2
# ---------------------------------------------------------------------------

# Feature: mhtcet-cutoff-prediction, Property 11: exam_type has the same integer encoding at training and inference time; all rows carry the passed exam_type.

@settings(max_examples=100, deadline=None)
@given(
    exam_type=st.sampled_from(_EXAM_TYPES),
    n_rows=st.integers(min_value=1, max_value=5),
    cutoffs=st.lists(_cutoff, min_size=5, max_size=5),
)
def test_property11_exam_type_encoding_consistency(tmp_path, exam_type, n_rows, cutoffs):
    # Feature: mhtcet-cutoff-prediction, Property 11: exam_type has the same integer encoding at training and inference time; all rows carry the passed exam_type.
    # Training data: use the given exam_type
    train_rows = []
    for i in range(n_rows):
        train_rows.append({
            "college_code": "C1", "college_name": "Test", "branch_name": "CS",
            "category": "OPEN", "cap_round": "I", "year": 2020 + i,
            "cutoff_percentile": float(cutoffs[i]), "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": exam_type,
        })
    train_df = pd.DataFrame(train_rows)
    fe = FeatureEngineer(scaler_path=tmp_path / "scaler.pkl")
    train_out = fe.fit_transform(train_df)

    # All training rows should have the same integer encoding
    train_encoded = train_out["exam_type"].unique()
    assert len(train_encoded) == 1, f"Expected single encoding, got {train_encoded}"
    train_val = int(train_encoded[0])

    # Inference with same exam_type should produce same encoding
    inf_df = pd.DataFrame([{
        "college_code": "C1", "college_name": "Test", "branch_name": "CS",
        "category": "OPEN", "cap_round": "I", "year": 2025,
        "cutoff_percentile": 70.0, "location": "Pune", "district": "Pune",
        "fees": 50000, "intake": 60, "exam_type": exam_type,
    }])
    inf_out = fe.transform(inf_df)
    inf_val = int(inf_out["exam_type"].iloc[0])
    assert inf_val == train_val, (
        f"exam_type encoding inconsistency: train={train_val}, inference={inf_val}"
    )

    # All inference rows carry the exam_type column
    assert "exam_type" in inf_out.columns
    assert pd.notna(inf_out["exam_type"].iloc[0])


# ---------------------------------------------------------------------------
# Property 12: Cold start lag imputation and flag (Task 4.10)
# Validates: Requirements 2.10
# ---------------------------------------------------------------------------

# Feature: mhtcet-cutoff-prediction, Property 12: For rows with insufficient history, missing lags equal group mean and is_cold_start == True.

@settings(max_examples=100, deadline=None)
@given(
    cutoffs=st.lists(_cutoff, min_size=1, max_size=2),
    category=st.sampled_from(_CATEGORIES),
    cap_round=st.sampled_from(_ROUNDS),
    year_base=_year_base,
)
def test_property12_cold_start_lag_imputation_and_flag(tmp_path, cutoffs, category, cap_round, year_base):
    # Feature: mhtcet-cutoff-prediction, Property 12: For rows with insufficient history, missing lags equal group mean and is_cold_start == True.
    # Use 1 or 2 years — not enough for all 3 lags
    n = len(cutoffs)
    years = list(range(year_base, year_base + n))

    df = _build_group_df("C1", "CS", category, cap_round, years, cutoffs)
    fe = FeatureEngineer(scaler_path=tmp_path / "scaler.pkl")
    out = fe.fit_transform(df).sort_values("year").reset_index(drop=True)

    group_mean = float(np.mean(cutoffs))

    for i, row in out.iterrows():
        # is_cold_start must be True for any row that had a missing lag
        assert bool(row["is_cold_start"]) is True, (
            f"Row {i} (year={row['year']}): expected is_cold_start=True"
        )
        # All lag columns must be non-NaN (imputed)
        for lag in (1, 2, 3):
            col = f"cutoff_t{lag}"
            assert pd.notna(row[col]), f"Row {i}: {col} is NaN after imputation"
            # Imputed value should equal group mean
            # (only check if the lag was actually missing — i.e., not enough history)
            lag_year = row["year"] - lag
            if lag_year not in years:
                assert abs(float(row[col]) - group_mean) < 1e-4, (
                    f"Row {i}: {col} imputed value {row[col]:.4f} != group mean {group_mean:.4f}"
                )


# ---------------------------------------------------------------------------
# Property 13: Global cutoff shift correctness (Task 4.11)
# Validates: Requirements 2.11
# ---------------------------------------------------------------------------

# Feature: mhtcet-cutoff-prediction, Property 13: For any dataset with ≥2 years, global_cutoff_shift == mean(current_year) − mean(previous_year).

@settings(max_examples=100, deadline=None)
@given(
    year_base=_year_base,
    cutoffs_prev=st.lists(_cutoff, min_size=1, max_size=5),
    cutoffs_curr=st.lists(_cutoff, min_size=1, max_size=5),
    category=st.sampled_from(_CATEGORIES),
)
def test_property13_global_cutoff_shift_correctness(tmp_path, year_base, cutoffs_prev, cutoffs_curr, category):
    # Feature: mhtcet-cutoff-prediction, Property 13: For any dataset with ≥2 years, global_cutoff_shift == mean(current_year) − mean(previous_year).
    prev_year = year_base
    curr_year = year_base + 1

    rows = []
    for i, c in enumerate(cutoffs_prev):
        rows.append({
            "college_code": f"C{i}", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "I", "year": prev_year,
            "cutoff_percentile": float(c), "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        })
    for i, c in enumerate(cutoffs_curr):
        rows.append({
            "college_code": f"C{i}", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "I", "year": curr_year,
            "cutoff_percentile": float(c), "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        })

    df = pd.DataFrame(rows)
    fe = FeatureEngineer(scaler_path=tmp_path / "scaler.pkl")
    out = fe.fit_transform(df)

    expected_shift = float(np.mean(cutoffs_curr)) - float(np.mean(cutoffs_prev))
    actual_shifts = out["global_cutoff_shift"].unique()
    assert len(actual_shifts) == 1, f"Expected single global_cutoff_shift value, got {actual_shifts}"
    actual_shift = float(actual_shifts[0])
    assert abs(actual_shift - expected_shift) < 1e-4, (
        f"global_cutoff_shift mismatch: expected {expected_shift:.4f}, got {actual_shift:.4f}"
    )


# ===========================================================================
# Property-Based Tests (Tasks 4.3 – 4.11)
# Feature: mhtcet-cutoff-prediction
# ===========================================================================

import tempfile
from hypothesis import given, settings, assume, HealthCheck
from hypothesis import strategies as st


# ---------------------------------------------------------------------------
# Shared strategies
# ---------------------------------------------------------------------------

_CATEGORIES = ["OPEN", "OBC", "SC", "ST"]
_ROUNDS = ["I", "II", "III"]
_EXAM_TYPES = ["mhtcet", "jee", "neet"]

_cutoff = st.floats(min_value=1.0, max_value=99.0, allow_nan=False, allow_infinity=False)
_year_base = st.integers(min_value=2015, max_value=2022)


def _build_group_df(
    college_code: str,
    branch_name: str,
    category: str,
    cap_round: str,
    years: list,
    cutoffs: list,
    exam_type: str = "mhtcet",
) -> pd.DataFrame:
    """Build a single-group DataFrame from parallel year/cutoff lists."""
    rows = []
    for y, c in zip(years, cutoffs):
        rows.append({
            "college_code": college_code,
            "college_name": "Test College",
            "branch_name": branch_name,
            "category": category,
            "cap_round": cap_round,
            "year": y,
            "cutoff_percentile": c,
            "location": "Pune",
            "district": "Pune",
            "fees": 50000,
            "intake": 60,
            "exam_type": exam_type,
        })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Property 5: Lag feature correctness (Task 4.3)
# Validates: Requirements 2.1
# ---------------------------------------------------------------------------

@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    year_base=_year_base,
    n_extra=st.integers(min_value=2, max_value=5),
    cutoffs=st.lists(_cutoff, min_size=8, max_size=8),
    category=st.sampled_from(_CATEGORIES),
    cap_round=st.sampled_from(_ROUNDS),
)
def test_property5_lag_feature_correctness(year_base, n_extra, cutoffs, category, cap_round):
    # Feature: mhtcet-cutoff-prediction, Property 5: For any group with ≥N years of history, cutoff_tN equals the cutoff exactly N years prior.
    n_years = n_extra + 3  # at least 5 years so all 3 lags are available for the last row
    years = list(range(year_base, year_base + n_years))
    used_cutoffs = cutoffs[:n_years]

    df = _build_group_df("C1", "CS", category, cap_round, years, used_cutoffs)

    with tempfile.TemporaryDirectory() as tmpdir:
        fe = FeatureEngineer(scaler_path=Path(tmpdir) / "scaler.pkl")
        out = fe.fit_transform(df).sort_values("year").reset_index(drop=True)

    # The last row should have full lag history
    last_idx = len(out) - 1
    last_year = out.loc[last_idx, "year"]

    for lag in (1, 2, 3):
        target_year = last_year - lag
        target_rows = out[out["year"] == target_year]
        if len(target_rows) == 0:
            continue
        expected = float(target_rows.iloc[0]["cutoff_percentile"])
        actual = float(out.loc[last_idx, f"cutoff_t{lag}"])
        assert abs(actual - expected) < 1e-6, (
            f"cutoff_t{lag} mismatch: expected {expected}, got {actual} (year={last_year}, lag={lag})"
        )


# ---------------------------------------------------------------------------
# Property 6: Volatility correctness (Task 4.4)
# Validates: Requirements 2.2
# ---------------------------------------------------------------------------

@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    year_base=_year_base,
    cutoffs=st.lists(_cutoff, min_size=1, max_size=6),
    category=st.sampled_from(_CATEGORIES),
    cap_round=st.sampled_from(_ROUNDS),
)
def test_property6_volatility_correctness(year_base, cutoffs, category, cap_round):
    # Feature: mhtcet-cutoff-prediction, Property 6: cutoff_volatility equals std(cutoff_percentile) for each group (expanding std, ddof=1, 0 for single row).
    n = len(cutoffs)
    years = list(range(year_base, year_base + n))

    df = _build_group_df("C1", "CS", category, cap_round, years, cutoffs)

    with tempfile.TemporaryDirectory() as tmpdir:
        fe = FeatureEngineer(scaler_path=Path(tmpdir) / "scaler.pkl")
        out = fe.fit_transform(df).sort_values("year").reset_index(drop=True)

    for i in range(n):
        window = cutoffs[:i + 1]
        expected_vol = 0.0 if len(window) == 1 else float(np.std(window, ddof=1))
        actual_vol = float(out.loc[i, "cutoff_volatility"])
        assert abs(actual_vol - expected_vol) < 1e-4, (
            f"Row {i}: volatility mismatch: expected {expected_vol:.6f}, got {actual_vol:.6f}"
        )


# ---------------------------------------------------------------------------
# Property 7: cap_round_delta correctness (Task 4.5)
# Validates: Requirements 2.3
# ---------------------------------------------------------------------------

@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    cutoff_r1=_cutoff,
    cutoff_r2=_cutoff,
    year=st.integers(min_value=2018, max_value=2024),
    category=st.sampled_from(_CATEGORIES),
)
def test_property7_cap_round_delta_correctness(cutoff_r1, cutoff_r2, year, category):
    # Feature: mhtcet-cutoff-prediction, Property 7: For any combination where both Round I and Round II exist, cap_round_delta == cutoff_round_I − cutoff_round_II.
    rows = [
        {
            "college_code": "C1", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "I", "year": year,
            "cutoff_percentile": cutoff_r1, "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        },
        {
            "college_code": "C1", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "II", "year": year,
            "cutoff_percentile": cutoff_r2, "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        },
    ]
    df = pd.DataFrame(rows)

    with tempfile.TemporaryDirectory() as tmpdir:
        fe = FeatureEngineer(scaler_path=Path(tmpdir) / "scaler.pkl")
        out = fe.fit_transform(df)

    row_r1 = out[out["cap_round"] == "I"].iloc[0]
    expected_delta = cutoff_r1 - cutoff_r2
    actual_delta = float(row_r1["cap_round_delta"])
    assert abs(actual_delta - expected_delta) < 1e-6, (
        f"cap_round_delta mismatch: expected {expected_delta:.6f}, got {actual_delta:.6f}"
    )


# ---------------------------------------------------------------------------
# Property 8: Prestige and demand index correctness (Task 4.6)
# Validates: Requirements 2.4, 2.5
# ---------------------------------------------------------------------------

@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    cutoffs_2022=st.lists(_cutoff, min_size=1, max_size=4),
    cutoffs_2023=st.lists(_cutoff, min_size=1, max_size=4),
    category=st.sampled_from(_CATEGORIES),
)
def test_property8_prestige_and_demand_correctness(cutoffs_2022, cutoffs_2023, category):
    # Feature: mhtcet-cutoff-prediction, Property 8: college_prestige_score and branch_demand_index equal the respective means in the most recent year.
    rows = []
    for i, c in enumerate(cutoffs_2022):
        rows.append({
            "college_code": "C1", "college_name": "Test", "branch_name": f"BR{i}",
            "category": category, "cap_round": "I", "year": 2022,
            "cutoff_percentile": c, "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        })
    for i, c in enumerate(cutoffs_2023):
        rows.append({
            "college_code": "C1", "college_name": "Test", "branch_name": f"BR{i}",
            "category": category, "cap_round": "I", "year": 2023,
            "cutoff_percentile": c, "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        })

    df = pd.DataFrame(rows)

    with tempfile.TemporaryDirectory() as tmpdir:
        fe = FeatureEngineer(scaler_path=Path(tmpdir) / "scaler.pkl")
        out = fe.fit_transform(df)

    # college_prestige_score for C1 = mean of all 2023 cutoffs for C1
    expected_prestige = float(np.mean(cutoffs_2023))
    rows_2023 = out[out["year"] == 2023]
    for _, row in rows_2023.iterrows():
        assert abs(float(row["college_prestige_score"]) - expected_prestige) < 1e-4, (
            f"college_prestige_score mismatch: expected {expected_prestige:.4f}, got {row['college_prestige_score']:.4f}"
        )

    # branch_demand_index for each branch in 2023 = that branch's cutoff (only one college)
    for i, c in enumerate(cutoffs_2023):
        br = f"BR{i}"
        branch_rows_2023 = out[(out["year"] == 2023) & (out["branch_name"] == br)]
        if len(branch_rows_2023) == 0:
            continue
        actual_demand = float(branch_rows_2023.iloc[0]["branch_demand_index"])
        assert abs(actual_demand - c) < 1e-4, (
            f"branch_demand_index mismatch for {br}: expected {c:.4f}, got {actual_demand:.4f}"
        )


# ---------------------------------------------------------------------------
# Property 9: Fill rate and seat count imputation (Task 4.7)
# Validates: Requirements 2.6, 2.7
# ---------------------------------------------------------------------------

@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    intakes=st.lists(st.integers(min_value=10, max_value=200), min_size=2, max_size=5),
    cutoffs=st.lists(_cutoff, min_size=2, max_size=5),
    category=st.sampled_from(_CATEGORIES),
)
def test_property9_fill_rate_and_seat_count_imputation(intakes, cutoffs, category):
    # Feature: mhtcet-cutoff-prediction, Property 9: category_fill_rate and seat_count are correct when intake is present; median fallback when intake is missing.
    n = min(len(intakes), len(cutoffs))
    assume(n >= 2)

    rows = []
    for i in range(n):
        rows.append({
            "college_code": f"C{i}", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "I", "year": 2023,
            "cutoff_percentile": float(cutoffs[i]), "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": float(intakes[i]), "exam_type": "mhtcet",
        })
    # Add one row with missing intake
    rows.append({
        "college_code": "CMISSING", "college_name": "Test", "branch_name": "CS",
        "category": category, "cap_round": "I", "year": 2023,
        "cutoff_percentile": 50.0, "location": "Pune", "district": "Pune",
        "fees": 50000, "intake": np.nan, "exam_type": "mhtcet",
    })

    df = pd.DataFrame(rows)

    with tempfile.TemporaryDirectory() as tmpdir:
        fe = FeatureEngineer(scaler_path=Path(tmpdir) / "scaler.pkl")
        out = fe.fit_transform(df)

    # Rows with intake present: seat_count == intake
    for i in range(n):
        row = out[out["college_code"] == f"C{i}"].iloc[0]
        assert abs(float(row["seat_count"]) - float(intakes[i])) < 1e-6, (
            f"seat_count mismatch for C{i}: expected {intakes[i]}, got {row['seat_count']}"
        )
        assert 0.0 <= float(row["category_fill_rate"]) <= 1.0

    # Row with missing intake: seat_count == branch median of CS
    branch_median = float(np.median([float(x) for x in intakes[:n]]))
    missing_row = out[out["college_code"] == "CMISSING"].iloc[0]
    assert abs(float(missing_row["seat_count"]) - branch_median) < 1e-4, (
        f"seat_count fallback mismatch: expected median {branch_median}, got {missing_row['seat_count']}"
    )
    assert pd.notna(missing_row["category_fill_rate"])
    assert 0.0 <= float(missing_row["category_fill_rate"]) <= 1.0


# ---------------------------------------------------------------------------
# Property 10: Location influence correctness (Task 4.8)
# Validates: Requirements 2.8
# ---------------------------------------------------------------------------

@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    cutoffs=st.lists(_cutoff, min_size=1, max_size=6),
    location=st.text(
        alphabet=st.characters(whitelist_categories=("Lu", "Ll")),
        min_size=3, max_size=10,
    ),
    category=st.sampled_from(_CATEGORIES),
)
def test_property10_location_influence_correctness(cutoffs, location, category):
    # Feature: mhtcet-cutoff-prediction, Property 10: location_influence equals mean cutoff of all colleges in that location/district.
    rows = []
    for i, c in enumerate(cutoffs):
        rows.append({
            "college_code": f"C{i}", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "I", "year": 2023,
            "cutoff_percentile": float(c), "location": location, "district": location,
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        })

    df = pd.DataFrame(rows)

    with tempfile.TemporaryDirectory() as tmpdir:
        fe = FeatureEngineer(scaler_path=Path(tmpdir) / "scaler.pkl")
        out = fe.fit_transform(df)

    expected_influence = float(np.mean(cutoffs))
    for _, row in out.iterrows():
        actual = float(row["location_influence"])
        assert abs(actual - expected_influence) < 1e-4, (
            f"location_influence mismatch: expected {expected_influence:.4f}, got {actual:.4f}"
        )


# ---------------------------------------------------------------------------
# Property 11: exam_type encoding consistency (Task 4.9)
# Validates: Requirements 2.9, 9.1, 9.2
# ---------------------------------------------------------------------------

@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    exam_type=st.sampled_from(_EXAM_TYPES),
    n_rows=st.integers(min_value=1, max_value=5),
    cutoffs=st.lists(_cutoff, min_size=5, max_size=5),
)
def test_property11_exam_type_encoding_consistency(exam_type, n_rows, cutoffs):
    # Feature: mhtcet-cutoff-prediction, Property 11: exam_type has the same integer encoding at training and inference time; all rows carry the passed exam_type.
    train_rows = []
    for i in range(n_rows):
        train_rows.append({
            "college_code": "C1", "college_name": "Test", "branch_name": "CS",
            "category": "OPEN", "cap_round": "I", "year": 2020 + i,
            "cutoff_percentile": float(cutoffs[i]), "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": exam_type,
        })
    train_df = pd.DataFrame(train_rows)

    with tempfile.TemporaryDirectory() as tmpdir:
        fe = FeatureEngineer(scaler_path=Path(tmpdir) / "scaler.pkl")
        train_out = fe.fit_transform(train_df)

        # All training rows should have the same integer encoding
        train_encoded = train_out["exam_type"].unique()
        assert len(train_encoded) == 1, f"Expected single encoding, got {train_encoded}"
        train_val = int(train_encoded[0])

        # Inference with same exam_type should produce same encoding
        inf_df = pd.DataFrame([{
            "college_code": "C1", "college_name": "Test", "branch_name": "CS",
            "category": "OPEN", "cap_round": "I", "year": 2025,
            "cutoff_percentile": 70.0, "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": exam_type,
        }])
        inf_out = fe.transform(inf_df)

    inf_val = int(inf_out["exam_type"].iloc[0])
    assert inf_val == train_val, (
        f"exam_type encoding inconsistency: train={train_val}, inference={inf_val}"
    )
    assert "exam_type" in inf_out.columns
    assert pd.notna(inf_out["exam_type"].iloc[0])


# ---------------------------------------------------------------------------
# Property 12: Cold start lag imputation and flag (Task 4.10)
# Validates: Requirements 2.10
# ---------------------------------------------------------------------------

@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    cutoffs=st.lists(_cutoff, min_size=1, max_size=2),
    category=st.sampled_from(_CATEGORIES),
    cap_round=st.sampled_from(_ROUNDS),
    year_base=_year_base,
)
def test_property12_cold_start_lag_imputation_and_flag(cutoffs, category, cap_round, year_base):
    # Feature: mhtcet-cutoff-prediction, Property 12: For rows with insufficient history, missing lags equal group mean and is_cold_start == True.
    n = len(cutoffs)
    years = list(range(year_base, year_base + n))

    df = _build_group_df("C1", "CS", category, cap_round, years, cutoffs)

    with tempfile.TemporaryDirectory() as tmpdir:
        fe = FeatureEngineer(scaler_path=Path(tmpdir) / "scaler.pkl")
        out = fe.fit_transform(df).sort_values("year").reset_index(drop=True)

    group_mean = float(np.mean(cutoffs))

    for i, row in out.iterrows():
        assert bool(row["is_cold_start"]) is True, (
            f"Row {i} (year={row['year']}): expected is_cold_start=True"
        )
        for lag in (1, 2, 3):
            col = f"cutoff_t{lag}"
            assert pd.notna(row[col]), f"Row {i}: {col} is NaN after imputation"
            lag_year = row["year"] - lag
            if lag_year not in years:
                assert abs(float(row[col]) - group_mean) < 1e-4, (
                    f"Row {i}: {col} imputed value {row[col]:.4f} != group mean {group_mean:.4f}"
                )


# ---------------------------------------------------------------------------
# Property 13: Global cutoff shift correctness (Task 4.11)
# Validates: Requirements 2.11
# ---------------------------------------------------------------------------

@settings(max_examples=100, deadline=None, suppress_health_check=[HealthCheck.function_scoped_fixture])
@given(
    year_base=_year_base,
    cutoffs_prev=st.lists(_cutoff, min_size=1, max_size=5),
    cutoffs_curr=st.lists(_cutoff, min_size=1, max_size=5),
    category=st.sampled_from(_CATEGORIES),
)
def test_property13_global_cutoff_shift_correctness(year_base, cutoffs_prev, cutoffs_curr, category):
    # Feature: mhtcet-cutoff-prediction, Property 13: For any dataset with ≥2 years, global_cutoff_shift == mean(current_year) − mean(previous_year).
    prev_year = year_base
    curr_year = year_base + 1

    rows = []
    for i, c in enumerate(cutoffs_prev):
        rows.append({
            "college_code": f"C{i}", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "I", "year": prev_year,
            "cutoff_percentile": float(c), "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        })
    for i, c in enumerate(cutoffs_curr):
        rows.append({
            "college_code": f"C{i}", "college_name": "Test", "branch_name": "CS",
            "category": category, "cap_round": "I", "year": curr_year,
            "cutoff_percentile": float(c), "location": "Pune", "district": "Pune",
            "fees": 50000, "intake": 60, "exam_type": "mhtcet",
        })

    df = pd.DataFrame(rows)

    with tempfile.TemporaryDirectory() as tmpdir:
        fe = FeatureEngineer(scaler_path=Path(tmpdir) / "scaler.pkl")
        out = fe.fit_transform(df)

    expected_shift = float(np.mean(cutoffs_curr)) - float(np.mean(cutoffs_prev))
    actual_shifts = out["global_cutoff_shift"].unique()
    assert len(actual_shifts) == 1, f"Expected single global_cutoff_shift value, got {actual_shifts}"
    actual_shift = float(actual_shifts[0])
    assert abs(actual_shift - expected_shift) < 1e-4, (
        f"global_cutoff_shift mismatch: expected {expected_shift:.4f}, got {actual_shift:.4f}"
    )
