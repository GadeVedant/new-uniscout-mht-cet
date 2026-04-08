"""
Tests for Predictor — unit tests and property-based tests.

Feature: mhtcet-cutoff-prediction
Requirements: 5.1–5.9
"""
from __future__ import annotations

import math
import pickle
import json
import tempfile
from pathlib import Path
from unittest.mock import MagicMock, patch
from typing import Any

import numpy as np
import pytest
from hypothesis import given, settings, assume
from hypothesis import strategies as st

from app.predictor import (
    EPSILON,
    SIGMOID_K,
    CONFIDENCE_W1,
    CONFIDENCE_W2,
    apply_epsilon_fix,
    compute_admission_probability,
    compute_confidence_score,
    derive_admission_band,
    derive_confidence_label,
    sigmoid,
    Predictor,
)
from app.schemas import PredictionRequest, PredictionResult


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _make_request(**kwargs) -> PredictionRequest:
    defaults = dict(
        college_code="1234",
        branch_name="computer engineering",
        category="OPEN",
        cap_round="II",
        student_percentile=85.0,
        exam_type="mhtcet",
        district="Pune",
        explain=False,
    )
    defaults.update(kwargs)
    return PredictionRequest(**defaults)


def _make_loaded_predictor() -> Predictor:
    """Return a Predictor with mocked artifacts (no disk I/O)."""
    import pandas as pd

    p = Predictor()
    p._loaded = True
    p._feature_columns = [
        "cutoff_t1", "cutoff_t2", "cutoff_t3", "cutoff_volatility",
        "cap_round_delta", "college_prestige_score", "branch_demand_index",
        "category_fill_rate", "seat_count", "location_influence",
        "global_cutoff_shift", "exam_type",
    ]
    p._model_metadata = {"model_version": "test", "predicted_year": 2025}
    p._fe_stats = {
        "sample_size_lookup": {("1234", "computer engineering", "OPEN"): 50},
        "raw_min": None,
        "raw_max": None,
    }

    lgbm_mock_p10 = MagicMock()
    lgbm_mock_p10.predict.return_value = np.array([80.0])
    lgbm_mock_p50 = MagicMock()
    lgbm_mock_p50.predict.return_value = np.array([85.0])
    lgbm_mock_p90 = MagicMock()
    lgbm_mock_p90.predict.return_value = np.array([90.0])

    p._lgbm_p10 = lgbm_mock_p10
    p._lgbm_p50 = lgbm_mock_p50
    p._lgbm_p90 = lgbm_mock_p90

    ridge_mock = MagicMock()
    ridge_mock.predict.return_value = np.array([84.0])
    scaler_mock = MagicMock()
    scaler_mock.transform.return_value = np.zeros((1, 12))
    p._ridge = ridge_mock
    p._ridge_scaler = scaler_mock

    feat_df = pd.DataFrame([{
        "cutoff_t1": 84.0, "cutoff_t2": 83.0, "cutoff_t3": 82.0,
        "cutoff_volatility": 1.0, "cap_round_delta": 0.5,
        "college_prestige_score": 85.0, "branch_demand_index": 84.0,
        "category_fill_rate": 0.9, "seat_count": 60.0,
        "location_influence": 83.0, "global_cutoff_shift": 0.3,
        "exam_type": 0, "is_cold_start": False,
    }])
    fe_mock = MagicMock()
    fe_mock.transform.return_value = feat_df
    p._feature_engineer = fe_mock
    p._cold_start_handler = None

    return p


# ===========================================================================
# Unit Tests
# ===========================================================================

class TestSigmoid:
    def test_sigmoid_zero(self):
        assert abs(sigmoid(0.0) - 0.5) < 1e-9

    def test_sigmoid_positive(self):
        assert sigmoid(1.0) > 0.5

    def test_sigmoid_negative(self):
        assert sigmoid(-1.0) < 0.5

    def test_sigmoid_large_positive(self):
        assert sigmoid(100.0) > 0.999

    def test_sigmoid_large_negative(self):
        assert sigmoid(-100.0) < 0.001


