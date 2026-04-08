from __future__ import annotations
from typing import Literal, Optional
from pydantic import BaseModel, Field


class PredictionRequest(BaseModel):
    college_code: str
    branch_name: str
    category: str
    cap_round: Literal["I", "II", "III"]
    student_percentile: float = Field(..., ge=0, le=100)
    exam_type: str = "mhtcet"
    district: str = ""
    explain: bool = False


class PredictionResult(BaseModel):
    p10: float
    p50: float
    p90: float
    admission_probability: float
    confidence_score: float
    confidence_label: str
    admission_band: str
    top_factors: list[str]
    predicted_year: int
    fallback_reason: Optional[str] = None


class BatchPredictionRequest(BaseModel):
    requests: list[PredictionRequest] = Field(..., max_length=200)


class BatchPredictionResponse(BaseModel):
    results: list[PredictionResult]


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool
    model_state: str
    model_version: Optional[str] = None
    training_date: Optional[str] = None
    validation_mae: Optional[float] = None
    ready_for_predictions: bool


class MetricsResponse(BaseModel):
    p95_latency_ms: float
    total_predictions: int
    fallback_pct_district: float
    fallback_pct_state: float
    fallback_pct_global: float
    cold_start_frequency: float
    model_version: str
