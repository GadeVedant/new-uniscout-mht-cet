"""
Tests for ColdStartHandler.

Feature: mhtcet-cutoff-prediction
Requirements: 4.1–4.5
"""
from __future__ import annotations

import pickle
import tempfile
from pathlib import Path

import pandas as pd
import pytest
from hypothesis import given, settings, strategies as st

from app.cold_start_handler import ColdStartHandler

# ---------------------------------------------------------------------------
# Shared fixtures / helpers
# ---------------------------------------------------------------------------

CATEGORIES = ["OPEN", "OBC", "SC", "ST", "EWS"]
CAP_ROUNDS = ["I", "II", "III"]
DISTRICTS = ["Pune", "Mumbai", "Nagpur", "Nashik"]


def _make_training_df() -> pd.DataFrame:
    """Minimal training DataFrame covering all districts, categories, cap_rounds."""
    rows = []
    for district in DISTRICTS:
        for cat in CATEGORIES:
            for rnd in CAP_ROUNDS:
                rows.append(
                    {
                        "college_code": f"C_{district[:2]}",
                        "branch_name": "Computer Engineering",
                        "category": cat,
                        "cap_round": rnd,
                        "year": 2023,
                        "cutoff_percentile": 70.0 + len(district) + CATEGORIES.index(cat),
                        "district": district,
                        "location": district,
                    }
                )
    return pd.DataFrame(rows)


@pytest.fixture(scope="module")
def fitted_handler() -> ColdStartHandler:
    df = _make_training_df()
    handler = ColdStartHandler()
    handler.fit(df)
    return handler


# ===========================================================================
# Task 6.4 — Unit tests
# ===========================================================================


class TestDistrictFallback:
    """Requirement 4.1 — district-level fallback."""

    def test_returns_district_average_when_district_matches(self, fitted_handler):
        result = fitted_handler.get_fallback(
            branch_name="Computer Engineering",
            category="OPEN",
            cap_round="I",
            district="Pune",
        )
        assert result["fallback_reason"] == "district_average"
        assert isinstance(result["p50"], float)
        assert result["p50"] > 0

    def test_district_confidence_cap_is_0_50(self, fitted_handler):
        result = fitted_handler.get_fallback(
            branch_name="Computer Engineering",
            category="OPEN",
            cap_round="I",
            district="Pune",
        )
        assert result["confidence_score"] == 0.50

    def test_district_p50_matches_lookup(self, fitted_handler):
        key = ("Pune", "OPEN", "I")
        expected = fitted_handler.district_mean[key]
        result = fitted_handler.get_fallback(
            branch_name="Computer Engineering",
            category="OPEN",
            cap_round="I",
            district="Pune",
        )
        assert result["p50"] == pytest.approx(expected)


class TestStateFallback:
    """Requirement 4.2 — state-level fallback when district is unknown."""

    def test_returns_state_average_when_district_unknown(self, fitted_handler):
        result = fitted_handler.get_fallback(
            branch_name="Computer Engineering",
            category="OPEN",
            cap_round="I",
            district="UnknownDistrict",
        )
        assert result["fallback_reason"] == "state_average"

    def test_returns_state_average_when_no_district_provided(self, fitted_handler):
        result = fitted_handler.get_fallback(
            branch_name="Computer Engineering",
            category="OPEN",
            cap_round="I",
            district="",
        )
        assert result["fallback_reason"] == "state_average"

    def test_state_confidence_cap_is_0_35(self, fitted_handler):
        result = fitted_handler.get_fallback(
            branch_name="Computer Engineering",
            category="OPEN",
            cap_round="I",
            district="",
        )
        assert result["confidence_score"] == 0.35

    def test_state_p50_matches_lookup(self, fitted_handler):
        key = ("OPEN", "I")
        expected = fitted_handler.state_mean[key]
        result = fitted_handler.get_fallback(
            branch_name="Computer Engineering",
            category="OPEN",
            cap_round="I",
            district="",
        )
        assert result["p50"] == pytest.approx(expected)