class TestAdmissionProbabilityFormula:
    def test_at_p50_gives_50_percent(self):
        prob = compute_admission_probability(
            student_percentile=85.0, p50=85.0, p10=80.0, p90=90.0
        )
        assert abs(prob - 50.0) < 1e-6

    def test_above_p50_gives_more_than_50(self):
        prob = compute_admission_probability(
            student_percentile=90.0, p50=85.0, p10=80.0, p90=90.0
        )
        assert prob > 50.0

    def test_below_p50_gives_less_than_50(self):
        prob = compute_admission_probability(
            student_percentile=80.0, p50=85.0, p10=80.0, p90=90.0
        )
        assert prob < 50.0

    def test_formula_matches_manual_calculation(self):
        sp, p50, p10, p90 = 87.5, 85.0, 80.0, 90.0
        k = SIGMOID_K
        z = (sp - p50) / (p90 - p10)
        expected = sigmoid(k * z) * 100.0
        result = compute_admission_probability(sp, p50, p10, p90, k=k)
        assert abs(result - expected) < 1e-9

    def test_probability_in_range(self):
        prob = compute_admission_probability(50.0, 85.0, 80.0, 90.0)
        assert 0.0 <= prob <= 100.0


class TestMonotonicityInvariant:
    def test_already_monotone_unchanged(self):
        p10, p50, p90 = apply_epsilon_fix(80.0, 85.0, 90.0)
        assert p10 <= p50 <= p90
        assert p10 == 80.0
        assert p50 == 85.0
        assert p90 == 90.0

    def test_p10_greater_than_p50_fixed(self):
        p10, p50, p90 = apply_epsilon_fix(87.0, 85.0, 90.0)
        assert p10 <= p50 <= p90
        assert p10 == 85.0 - EPSILON

    def test_p90_less_than_p50_fixed(self):
        p10, p50, p90 = apply_epsilon_fix(80.0, 85.0, 83.0)
        assert p10 <= p50 <= p90
        assert p90 == 85.0 + EPSILON

    def test_both_violations_fixed(self):
        p10, p50, p90 = apply_epsilon_fix(87.0, 85.0, 83.0)
        assert p10 <= p50 <= p90


class TestConfidenceScoreFormula:
    def test_wider_interval_lower_confidence(self):
        c_narrow = compute_confidence_score(1.0, 50)
        c_wide = compute_confidence_score(10.0, 50)
        assert c_narrow >= c_wide

    def test_larger_sample_higher_confidence(self):
        c_small = compute_confidence_score(5.0, 1)
        c_large = compute_confidence_score(5.0, 100)
        assert c_large >= c_small

    def test_score_in_range(self):
        score = compute_confidence_score(5.0, 30)
        assert 0.0 <= score <= 1.0

    def test_with_raw_min_max_normalisation(self):
        score = compute_confidence_score(5.0, 30, raw_min=0.0, raw_max=10.0)
        assert 0.0 <= score <= 1.0

    def test_formula_matches_manual(self):
        interval_width, sample_size = 5.0, 30
        w1, w2 = CONFIDENCE_W1, CONFIDENCE_W2
        raw = w1 * (1.0 / max(interval_width, EPSILON)) + w2 * math.log(sample_size + 1)
        expected = max(0.0, min(1.0, raw))
        result = compute_confidence_score(interval_width, sample_size)
        assert abs(result - expected) < 1e-9


class TestAdmissionBandMapping:
    def test_safe(self):
        assert derive_admission_band(80.0) == "Safe"
        assert derive_admission_band(100.0) == "Safe"
        assert derive_admission_band(95.0) == "Safe"

    def test_likely(self):
        assert derive_admission_band(50.0) == "Likely"
        assert derive_admission_band(79.9) == "Likely"
        assert derive_admission_band(65.0) == "Likely"

    def test_moderate(self):
        assert derive_admission_band(20.0) == "Moderate"
        assert derive_admission_band(49.9) == "Moderate"
        assert derive_admission_band(35.0) == "Moderate"

    def test_risky(self):
        assert derive_admission_band(0.0) == "Risky"
        assert derive_admission_band(19.9) == "Risky"
        assert derive_admission_band(10.0) == "Risky"


