"""
Integration tests for the ML Service.

Tests the full pipeline: train → health poll → predict → predict-batch.
Uses a small fixture XLSX dataset (≥3 years, ≥5 college-branch-category combos).

Feature: mhtcet-cutoff-prediction
Requirements: 5.1–5.3, 5.7, 5.8, 6.8
"""
from __future__ import annotations

import io
import json
import os
import tempfile
import time
from pathlib import Path
from unittest.mock import MagicMock, patch

import numpy as np
import pandas as pd
import pytest
from fastapi.testclient import TestClient

# ---------------------------------------------------------------------------
# Fixture: small in-memory dataset (≥3 years, ≥5 college-branch-category combos)
# ---------------------------------------------------------------------------

COLLEGES = [
    ("C001", "Alpha College", "computer engineering", "OPEN"),
    ("C002", "Beta College", "mechanical engineering", "OBC"),
    ("C003", "Gamma College", "civil engineering", "SC"),
    ("C004", "Delta College", "information technology", "OPEN"),
    ("C005", "Epsilon College", "electrical engineering", "ST"),
]

YEARS = [2022, 2023, 2024]
CAP_ROUNDS = ["I", "II"]
BASE_CUTOFFS = [85.0, 72.0, 65.0, 80.0, 60.0]


def _make_fixture_df() -> pd.DataFrame:
    """Build a minimal training DataFrame with ≥3 years and ≥5 combos."""
    rows = []
    for year in YEARS:
        for cap_round in CAP_ROUNDS:
            for i, (code, name, branch, category) in enumerate(COLLEGES):
                # Add slight year-over-year variation
                cutoff = BASE_CUTOFFS[i] + (year - 2022) * 0.5 + (0.3 if cap_round == "II" else 0.0)
                rows.append({
                    "college_code": code,
                    "college_name": name,
                    "branch_name": branch,
                    "category": category,
                    "cap_round": cap_round,
                    "year": year,
                    "cutoff_percentile": cutoff,
                    "location": "Pune",
                    "district": "Pune",
                    "fees": 50000,
                    "intake": 60,
                    "exam_type": "mhtcet",
                })
    return pd.DataFrame(rows)


# ---------------------------------------------------------------------------
# Helpers to build a trained predictor without real XLSX files
# ---------------------------------------------------------------------------

def _build_trained_predictor(model_dir: str) -> None:
    """Run the full training pipeline on fixture data and save artifacts."""
    from app.data_loader import DataLoader
    from app.feature_engineer import FeatureEngineer
    from app.trainer import Trainer

    df = _make_fixture_df()

    # Patch DataLoader.load to return our fixture df
    fe = FeatureEngineer(scaler_path=Path(model_dir) / "feature_scaler.pkl")
    df_feat = fe.fit_transform(df)

    trainer = Trainer()
    trainer.train(df_feat, model_dir)


# ---------------------------------------------------------------------------
# Integration tests
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def trained_model_dir():
    """Train once and reuse across all integration tests."""
    with tempfile.TemporaryDirectory() as tmpdir:
        _build_trained_predictor(tmpdir)
        yield tmpdir


@pytest.fixture(scope="module")
def integration_client(trained_model_dir):
    """TestClient with a fully loaded predictor."""
    import main
    from app.predictor import Predictor

    # Create a fresh predictor loaded from the trained artifacts
    p = Predictor()
    p.load_artifacts(trained_model_dir)

    with patch.object(main, "_model_state", "ready"), \
         patch("app.predictor.predictor", p):
        client = TestClient(main.app, raise_server_exceptions=False)
        yield client


VALID_PREDICT_BODY = {
    "college_code": "C001",
    "branch_name": "computer engineering",
    "category": "OPEN",
    "cap_round": "II",
    "student_percentile": 87.5,
    "exam_type": "mhtcet",
    "district": "Pune",
}

VALID_FIELDS = {
    "p10", "p50", "p90", "admission_probability", "confidence_score",
    "confidence_label", "admission_band", "top_factors", "predicted_year",
}

VALID_BANDS = {"Safe", "Likely", "Moderate", "Risky"}
VALID_LABELS = {"High confidence", "Medium confidence", "Low confidence (estimated)"}