class TestGlobalFallback:
    """Requirement 4.3 — global median fallback."""

    def test_global_fallback_when_category_cap_round_unknown(self):
        """Handler with no state_mean for the queried (category, cap_round)."""
        handler = ColdStartHandler()
        # Fit with only one category/round so we can query an unseen one
        df = pd.DataFrame(
            [
                {
                    "college_code": "C1",
                    "branch_name": "Mech",
                    "category": "OPEN",
                    "cap_round": "I",
                    "year": 2023,
                    "cutoff_percentile": 65.0,
                    "district": "Pune",
                }
            ]
        )
        handler.fit(df)
        # Query an unseen category — state_mean won't have it
        result = handler.get_fallback(
            branch_name="Mech",
            category="NT",  # not in training data
            cap_round="III",
            district="",
        )
        assert result is not None
        assert result["fallback_reason"] == "global_median"
        assert result["confidence_score"] == 0.25

    def test_global_confidence_cap_is_0_25(self):
        handler = ColdStartHandler()
        df = pd.DataFrame(
            [
                {
                    "college_code": "C1",
                    "branch_name": "Mech",
                    "category": "OPEN",
                    "cap_round": "I",
                    "year": 2023,
                    "cutoff_percentile": 65.0,
                    "district": "Pune",
                }
            ]
        )
        handler.fit(df)
        result = handler.get_fallback(
            branch_name="Mech",
            category="NT",
            cap_round="III",
            district="",
        )
        assert result["confidence_score"] == 0.25


class TestNonNullGuarantee:
    """Requirement 4.5 — never returns null."""

    def test_always_returns_result_for_empty_handler(self):
        handler = ColdStartHandler()
        # Fit with minimal data
        df = pd.DataFrame(
            [
                {
                    "college_code": "C1",
                    "branch_name": "Mech",
                    "category": "OPEN",
                    "cap_round": "I",
                    "year": 2023,
                    "cutoff_percentile": 65.0,
                }
            ]
        )
        handler.fit(df)
        result = handler.get_fallback(
            branch_name="Unknown Branch",
            category="UNKNOWN_CAT",
            cap_round="III",
            district="",
        )
        assert result is not None
        assert result["p50"] is not None
        assert isinstance(result["p50"], float)

    def test_p50_is_positive(self, fitted_handler):
        result = fitted_handler.get_fallback(
            branch_name="Any Branch",
            category="OPEN",
            cap_round="I",
            district="",
        )
        assert result["p50"] > 0


class TestConfidenceCaps:
    """Requirement 4.4 — confidence caps per tier."""

    def test_district_cap_not_exceeded(self, fitted_handler):
        result = fitted_handler.get_fallback(
            branch_name="CE", category="OBC", cap_round="II", district="Mumbai"
        )
        assert result["confidence_score"] <= 0.50

    def test_state_cap_not_exceeded(self, fitted_handler):
        result = fitted_handler.get_fallback(
            branch_name="CE", category="OBC", cap_round="II", district=""
        )
        assert result["confidence_score"] <= 0.35

    def test_global_cap_not_exceeded(self):
        handler = ColdStartHandler()
        df = pd.DataFrame(
            [
                {
                    "college_code": "C1",
                    "branch_name": "Mech",
                    "category": "OPEN",
                    "cap_round": "I",
                    "year": 2023,
                    "cutoff_percentile": 65.0,
                }
            ]
        )
        handler.fit(df)
        result = handler.get_fallback(
            branch_name="Mech", category="NT", cap_round="III", district=""
        )
        assert result["confidence_score"] <= 0.25


class TestSaveLoad:
    """Persistence round-trip."""

    def test_save_and_load_roundtrip(self, fitted_handler):
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "handler.pkl"
            fitted_handler.save(path)
            loaded = ColdStartHandler.load(path)

        assert loaded.district_mean == fitted_handler.district_mean
        assert loaded.state_mean == fitted_handler.state_mean
        assert loaded.global_median == fitted_handler.global_median

    def test_load_missing_file_raises(self):
        with pytest.raises(FileNotFoundError):
            ColdStartHandler.load("/nonexistent/path/handler.pkl")


# ===========================================================================
# Task 6.2 — Property 16: Tiered cold start fallback
# Feature: mhtcet-cutoff-prediction, Property 16: Tiered cold start fallback
# Validates: Requirements 4.1, 4.2, 4.3, 4.5
# ===========================================================================