class TestConfidenceLabelMapping:
    def test_high_confidence(self):
        assert derive_confidence_label(0.76) == "High confidence"
        assert derive_confidence_label(1.0) == "High confidence"

    def test_medium_confidence(self):
        assert derive_confidence_label(0.50) == "Medium confidence"
        assert derive_confidence_label(0.75) == "Medium confidence"
        assert derive_confidence_label(0.60) == "Medium confidence"

    def test_low_confidence(self):
        assert derive_confidence_label(0.0) == "Low confidence (estimated)"
        assert derive_confidence_label(0.49) == "Low confidence (estimated)"


class TestPredictorNotLoaded:
    def test_predict_raises_503_when_not_loaded(self):
        from fastapi import HTTPException
        p = Predictor()
        req = _make_request()
        with pytest.raises(HTTPException) as exc_info:
            p.predict(req)
        assert exc_info.value.status_code == 503

    def test_predict_batch_raises_503_when_not_loaded(self):
        from fastapi import HTTPException
        p = Predictor()
        with pytest.raises(HTTPException) as exc_info:
            p.predict_batch([_make_request()])
        assert exc_info.value.status_code == 503


class TestPredictorPredict:
    def test_predict_returns_prediction_result(self):
        p = _make_loaded_predictor()
        req = _make_request()
        result = p.predict(req, _force_shap=False)
        assert isinstance(result, PredictionResult)

    def test_predict_all_fields_non_null(self):
        p = _make_loaded_predictor()
        req = _make_request()
        result = p.predict(req, _force_shap=False)
        assert result.p10 is not None
        assert result.p50 is not None
        assert result.p90 is not None
        assert result.admission_probability is not None
        assert result.confidence_score is not None
        assert result.confidence_label is not None
        assert result.admission_band is not None
        assert result.top_factors is not None
        assert result.predicted_year is not None

    def test_predict_monotonicity(self):
        p = _make_loaded_predictor()
        req = _make_request()
        result = p.predict(req, _force_shap=False)
        assert result.p10 <= result.p50 <= result.p90

    def test_predict_admission_probability_in_range(self):
        p = _make_loaded_predictor()
        req = _make_request()
        result = p.predict(req, _force_shap=False)
        assert 0.0 <= result.admission_probability <= 100.0

    def test_predict_confidence_score_in_range(self):
        p = _make_loaded_predictor()
        req = _make_request()
        result = p.predict(req, _force_shap=False)
        assert 0.0 <= result.confidence_score <= 1.0

    def test_predict_admission_band_valid(self):
        p = _make_loaded_predictor()
        req = _make_request()
        result = p.predict(req, _force_shap=False)
        assert result.admission_band in {"Safe", "Likely", "Moderate", "Risky"}

    def test_predict_confidence_label_valid(self):
        p = _make_loaded_predictor()
        req = _make_request()
        result = p.predict(req, _force_shap=False)
        assert result.confidence_label in {
            "High confidence", "Medium confidence", "Low confidence (estimated)"
        }

    def test_predict_top_factors_empty_when_no_shap(self):
        p = _make_loaded_predictor()
        req = _make_request(explain=False)
        p._fe_stats["sample_size_lookup"] = {("1234", "computer engineering", "OPEN"): 1}
        result = p.predict(req, _force_shap=False)
        assert result.top_factors == []


class TestPredictorBatch:
    def test_batch_returns_same_count(self):
        p = _make_loaded_predictor()
        reqs = [_make_request() for _ in range(3)]
        results = p.predict_batch(reqs)
        assert len(results) == 3

    def test_batch_413_when_exceeds_max(self):
        from fastapi import HTTPException
        p = _make_loaded_predictor()
        reqs = [_make_request() for _ in range(201)]
        with pytest.raises(HTTPException) as exc_info:
            p.predict_batch(reqs)
        assert exc_info.value.status_code == 413

    def test_batch_partial_success_on_item_error(self):
        import pandas as pd
        p = _make_loaded_predictor()
        call_count = [0]
        feat_df = p._feature_engineer.transform.return_value

        def side_effect(df):
            call_count[0] += 1
            if call_count[0] == 2:
                raise RuntimeError("Simulated error")
            return feat_df

        p._feature_engineer.transform = side_effect
        reqs = [_make_request(), _make_request(), _make_request()]
        results = p.predict_batch(reqs)
        assert len(results) == 3
        assert results[1].fallback_reason == "error"
        assert results[0].fallback_reason is None
        assert results[2].fallback_reason is None

    def test_batch_preserves_order(self):
        p = _make_loaded_predictor()
        reqs = [_make_request(student_percentile=float(v)) for v in [80.0, 85.0, 90.0]]
        results = p.predict_batch(reqs)
        assert len(results) == 3
        for res in results:
            assert isinstance(res, PredictionResult)