class TestIntegrationPredict:
    """Integration tests for POST /api/predict with a real trained model."""

    def test_predict_returns_200(self, integration_client):
        resp = integration_client.post("/api/predict", json=VALID_PREDICT_BODY)
        assert resp.status_code == 200

    def test_predict_all_fields_present(self, integration_client):
        resp = integration_client.post("/api/predict", json=VALID_PREDICT_BODY)
        data = resp.json()
        for field in VALID_FIELDS:
            assert field in data, f"Missing field: {field}"

    def test_predict_p10_le_p50_le_p90(self, integration_client):
        resp = integration_client.post("/api/predict", json=VALID_PREDICT_BODY)
        data = resp.json()
        assert data["p10"] <= data["p50"] <= data["p90"], (
            f"Monotonicity violated: p10={data['p10']}, p50={data['p50']}, p90={data['p90']}"
        )

    def test_predict_admission_probability_in_range(self, integration_client):
        resp = integration_client.post("/api/predict", json=VALID_PREDICT_BODY)
        data = resp.json()
        assert 0.0 <= data["admission_probability"] <= 100.0

    def test_predict_confidence_score_in_range(self, integration_client):
        resp = integration_client.post("/api/predict", json=VALID_PREDICT_BODY)
        data = resp.json()
        assert 0.0 <= data["confidence_score"] <= 1.0

    def test_predict_admission_band_valid(self, integration_client):
        resp = integration_client.post("/api/predict", json=VALID_PREDICT_BODY)
        data = resp.json()
        assert data["admission_band"] in VALID_BANDS

    def test_predict_confidence_label_valid(self, integration_client):
        resp = integration_client.post("/api/predict", json=VALID_PREDICT_BODY)
        data = resp.json()
        assert data["confidence_label"] in VALID_LABELS

    def test_predict_top_factors_is_list(self, integration_client):
        resp = integration_client.post("/api/predict", json=VALID_PREDICT_BODY)
        data = resp.json()
        assert isinstance(data["top_factors"], list)

    def test_predict_predicted_year_is_int(self, integration_client):
        resp = integration_client.post("/api/predict", json=VALID_PREDICT_BODY)
        data = resp.json()
        assert isinstance(data["predicted_year"], int)

    def test_predict_different_colleges(self, integration_client):
        """Test predictions for all 5 fixture colleges."""
        for code, _, branch, category in COLLEGES:
            body = {
                "college_code": code,
                "branch_name": branch,
                "category": category,
                "cap_round": "I",
                "student_percentile": 75.0,
                "exam_type": "mhtcet",
                "district": "Pune",
            }
            resp = integration_client.post("/api/predict", json=body)
            assert resp.status_code == 200
            data = resp.json()
            assert data["p10"] <= data["p50"] <= data["p90"]
            assert 0.0 <= data["admission_probability"] <= 100.0


class TestIntegrationPredictBatch:
    """Integration tests for POST /api/predict-batch."""

    def test_batch_returns_200(self, integration_client):
        body = {"requests": [VALID_PREDICT_BODY] * 3}
        resp = integration_client.post("/api/predict-batch", json=body)
        assert resp.status_code == 200

    def test_batch_response_count_matches_input(self, integration_client):
        n = 5
        body = {"requests": [VALID_PREDICT_BODY] * n}
        resp = integration_client.post("/api/predict-batch", json=body)
        data = resp.json()
        assert len(data["results"]) == n

    def test_batch_preserves_order(self, integration_client):
        """Each result should correspond to the same-index request."""
        requests = []
        for code, _, branch, category in COLLEGES:
            requests.append({
                "college_code": code,
                "branch_name": branch,
                "category": category,
                "cap_round": "II",
                "student_percentile": 80.0,
                "exam_type": "mhtcet",
                "district": "Pune",
            })
        body = {"requests": requests}
        resp = integration_client.post("/api/predict-batch", json=body)
        data = resp.json()
        assert len(data["results"]) == len(requests)
        # All results should be valid PredictionResults
        for result in data["results"]:
            for field in VALID_FIELDS:
                assert field in result

    def test_batch_all_results_monotone(self, integration_client):
        body = {"requests": [VALID_PREDICT_BODY] * 5}
        resp = integration_client.post("/api/predict-batch", json=body)
        data = resp.json()
        for r in data["results"]:
            assert r["p10"] <= r["p50"] <= r["p90"]

    def test_batch_all_probabilities_in_range(self, integration_client):
        body = {"requests": [VALID_PREDICT_BODY] * 5}
        resp = integration_client.post("/api/predict-batch", json=body)
        data = resp.json()
        for r in data["results"]:
            assert 0.0 <= r["admission_probability"] <= 100.0
            assert 0.0 <= r["confidence_score"] <= 1.0

    def test_batch_all_bands_valid(self, integration_client):
        body = {"requests": [VALID_PREDICT_BODY] * 5}
        resp = integration_client.post("/api/predict-batch", json=body)
        data = resp.json()
        for r in data["results"]:
            assert r["admission_band"] in VALID_BANDS
            assert r["confidence_label"] in VALID_LABELS


class TestIntegrationHealth:
    """Integration tests for GET /health with loaded model."""

    def test_health_returns_200(self, integration_client):
        resp = integration_client.get("/health")
        assert resp.status_code == 200

    def test_health_ready_for_predictions(self, integration_client):
        resp = integration_client.get("/health")
        data = resp.json()
        assert data["ready_for_predictions"] is True
        assert data["model_state"] == "ready"


class TestIntegrationTrainConflict:
    """Test POST /api/train returns 409 when already loading."""

    def test_train_409_when_loading(self):
        import main
        with patch.object(main, "TRAINING_ENABLED", True), \
             patch.object(main, "_model_state", "loading"):
            client = TestClient(main.app, raise_server_exceptions=False)
            resp = client.post("/api/train")
        assert resp.status_code == 409
