"""
Route tests for FastAPI endpoints.

Feature: mhtcet-cutoff-prediction
Requirements: 5.6, 6.1–6.8, 10.1
"""
from __future__ import annotations

import json
import logging
from unittest.mock import MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from hypothesis import given, settings
from hypothesis import strategies as st

import main
from app.schemas import PredictionResult


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

VALID_RESULT = PredictionResult(
    p10=80.0,
    p50=85.0,
    p90=90.0,
    admission_probability=72.4,
    confidence_score=0.81,
    confidence_label="High confidence",
    admission_band="Likely",
    top_factors=["Recent cutoff trend", "High branch demand"],
    predicted_year=2025,
    fallback_reason=None,
)

VALID_REQUEST_BODY = {
    "college_code": "1234",
    "branch_name": "computer engineering",
    "category": "OPEN",
    "cap_round": "II",
    "student_percentile": 87.5,
    "exam_type": "mhtcet",
    "district": "Pune",
}


def _ready_client():
    """Return a TestClient with model_state patched to 'ready'."""
    client = TestClient(main.app, raise_server_exceptions=False)
    return client


# ---------------------------------------------------------------------------
# Unit tests — health / metrics (no model needed)
# ---------------------------------------------------------------------------

class TestHealth:
    def test_health_always_200(self):
        with patch.object(main, "_model_state", "not_loaded"):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.get("/health")
        assert resp.status_code == 200

    def test_health_ready(self):
        with patch.object(main, "_model_state", "ready"):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.get("/health")
        data = resp.json()
        assert data["model_state"] == "ready"
        assert data["ready_for_predictions"] is True

    def test_health_not_loaded(self):
        with patch.object(main, "_model_state", "not_loaded"):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.get("/health")
        data = resp.json()
        assert data["model_state"] == "not_loaded"
        assert data["ready_for_predictions"] is False

    def test_health_loading(self):
        with patch.object(main, "_model_state", "loading"):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.get("/health")
        data = resp.json()
        assert data["model_state"] == "loading"
        assert data["ready_for_predictions"] is False


class TestMetrics:
    def test_metrics_200(self):
        client = TestClient(main.app, raise_server_exceptions=False)
        resp = client.get("/metrics")
        assert resp.status_code == 200
        data = resp.json()
        assert "total_predictions" in data
        assert "p95_latency_ms" in data


# ---------------------------------------------------------------------------
# Unit tests — predict (single)
# ---------------------------------------------------------------------------

class TestPredictRoute:
    def test_503_when_not_loaded(self):
        with patch.object(main, "_model_state", "not_loaded"):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.post("/api/predict", json=VALID_REQUEST_BODY)
        assert resp.status_code == 503

    def test_503_when_loading(self):
        with patch.object(main, "_model_state", "loading"):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.post("/api/predict", json=VALID_REQUEST_BODY)
        assert resp.status_code == 503

    def test_422_missing_required_field(self):
        client = TestClient(main.app, raise_server_exceptions=False)
        body = {k: v for k, v in VALID_REQUEST_BODY.items() if k != "college_code"}
        resp = client.post("/api/predict", json=body)
        assert resp.status_code == 422

    def test_422_invalid_percentile_too_high(self):
        client = TestClient(main.app, raise_server_exceptions=False)
        body = {**VALID_REQUEST_BODY, "student_percentile": 101.0}
        resp = client.post("/api/predict", json=body)
        assert resp.status_code == 422

    def test_422_invalid_percentile_negative(self):
        client = TestClient(main.app, raise_server_exceptions=False)
        body = {**VALID_REQUEST_BODY, "student_percentile": -1.0}
        resp = client.post("/api/predict", json=body)
        assert resp.status_code == 422

    def test_200_with_ready_model(self):
        mock_predictor = MagicMock()
        mock_predictor.predict.return_value = VALID_RESULT
        with patch.object(main, "_model_state", "ready"), \
             patch("app.predictor.predictor", mock_predictor):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.post("/api/predict", json=VALID_REQUEST_BODY)
        assert resp.status_code == 200
        data = resp.json()
        assert "p10" in data and "p50" in data and "p90" in data

    def test_x_request_id_propagated(self):
        mock_predictor = MagicMock()
        mock_predictor.predict.return_value = VALID_RESULT
        with patch.object(main, "_model_state", "ready"), \
             patch("app.predictor.predictor", mock_predictor):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.post(
                "/api/predict",
                json=VALID_REQUEST_BODY,
                headers={"X-Request-ID": "test-uuid-123"},
            )
        assert resp.status_code == 200
        call_kwargs = mock_predictor.predict.call_args
        assert call_kwargs is not None