# ===========================================================================
# Property-Based Tests
# ===========================================================================

# ---------------------------------------------------------------------------
# Property 19: Admission probability formula
# Feature: mhtcet-cutoff-prediction, Property 19: Admission probability formula
# Validates: Requirements 5.2
# ---------------------------------------------------------------------------
@given(
    student_percentile=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False),
    p50=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False),
    p10=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False),
    p90=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=200)
def test_property_19_admission_probability_formula(
    student_percentile: float, p50: float, p10: float, p90: float
) -> None:
    # Feature: mhtcet-cutoff-prediction, Property 19: Admission probability formula
    assume(p90 > p10)
    k = SIGMOID_K
    z = (student_percentile - p50) / (p90 - p10)
    expected = sigmoid(k * z) * 100.0
    result = compute_admission_probability(
        student_percentile, p50, p10, p90, k=k, epsilon=0.0
    )
    assert abs(result - expected) < 1e-6


# ---------------------------------------------------------------------------
# Property 20: Monotonicity invariant
# Feature: mhtcet-cutoff-prediction, Property 20: Monotonicity invariant
# Validates: Requirements 5.3
# ---------------------------------------------------------------------------
@given(
    p50=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False),
    raw_p10=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False),
    raw_p90=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=200)
def test_property_20_monotonicity_invariant(
    p50: float, raw_p10: float, raw_p90: float
) -> None:
    # Feature: mhtcet-cutoff-prediction, Property 20: Monotonicity invariant
    p10, p50_out, p90 = apply_epsilon_fix(raw_p10, p50, raw_p90)
    assert p10 <= p50_out, f"p10={p10} > p50={p50_out}"
    assert p50_out <= p90, f"p50={p50_out} > p90={p90}"
    assert p50_out == p50


# ---------------------------------------------------------------------------
# Property 21: Confidence score formula
# Feature: mhtcet-cutoff-prediction, Property 21: Confidence score formula
# Validates: Requirements 5.4
# ---------------------------------------------------------------------------
@given(
    interval_width=st.floats(0.01, 50.0, allow_nan=False, allow_infinity=False),
    sample_size=st.integers(1, 10000),
)
@settings(max_examples=200)
def test_property_21_confidence_score_formula(
    interval_width: float, sample_size: int
) -> None:
    # Feature: mhtcet-cutoff-prediction, Property 21: Confidence score formula
    w1, w2 = CONFIDENCE_W1, CONFIDENCE_W2
    raw = w1 * (1.0 / max(interval_width, EPSILON)) + w2 * math.log(sample_size + 1)
    expected = max(0.0, min(1.0, raw))
    result = compute_confidence_score(interval_width, sample_size)
    assert abs(result - expected) < 1e-9
    assert 0.0 <= result <= 1.0


# ---------------------------------------------------------------------------
# Property 22: Admission band and confidence label threshold mapping
# Feature: mhtcet-cutoff-prediction, Property 22: Admission band and confidence label threshold mapping
# Validates: Requirements 5.7, 5.8
# ---------------------------------------------------------------------------
@given(prob=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False))
@settings(max_examples=200)
def test_property_22_admission_band_mapping(prob: float) -> None:
    # Feature: mhtcet-cutoff-prediction, Property 22: Admission band and confidence label threshold mapping
    band = derive_admission_band(prob)
    if prob >= 80.0:
        assert band == "Safe"
    elif prob >= 50.0:
        assert band == "Likely"
    elif prob >= 20.0:
        assert band == "Moderate"
    else:
        assert band == "Risky"
    assert band in {"Safe", "Likely", "Moderate", "Risky"}