# Strategies for generating valid inputs
_branch_st = st.text(min_size=1, max_size=30, alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd", "Zs")))
_category_st = st.sampled_from(CATEGORIES)
_cap_round_st = st.sampled_from(CAP_ROUNDS)
_district_known_st = st.sampled_from(DISTRICTS + [""])
_district_unknown_st = st.text(min_size=1, max_size=20, alphabet=st.characters(whitelist_categories=("Lu", "Ll"))).filter(
    lambda d: d not in DISTRICTS
)


@settings(max_examples=100, deadline=None)
@given(
    branch_name=_branch_st,
    category=_category_st,
    cap_round=_cap_round_st,
    district=_district_known_st,
)
def test_property_16_tiered_fallback_non_null(branch_name, category, cap_round, district):
    """Property 16: For any (branch_name, category, cap_round), result is non-null and uses correct tier.

    Feature: mhtcet-cutoff-prediction, Property 16: Tiered cold start fallback
    Validates: Requirements 4.1, 4.2, 4.3, 4.5
    """
    handler = ColdStartHandler()
    handler.fit(_make_training_df())

    result = handler.get_fallback(
        branch_name=branch_name,
        category=category,
        cap_round=cap_round,
        district=district,
    )

    # Non-null guarantee (Req 4.5)
    assert result is not None
    assert result["p50"] is not None
    assert isinstance(result["p50"], float)
    assert result["fallback_reason"] in ("district_average", "state_average", "global_median")

    # Correct tier selection (Reqs 4.1, 4.2, 4.3)
    district_key = (district, category, cap_round)
    state_key = (category, cap_round)

    if district and district_key in handler.district_mean:
        assert result["fallback_reason"] == "district_average"
    elif state_key in handler.state_mean:
        assert result["fallback_reason"] == "state_average"
    else:
        assert result["fallback_reason"] == "global_median"


@settings(max_examples=100, deadline=None)
@given(
    branch_name=_branch_st,
    category=_category_st,
    cap_round=_cap_round_st,
    district=_district_unknown_st,
)
def test_property_16_unknown_district_falls_to_state(branch_name, category, cap_round, district):
    """Property 16 (variant): Unknown district always falls back to state or global.

    Feature: mhtcet-cutoff-prediction, Property 16: Tiered cold start fallback
    Validates: Requirements 4.2, 4.3, 4.5
    """
    handler = ColdStartHandler()
    handler.fit(_make_training_df())

    result = handler.get_fallback(
        branch_name=branch_name,
        category=category,
        cap_round=cap_round,
        district=district,
    )

    assert result is not None
    assert result["fallback_reason"] in ("state_average", "global_median")


# ===========================================================================
# Task 6.3 — Property 17: Cold start confidence caps
# Feature: mhtcet-cutoff-prediction, Property 17: Cold start confidence caps
# Validates: Requirements 4.4
# ===========================================================================

_CONFIDENCE_CAPS = {
    "district_average": 0.50,
    "state_average": 0.35,
    "global_median": 0.25,
}


@settings(max_examples=100, deadline=None)
@given(
    branch_name=_branch_st,
    category=_category_st,
    cap_round=_cap_round_st,
    district=_district_known_st,
)
def test_property_17_confidence_caps(branch_name, category, cap_round, district):
    """Property 17: confidence_score never exceeds the cap for its fallback tier.

    Feature: mhtcet-cutoff-prediction, Property 17: Cold start confidence caps
    Validates: Requirements 4.4
    """
    handler = ColdStartHandler()
    handler.fit(_make_training_df())

    result = handler.get_fallback(
        branch_name=branch_name,
        category=category,
        cap_round=cap_round,
        district=district,
    )

    reason = result["fallback_reason"]
    cap = _CONFIDENCE_CAPS[reason]
    assert result["confidence_score"] <= cap, (
        f"confidence_score {result['confidence_score']} exceeds cap {cap} "
        f"for fallback_reason={reason!r}"
    )
    # Also assert confidence_score is exactly the cap (not just below it)
    assert result["confidence_score"] == cap, (
        f"Expected confidence_score == {cap} for {reason!r}, "
        f"got {result['confidence_score']}"
    )