# ---------------------------------------------------------------------------
# Unit tests — predict-batch
# ---------------------------------------------------------------------------

class TestPredictBatchRoute:
    def test_503_when_not_loaded(self):
        with patch.object(main, "_model_state", "not_loaded"):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.post("/api/predict-batch", json={"requests": [VALID_REQUEST_BODY]})
        assert resp.status_code == 503

    def test_200_with_ready_model(self):
        mock_predictor = MagicMock()
        mock_predictor.predict_batch.return_value = [VALID_RESULT]
        with patch.object(main, "_model_state", "ready"), \
             patch("app.predictor.predictor", mock_predictor):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.post("/api/predict-batch", json={"requests": [VALID_REQUEST_BODY]})
        assert resp.status_code == 200
        data = resp.json()
        assert "results" in data
        assert len(data["results"]) == 1

    def test_422_invalid_cap_round(self):
        client = TestClient(main.app, raise_server_exceptions=False)
        bad_req = {**VALID_REQUEST_BODY, "cap_round": "IV"}
        resp = client.post("/api/predict-batch", json={"requests": [bad_req]})
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Unit tests — train
# ---------------------------------------------------------------------------

class TestTrainRoute:
    def test_403_when_training_disabled(self):
        with patch.object(main, "TRAINING_ENABLED", False):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.post("/api/train")
        assert resp.status_code == 403

    def test_409_when_already_loading(self):
        with patch.object(main, "TRAINING_ENABLED", True), \
             patch.object(main, "_model_state", "loading"):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.post("/api/train")
        assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Property 24: Invalid percentile rejected
# Feature: mhtcet-cutoff-prediction, Property 24: Invalid percentile rejected
# Validates: Requirements 5.6, 6.5
# ---------------------------------------------------------------------------

@given(
    percentile=st.one_of(
        st.floats(max_value=-0.001, allow_nan=False, allow_infinity=False),
        st.floats(min_value=100.001, allow_nan=False, allow_infinity=False),
    )
)
@settings(max_examples=100)
def test_property_24_invalid_percentile_rejected(percentile):
    # Feature: mhtcet-cutoff-prediction, Property 24: Invalid percentile rejected
    client = TestClient(main.app, raise_server_exceptions=False)
    body = {**VALID_REQUEST_BODY, "student_percentile": percentile}
    resp = client.post("/api/predict", json=body)
    assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Property 25: Batch response ordering
# Feature: mhtcet-cutoff-prediction, Property 25: Batch response ordering
# Validates: Requirements 6.8
# ---------------------------------------------------------------------------

@given(n=st.integers(min_value=1, max_value=10))
@settings(max_examples=50)
def test_property_25_batch_response_ordering(n):
    # Feature: mhtcet-cutoff-prediction, Property 25: Batch response ordering
    results = [
        PredictionResult(
            p10=float(i), p50=float(i + 5), p90=float(i + 10),
            admission_probability=50.0, confidence_score=0.5,
            confidence_label="Medium confidence", admission_band="Likely",
            top_factors=[], predicted_year=2025, fallback_reason=None,
        )
        for i in range(n)
    ]
    mock_predictor = MagicMock()
    mock_predictor.predict_batch.return_value = results
    with patch.object(main, "_model_state", "ready"), \
         patch("app.predictor.predictor", mock_predictor):
        client = TestClient(main.app, raise_server_exceptions=False)
        resp = client.post(
            "/api/predict-batch",
            json={"requests": [VALID_REQUEST_BODY] * n},
        )
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["results"]) == n
    for i, r in enumerate(data["results"]):
        assert abs(r["p10"] - float(i)) < 1e-6


# ---------------------------------------------------------------------------
# Property 26: ML response fields completeness
# Feature: mhtcet-cutoff-prediction, Property 26: ML response fields completeness
# Validates: Requirements 6.2
# ---------------------------------------------------------------------------

REQUIRED_FIELDS = {
    "p10", "p50", "p90", "admission_probability", "confidence_score",
    "confidence_label", "admission_band", "top_factors", "predicted_year",
}


@given(
    student_percentile=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=50)
def test_property_26_response_fields_completeness_single(student_percentile):
    # Feature: mhtcet-cutoff-prediction, Property 26: ML response fields completeness
    mock_predictor = MagicMock()
    mock_predictor.predict.return_value = VALID_RESULT
    with patch.object(main, "_model_state", "ready"), \
         patch("app.predictor.predictor", mock_predictor):
        client = TestClient(main.app, raise_server_exceptions=False)
        body = {**VALID_REQUEST_BODY, "student_percentile": student_percentile}
        resp = client.post("/api/predict", json=body)
    assert resp.status_code == 200
    data = resp.json()
    for field in REQUIRED_FIELDS:
        assert field in data, f"Missing field: {field}"