@given(score=st.floats(0.0, 1.0, allow_nan=False, allow_infinity=False))
@settings(max_examples=200)
def test_property_22_confidence_label_mapping(score: float) -> None:
    # Feature: mhtcet-cutoff-prediction, Property 22: Admission band and confidence label threshold mapping
    label = derive_confidence_label(score)
    if score > 0.75:
        assert label == "High confidence"
    elif score >= 0.50:
        assert label == "Medium confidence"
    else:
        assert label == "Low confidence (estimated)"
    assert label in {"High confidence", "Medium confidence", "Low confidence (estimated)"}


# ---------------------------------------------------------------------------
# Property 23: top_factors bounded
# Feature: mhtcet-cutoff-prediction, Property 23: top_factors bounded
# Validates: Requirements 5.9
# ---------------------------------------------------------------------------
@given(
    student_percentile=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=50)
def test_property_23_top_factors_bounded_single(student_percentile: float) -> None:
    # Feature: mhtcet-cutoff-prediction, Property 23: top_factors bounded
    p = _make_loaded_predictor()
    shap_mock = MagicMock()
    shap_mock.shap_values.return_value = np.array(
        [[1.0, 0.5, 0.3, 0.2, 0.1, 0.05, 0.04, 0.03, 0.02, 0.01, 0.005, 0.001]]
    )
    p._shap_explainer = shap_mock
    req = _make_request(student_percentile=student_percentile, explain=True)
    result = p.predict(req, _force_shap=True)
    assert 1 <= len(result.top_factors) <= 3
    for factor in result.top_factors:
        assert isinstance(factor, str)
        assert len(factor) > 0


@given(
    batch_size=st.integers(min_value=21, max_value=50),
)
@settings(max_examples=30)
def test_property_23_top_factors_empty_beyond_shap_threshold(batch_size: int) -> None:
    # Feature: mhtcet-cutoff-prediction, Property 23: top_factors bounded
    from app.predictor import SHAP_BATCH_THRESHOLD
    p = _make_loaded_predictor()
    reqs = [_make_request() for _ in range(batch_size)]
    results = p.predict_batch(reqs)
    for i in range(SHAP_BATCH_THRESHOLD, len(results)):
        if results[i].fallback_reason != "error":
            assert results[i].top_factors == []


# ---------------------------------------------------------------------------
# Property 18: PredictionResult completeness
# Feature: mhtcet-cutoff-prediction, Property 18: PredictionResult completeness
# Validates: Requirements 5.1
# ---------------------------------------------------------------------------
@given(
    student_percentile=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False),
    college_code=st.text(
        min_size=1, max_size=10,
        alphabet=st.characters(whitelist_categories=("Lu", "Ll", "Nd"))
    ),
    branch_name=st.sampled_from(
        ["computer engineering", "mechanical engineering", "civil engineering"]
    ),
    category=st.sampled_from(["OPEN", "OBC", "SC", "ST"]),
    cap_round=st.sampled_from(["I", "II", "III"]),
)
@settings(max_examples=100)
def test_property_18_prediction_result_completeness(
    student_percentile: float,
    college_code: str,
    branch_name: str,
    category: str,
    cap_round: str,
) -> None:
    # Feature: mhtcet-cutoff-prediction, Property 18: PredictionResult completeness
    p = _make_loaded_predictor()
    req = _make_request(
        student_percentile=student_percentile,
        college_code=college_code,
        branch_name=branch_name,
        category=category,
        cap_round=cap_round,
    )
    result = p.predict(req, _force_shap=False)

    assert result.p10 is not None
    assert result.p50 is not None
    assert result.p90 is not None
    assert result.admission_probability is not None
    assert result.confidence_score is not None
    assert result.confidence_label is not None
    assert result.admission_band is not None
    assert result.top_factors is not None
    assert result.predicted_year is not None

    assert result.p10 <= result.p50 <= result.p90
    assert 0.0 <= result.admission_probability <= 100.0
    assert 0.0 <= result.confidence_score <= 1.0
    assert result.admission_band in {"Safe", "Likely", "Moderate", "Risky"}
    assert result.confidence_label in {
        "High confidence", "Medium confidence", "Low confidence (estimated)"
    }
    assert isinstance(result.top_factors, list)
    assert isinstance(result.predicted_year, int)
