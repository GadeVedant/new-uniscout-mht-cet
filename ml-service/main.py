from __future__ import annotations
import json
import logging
import os
from contextlib import asynccontextmanager
from pathlib import Path

from dotenv import load_dotenv
from fastapi import BackgroundTasks, FastAPI, Header, HTTPException, Request
from fastapi.responses import JSONResponse

load_dotenv()

from app.schemas import (
    BatchPredictionRequest,
    BatchPredictionResponse,
    HealthResponse,
    MetricsResponse,
    PredictionRequest,
    PredictionResult,
)
from app.metrics import metrics_collector

logging.basicConfig(level=os.getenv("ML_LOG_LEVEL", "INFO"))
logger = logging.getLogger(__name__)

ML_MODEL_DIR = os.getenv("ML_MODEL_DIR", "./models")
TRAINING_ENABLED = os.getenv("TRAINING_ENABLED", "false").lower() == "true"

# Model state machine: "not_loaded" | "loading" | "ready"
_model_state: str = "not_loaded"
_model_metadata: dict = {}


def _load_metadata() -> dict:
    path = Path(ML_MODEL_DIR) / "model_metadata.json"
    if path.exists():
        with open(path) as f:
            return json.load(f)
    return {}


@asynccontextmanager
async def lifespan(app: FastAPI):
    global _model_state, _model_metadata
    # Attempt to load artifacts on startup
    try:
        from app.predictor import predictor
        predictor.load_artifacts(ML_MODEL_DIR)
        _model_metadata = _load_metadata()
        _model_state = "ready"
        version = _model_metadata.get("model_version", "unknown")
        metrics_collector.set_model_version(version)
        logger.info(f"Model loaded on startup: version={version}")
    except Exception as e:
        logger.warning(f"Model artifacts not found at startup: {e}. "
                       "Service will start in 'not_loaded' state. "
                       "Trigger POST /api/train to train the model.")
        _model_state = "not_loaded"
    yield


app = FastAPI(title="UniScout ML Service", version="1.0.0", lifespan=lifespan)


@app.get("/")
def root():
    return {"service": "UniScout ML Service", "status": "running", "docs": "/docs", "health": "/health"}


# ---------------------------------------------------------------------------
# Health
# ---------------------------------------------------------------------------

@app.get("/health", response_model=HealthResponse)
def health():
    return HealthResponse(
        status="ok" if _model_state == "ready" else "degraded",
        model_loaded=_model_state == "ready",
        model_state=_model_state,
        model_version=_model_metadata.get("model_version"),
        training_date=_model_metadata.get("training_date"),
        validation_mae=_model_metadata.get("validation_mae"),
        ready_for_predictions=_model_state == "ready",
    )


# ---------------------------------------------------------------------------
# Metrics
# ---------------------------------------------------------------------------

@app.get("/metrics", response_model=MetricsResponse)
def get_metrics():
    return metrics_collector.get_metrics()


# ---------------------------------------------------------------------------
# Predict (single)
# ---------------------------------------------------------------------------

@app.post("/api/predict", response_model=PredictionResult)
def predict(
    request: PredictionRequest,
    x_request_id: str | None = Header(default=None),
):
    if _model_state != "ready":
        raise HTTPException(
            status_code=503,
            detail="Model is currently being retrained. Please retry shortly."
            if _model_state == "loading"
            else "Model artifacts not loaded. Trigger POST /api/train first.",
        )
    from app.predictor import predictor
    return predictor.predict(request, request_id=x_request_id)


# ---------------------------------------------------------------------------
# Predict (batch)
# ---------------------------------------------------------------------------

@app.post("/api/predict-batch", response_model=BatchPredictionResponse)
def predict_batch(
    body: BatchPredictionRequest,
    x_request_id: str | None = Header(default=None),
):
    if _model_state != "ready":
        raise HTTPException(
            status_code=503,
            detail="Model is currently being retrained. Please retry shortly."
            if _model_state == "loading"
            else "Model artifacts not loaded. Trigger POST /api/train first.",
        )
    from app.predictor import predictor
    results = predictor.predict_batch(body.requests, request_id=x_request_id)
    return BatchPredictionResponse(results=results)


# ---------------------------------------------------------------------------
# Train
# ---------------------------------------------------------------------------

@app.post("/api/train", status_code=202)
def train(background_tasks: BackgroundTasks):
    global _model_state
    if not TRAINING_ENABLED:
        raise HTTPException(status_code=403, detail="Training is disabled in production. Run train.py locally.")
    if _model_state == "loading":
        raise HTTPException(status_code=409, detail="Training job already in progress.")

    import datetime
    job_id = f"train_{datetime.datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
    _model_state = "loading"
    background_tasks.add_task(_run_training, job_id)
    return {"job_id": job_id, "status": "accepted"}


def _run_training(job_id: str) -> None:
    global _model_state, _model_metadata
    try:
        from app.data_loader import DataLoader
        from app.feature_engineer import FeatureEngineer
        from app.trainer import Trainer

        data_dir = os.getenv("ML_DATA_DIR", "./data")
        loader = DataLoader()
        df = loader.load(data_dir)
        fe = FeatureEngineer()
        df_feat = fe.fit_transform(df)
        trainer = Trainer()
        trainer.train(df_feat, ML_MODEL_DIR)

        from app.predictor import predictor
        predictor.load_artifacts(ML_MODEL_DIR)
        _model_metadata = _load_metadata()
        version = _model_metadata.get("model_version", "unknown")
        metrics_collector.set_model_version(version)
        _model_state = "ready"
        logger.info(f"Training complete: job_id={job_id}, version={version}")
    except Exception as e:
        _model_state = "not_loaded"
        logger.error(f"Training failed: job_id={job_id}, error={e}", exc_info=True)


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("ML_SERVICE_PORT", "8000"))
    uvicorn.run("main:app", host="0.0.0.0", port=port, reload=False)