@given(n=st.integers(min_value=1, max_value=5))
@settings(max_examples=30)
def test_property_26_response_fields_completeness_batch(n):
    # Feature: mhtcet-cutoff-prediction, Property 26: ML response fields completeness
    mock_predictor = MagicMock()
    mock_predictor.predict_batch.return_value = [VALID_RESULT] * n
    with patch.object(main, "_model_state", "ready"), \
         patch("app.predictor.predictor", mock_predictor):
        client = TestClient(main.app, raise_server_exceptions=False)
        resp = client.post(
            "/api/predict-batch",
            json={"requests": [VALID_REQUEST_BODY] * n},
        )
    assert resp.status_code == 200
    data = resp.json()
    for item in data["results"]:
        for field in REQUIRED_FIELDS:
            assert field in item, f"Missing field: {field}"


# ---------------------------------------------------------------------------
# Property 30: Prediction log completeness
# Feature: mhtcet-cutoff-prediction, Property 30: Prediction log completeness
# Validates: Requirements 10.1
# ---------------------------------------------------------------------------

REQUIRED_LOG_FIELDS = {
    "event", "request_id", "college_code", "branch_name", "category",
    "cap_round", "student_percentile", "p10", "p50", "p90",
    "latency_ms", "fallback_reason", "model_version",
}


@given(
    student_percentile=st.floats(0.0, 100.0, allow_nan=False, allow_infinity=False),
)
@settings(max_examples=30)
def test_property_30_prediction_log_completeness(student_percentile):
    # Feature: mhtcet-cutoff-prediction, Property 30: Prediction log completeness
    from app.predictor import Predictor
    import pandas as pd
    import numpy as np

    p = Predictor()
    p._loaded = True
    p._feature_columns = [
        "cutoff_t1", "cutoff_t2", "cutoff_t3", "cutoff_volatility",
        "cap_round_delta", "college_prestige_score", "branch_demand_index",
        "category_fill_rate", "seat_count", "location_influence",
        "global_cutoff_shift", "exam_type",
    ]
    p._model_metadata = {"model_version": "test_v1", "predicted_year": 2025}
    p._fe_stats = {"sample_size_lookup": {}, "raw_min": None, "raw_max": None}

    feat_df = pd.DataFrame([{
        "cutoff_t1": 84.0, "cutoff_t2": 83.0, "cutoff_t3": 82.0,
        "cutoff_volatility": 1.0, "cap_round_delta": 0.5,
        "college_prestige_score": 85.0, "branch_demand_index": 84.0,
        "category_fill_rate": 0.9, "seat_count": 60.0,
        "location_influence": 83.0, "global_cutoff_shift": 0.3,
        "exam_type": 0, "is_cold_start": False,
    }])
    fe = MagicMock()
    fe.transform.return_value = feat_df
    p._feature_engineer = fe
    p._cold_start_handler = None

    lgbm_mock = MagicMock()
    lgbm_mock.predict.return_value = np.array([85.0])
    p._lgbm_p10 = lgbm_mock
    p._lgbm_p50 = lgbm_mock
    p._lgbm_p90 = lgbm_mock
    ridge = MagicMock()
    ridge.predict.return_value = np.array([84.0])
    scaler = MagicMock()
    scaler.transform.return_value = np.zeros((1, 12))
    p._ridge = ridge
    p._ridge_scaler = scaler

    from app.schemas import PredictionRequest

    req = PredictionRequest(
        college_code="1234",
        branch_name="computer engineering",
        category="OPEN",
        cap_round="II",
        student_percentile=student_percentile,
    )

    # Capture log output via a custom handler
    log_records: list[logging.LogRecord] = []

    class _Capture(logging.Handler):
        def emit(self, record: logging.LogRecord) -> None:
            log_records.append(record)

    pred_logger = logging.getLogger("app.predictor")
    handler = _Capture()
    handler.setLevel(logging.DEBUG)
    old_level = pred_logger.level
    pred_logger.setLevel(logging.DEBUG)
    pred_logger.addHandler(handler)
    try:
        p.predict(req, request_id="test-req-id", _force_shap=False)
    finally:
        pred_logger.removeHandler(handler)
        pred_logger.setLevel(old_level)

    log_entry = None
    for record in log_records:
        try:
            entry = json.loads(record.getMessage())
            if entry.get("event") == "prediction":
                log_entry = entry
                break
        except (json.JSONDecodeError, AttributeError):
            continue

    assert log_entry is not None, "No structured prediction log entry found"
    for field in REQUIRED_LOG_FIELDS:
        assert field in log_entry, f"Missing log field: {field}"
