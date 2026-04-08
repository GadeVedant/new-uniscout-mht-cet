# Implementation Plan: MHT-CET Cutoff Prediction

## Overview

Implement the ML-powered cutoff prediction system as a Python FastAPI microservice (`ml-service/`) integrated with the existing Node.js backend (`backend-mhtcet/`). Tasks follow the data flow: scaffold → data loading → feature engineering → cold start → training → inference → API routes → Node.js integration.

## Tasks

- [x] 1. Scaffold ML_Service project structure
  - Create `ml-service/` directory with `main.py` (FastAPI skeleton), `train.py` (standalone local training script), `requirements.txt`, `.env.example`, and `app/` package with empty module files (`data_loader.py`, `feature_engineer.py`, `trainer.py`, `predictor.py`, `cold_start_handler.py`, `schemas.py`, `metrics.py`)
  - Create `ml-service/models/` directory with a `.gitkeep` — this directory IS committed to git (artifacts are deployed with the service); create `ml-service/data/` with `.gitignore` entry (XLSX files are local-only, never committed)
  - Create `ml-service/tests/` directory with empty test files
  - In `schemas.py`: define all Pydantic v2 models — `PredictionRequest` (with `district: str = ""` and `explain: bool = False`), `PredictionResult`, `BatchPredictionRequest` (with `max_size` validation — reject with HTTP 413 if `len(requests) > MAX_BATCH_SIZE`, default 200), `BatchPredictionResponse`, `HealthResponse` (with `model_state` and `ready_for_predictions: bool` fields), `MetricsResponse`
  - In `metrics.py`: implement in-memory counter/histogram collector with methods `record_prediction(latency_ms, fallback_reason)`, `get_metrics() -> MetricsResponse`
  - In `main.py`: initialise FastAPI app, implement model state machine (`not_loaded` / `loading` / `ready`) as a module-level variable, register placeholder routes for all 5 endpoints; add `@app.on_event("startup")` hook that attempts `predictor.load_artifacts(ML_MODEL_DIR)` — if model files are present, set `model_state = "ready"`; if model directory is empty or artifacts are missing, log a warning and leave `model_state = "not_loaded"` (service starts normally, predictions return HTTP 503 until artifacts are present)
  - In `.env.example`: add all env vars (`ML_DATA_DIR`, `ML_MODEL_DIR`, `ML_SERVICE_PORT`, `ML_LOG_LEVEL`, `ML_SIGMOID_K`, `ML_EPSILON`, `ML_CONFIDENCE_W1`, `ML_CONFIDENCE_W2`, `SHAP_BATCH_THRESHOLD`, `ML_BATCH_TIMEOUT_MS`, `MAX_BATCH_SIZE`, `ML_TRAIN_TIMEOUT_SEC`, `TRAINING_ENABLED=false`)
  - _Requirements: 6.1, 6.3, 6.4, 6.7, 10.2_

- [x] 2. Implement Data_Loader (`app/data_loader.py`)
  - [x] 2.1 Implement `DataLoader.load(data_dir, exam_type)` — read all `.xlsx` files from `data_dir` using `openpyxl` via `pandas`, normalise column names to canonical schema (`college_code`, `college_name`, `branch_name`, `category`, `cap_round`, `year`, `cutoff_percentile`, `location`, `district`, `fees`, `intake`), tag all rows with `exam_type`
    - _Requirements: 1.1, 1.2, 9.2_
  - [x] 2.2 Add row validation — discard rows missing any required field (`college_name`, `branch_name`, `category`, `cap_round`, `year`, `cutoff_percentile`) or with `cutoff_percentile` outside [0, 100]; log a warning with row index and file name for each discarded row
    - _Requirements: 1.3, 1.4_
  - [x] 2.3 Add deduplication — for rows sharing the same `(college_code, branch_name, category, cap_round, year)` key, retain only the row with the highest `cutoff_percentile`
    - _Requirements: 1.5_
  - [x] 2.4 Add round-trip CSV validation method — serialise loaded DataFrame to CSV and re-parse; assert same row count and values within tolerance 0.001
    - _Requirements: 1.6_
  - [x] 2.5 Write property test for column name normalisation (Property 1)
    - **Property 1: Column name normalisation**
    - **Validates: Requirements 1.2**
    - Use `hypothesis` with synthetic XLSX fixtures covering all supported column name variants; assert output contains exactly the canonical column names
  - [x] 2.6 Write property test for invalid row discarding (Property 2)
    - **Property 2: Invalid row discarding**
    - **Validates: Requirements 1.3, 1.4**
    - Generate rows with arbitrary missing fields or out-of-range `cutoff_percentile`; assert none appear in loaded dataset
  - [x] 2.7 Write property test for deduplication (Property 3)
    - **Property 3: Deduplication retains highest cutoff**
    - **Validates: Requirements 1.5**
    - Generate groups of rows with the same key; assert exactly one row per key with the maximum `cutoff_percentile`
  - [x] 2.8 Write property test for data round-trip (Property 4)
    - **Property 4: Data round-trip**
    - **Validates: Requirements 1.6**
    - For any valid loaded dataset, serialise to CSV and re-parse; assert same row count and values within 0.001
  - [x] 2.9 Write unit tests for `DataLoader` (`tests/test_data_loader.py`)
    - Test column normalisation with known XLSX fixtures; missing-field discarding; out-of-range cutoff discarding; deduplication; round-trip CSV serialisation
    - _Requirements: 1.1–1.6_

- [x] 3. Checkpoint — Ensure all Data_Loader tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Implement Feature_Engineer (`app/feature_engineer.py`)
  - [x] 4.1 Implement `FeatureEngineer.fit_transform(df)` — compute all 11 features: `cutoff_t1/t2/t3` (year-over-year lags), `cutoff_volatility` (rolling std dev), `cap_round_delta` (Round I − Round II), `college_prestige_score` (mean cutoff per college in most recent year), `branch_demand_index` (mean cutoff per branch in most recent year), `category_fill_rate` (filled/intake with category-median fallback), `seat_count` (intake with branch-median imputation), `location_influence` (mean cutoff per location/district), `global_cutoff_shift` (current year mean − previous year mean), `exam_type` (label-encoded); set `is_cold_start = True` for rows with imputed lags; persist all group statistics in `feature_scaler.pkl` including `sample_size` lookup dict keyed by `(college_code, branch_name, category)`
    - _Requirements: 2.1–2.11, 9.1_
  - [x] 4.2 Implement `FeatureEngineer.transform(df)` — apply stored group statistics from `feature_scaler.pkl` for inference-time feature computation without refitting
    - _Requirements: 2.1–2.11_
  - [x] 4.3 Write property test for lag feature correctness (Property 5)
    - **Property 5: Lag feature correctness**
    - **Validates: Requirements 2.1**
    - For any group with ≥N years of history, assert `cutoff_tN` equals the cutoff exactly N years prior
  - [x] 4.4 Write property test for volatility correctness (Property 6)
    - **Property 6: Volatility correctness**
    - **Validates: Requirements 2.2**
    - Assert `cutoff_volatility` equals `std(cutoff_percentile)` for each group
  - [x] 4.5 Write property test for cap_round_delta correctness (Property 7)
    - **Property 7: cap_round_delta correctness**
    - **Validates: Requirements 2.3**
    - For any combination where both Round I and Round II exist, assert `cap_round_delta == cutoff_round_I − cutoff_round_II`
  - [x] 4.6 Write property test for prestige and demand index correctness (Property 8)
    - **Property 8: Prestige and demand index correctness**
    - **Validates: Requirements 2.4, 2.5**
    - Assert `college_prestige_score` and `branch_demand_index` equal the respective means in the most recent year
  - [x] 4.7 Write property test for fill rate and seat count imputation (Property 9)
    - **Property 9: Fill rate and seat count imputation**
    - **Validates: Requirements 2.6, 2.7**
    - Assert correct values when intake is present; assert median fallback when intake is missing
  - [x] 4.8 Write property test for location influence correctness (Property 10)
    - **Property 10: Location influence correctness**
    - **Validates: Requirements 2.8**
    - Assert `location_influence` equals mean cutoff of all colleges in that location/district
  - [x] 4.9 Write property test for exam_type encoding consistency (Property 11)
    - **Property 11: exam_type encoding consistency**
    - **Validates: Requirements 2.9, 9.1, 9.2**
    - Assert same integer encoding at training and inference time; assert all rows carry the passed `exam_type`
  - [x] 4.10 Write property test for cold start lag imputation and flag (Property 12)
    - **Property 12: Cold start lag imputation and flag**
    - **Validates: Requirements 2.10**
    - For rows with insufficient history, assert missing lags equal group mean and `is_cold_start == True`
  - [x] 4.11 Write property test for global cutoff shift correctness (Property 13)
    - **Property 13: Global cutoff shift correctness**
    - **Validates: Requirements 2.11**
    - For any dataset with ≥2 years, assert `global_cutoff_shift == mean(current_year) − mean(previous_year)`
  - [x] 4.12 Write unit tests for `FeatureEngineer` (`tests/test_feature_engineer.py`)
    - Test all 11 features against known datasets; test `is_cold_start` flag; test `transform` uses stored stats without refitting
    - _Requirements: 2.1–2.11_

- [x] 5. Checkpoint — Ensure all Feature_Engineer tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 6. Implement Cold_Start_Handler (`app/cold_start_handler.py`)
  - [x] 6.1 Implement `ColdStartHandler` — populate district/state/global lookup tables from training data statistics at startup; implement `get_fallback(branch_name, category, cap_round, district, college_code)` with tiered fallback: district mean (confidence_cap=0.50, fallback_reason="district_average") → state mean (confidence_cap=0.35, fallback_reason="state_average") → global median for (category, cap_round) (confidence_cap=0.25, fallback_reason="global_median"); guarantee non-null return for any valid (branch_name, category, cap_round) in training data
    - _Requirements: 4.1–4.5_
  - [x] 6.2 Write property test for tiered cold start fallback (Property 16)
    - **Property 16: Tiered cold start fallback**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.5**
    - For any unseen combination, assert correct fallback tier is used and result is non-null
  - [x] 6.3 Write property test for cold start confidence caps (Property 17)
    - **Property 17: Cold start confidence caps**
    - **Validates: Requirements 4.4**
    - Assert `confidence_score` does not exceed 0.50/0.35/0.25 for district/state/global fallback respectively
  - [x] 6.4 Write unit tests for `ColdStartHandler` (`tests/test_cold_start.py`)
    - Test district fallback; state fallback; global fallback; confidence caps; non-null guarantee
    - _Requirements: 4.1–4.5_

- [x] 7. Implement Trainer (`app/trainer.py`) and standalone training script (`train.py`)
  - [x] 7.1 Implement `Trainer.train(df, model_dir, dry_run=False)` — perform time-series CV (fold per year, no shuffling, training years strictly < validation year); train three LightGBM quantile models (q=0.10, 0.50, 0.90) and one Ridge model targeting P50; blend P50 as `0.70 * lgbm_p50 + 0.30 * ridge_p50`; evaluate on held-out fold (MAE, Within_±1_Accuracy, Directional_Accuracy); log warning if MAE > 3.0; report metrics broken down by `category`, `cap_round`, and top-10 branches; produce calibration report (fraction of actuals within P10–P90 interval); when `dry_run=True`, run the full pipeline (data loading, feature engineering, CV, training, evaluation) but skip artifact persistence — useful for debugging feature/data issues without overwriting production models
    - _Requirements: 3.1–3.6, 8.1–8.5_
  - [x] 7.2 Implement atomic artifact persistence — write `lgbm_p10.txt`, `lgbm_p50.txt`, `lgbm_p90.txt`, `ridge_p50.pkl`, `feature_scaler.pkl`, `feature_columns.json` to a temp directory first, then rename to `model_dir` on success; write `model_metadata.json` with `model_version` (timestamp `YYYYMMDD_HHMMSS`), `training_date`, `data_row_count`, `validation_mae`, `validation_within_1_accuracy`, `validation_directional_accuracy`, `exam_types`
    - _Requirements: 3.7, 3.8_
  - [x] 7.3 Implement `train.py` standalone script — CLI entry point for local training: loads XLSX files from `ML_DATA_DIR`, runs `DataLoader.load` → `FeatureEngineer.fit_transform` → `Trainer.train`, writes artifacts to `ML_MODEL_DIR` (`ml-service/models/`); supports `--dry-run` flag; prints evaluation metrics to stdout; this script is run locally before committing artifacts and redeploying to Render/Railway
  - [x] 7.4 Write property test for time-series CV no-leakage (Property 14)
    - **Property 14: Time-series CV no-leakage**
    - **Validates: Requirements 3.1**
    - For any CV fold, assert every training sample has `year` strictly less than the validation year
  - [x] 7.5 Write property test for P50 blend formula (Property 15)
    - **Property 15: P50 blend formula**
    - **Validates: Requirements 3.4**
    - For any pair of lgbm_p50 and ridge_p50 values, assert blended output equals `0.70 * lgbm_p50 + 0.30 * ridge_p50` within floating-point tolerance

- [x] 8. Implement Predictor (`app/predictor.py`)
  - [x] 8.1 Implement `Predictor.load_artifacts(model_dir)` — load `lgbm_p10.txt`, `lgbm_p50.txt`, `lgbm_p90.txt`, `ridge_p50.pkl`, `feature_scaler.pkl`, `feature_columns.json` from disk; raise if any artifact is missing
    - _Requirements: 5.5_
  - [x] 8.2 Implement `Predictor.predict(request)` — apply `FeatureEngineer.transform`, run LightGBM and Ridge inference, blend P50, apply epsilon monotonicity fix (`p10 = p50 - epsilon` if `p10 > p50`; `p90 = p50 + epsilon` if `p90 < p50`; default epsilon=0.2), compute `admission_probability` via sigmoid (`z = (student_percentile - p50) / max(p90 - p10, epsilon)`, `admission_probability = sigmoid(k * z) * 100`, default k=2.5), compute `confidence_score` using deterministic formula (`raw = w1 * (1 / max(p90-p10, epsilon)) + w2 * log(sample_size + 1)`, normalised to [0,1] using `raw_min`/`raw_max` from `feature_scaler.pkl`; default w1=0.6, w2=0.4; `sample_size` from lookup dict, default=1 if not found), derive `admission_band` and `confidence_label`; compute SHAP `top_factors` only when `request.explain == True` OR `sample_size > SHAP_SAMPLE_THRESHOLD` (default threshold configurable, e.g. 10) — otherwise set `top_factors = []`; emit structured JSON log with `request_id` from `X-Request-ID` header
    - _Requirements: 5.1–5.9, 10.1_
  - [x] 8.3 Implement `Predictor.predict_batch(requests)` — enforce `MAX_BATCH_SIZE` limit (return HTTP 413 if exceeded); call `predict` per item; if any individual item raises an exception, return a `PredictionResult` with `fallback_reason = "error"` for that item rather than failing the whole batch (partial success); skip SHAP for items beyond `SHAP_BATCH_THRESHOLD` (default 20) or when `ML_BATCH_TIMEOUT_MS` soft budget is exceeded (set `top_factors = []`); preserve input ordering in output
    - _Requirements: 5.1–5.9, 6.8_
  - [x] 8.4 Wire `ColdStartHandler` into `Predictor.predict` — when `is_cold_start` is True, use `ColdStartHandler.get_fallback` for P50 estimate and apply the corresponding confidence cap; set `fallback_reason` in `PredictionResult`
    - _Requirements: 4.1–4.5_
  - [x] 8.5 Write property test for admission probability formula (Property 19)
    - **Property 19: Admission probability formula**
    - **Validates: Requirements 5.2**
    - For any `(student_percentile, p50, p10, p90)` with `p90 > p10`, assert `admission_probability == sigmoid(k * (student_percentile - p50) / (p90 - p10)) * 100`
  - [x] 8.6 Write property test for monotonicity invariant (Property 20)
    - **Property 20: Monotonicity invariant**
    - **Validates: Requirements 5.3**
    - For any raw `(p10, p50, p90)` triple, assert `p10 ≤ p50 ≤ p90` after epsilon fix
  - [x] 8.7 Write property test for confidence score formula (Property 21)
    - **Property 21: Confidence score formula**
    - **Validates: Requirements 5.4**
    - For any `(interval_width, sample_size)` pair, assert `confidence_score` equals normalised output of the deterministic formula, clipped to [0, 1]
  - [x] 8.8 Write property test for admission band and confidence label mapping (Property 22)
    - **Property 22: Admission band and confidence label threshold mapping**
    - **Validates: Requirements 5.7, 5.8**
    - For any value in [0,100] and [0,1], assert exactly one label is returned per the threshold rules
  - [x] 8.9 Write property test for top_factors bounded (Property 23)
    - **Property 23: top_factors bounded**
    - **Validates: Requirements 5.9**
    - For single predictions, assert `top_factors` has 1–3 non-empty strings; for batch beyond threshold, assert `top_factors == []`
  - [x] 8.10 Write property test for PredictionResult completeness (Property 18)
    - **Property 18: PredictionResult completeness**
    - **Validates: Requirements 5.1**
    - For any valid prediction request, assert all required fields are non-null in the returned `PredictionResult`
  - [x] 8.11 Write unit tests for `Predictor` (`tests/test_predictor.py`)
    - Test admission probability formula; monotonicity invariant; confidence score formula; admission_band mapping; confidence_label mapping; top_factors length; HTTP 503 when not loaded; HTTP 422 on invalid percentile
    - _Requirements: 5.1–5.9_

- [x] 9. Checkpoint — Ensure all Predictor and Cold_Start_Handler tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement FastAPI routes (`main.py`)
  - [x] 10.1 Implement `POST /api/predict` — validate request via `PredictionRequest` schema (HTTP 422 on failure), return HTTP 503 if `model_state != "ready"`, call `predictor.predict(request)`, return `PredictionResult` with HTTP 200; read `X-Request-ID` header and propagate to predictor for structured logging
    - _Requirements: 6.1, 6.2, 6.5, 6.6_
  - [x] 10.2 Implement `POST /api/predict-batch` — validate via `BatchPredictionRequest`; return HTTP 413 if `len(requests) > MAX_BATCH_SIZE`; return HTTP 503 if `model_state != "ready"`; call `predictor.predict_batch(requests)`; return `BatchPredictionResponse` preserving input order; individual item failures return a result with `fallback_reason = "error"` rather than failing the whole request
    - _Requirements: 6.8_
  - [x] 10.3 Implement `POST /api/train` — return HTTP 403 if `TRAINING_ENABLED != "true"` (disabled in production on Render/Railway); return HTTP 409 if `model_state == "loading"`, set `model_state = "loading"`, enqueue training job via `BackgroundTasks` (calls `DataLoader.load` → `FeatureEngineer.fit_transform` → `Trainer.train`; on completion set `model_state = "ready"` and call `predictor.load_artifacts()` to hot-reload the new artifacts; on failure set `model_state = "not_loaded"` and log the error), return HTTP 202 with `job_id`; note: in normal production use this endpoint is disabled — retraining is done locally via `train.py` and artifacts are redeployed via git push
    - _Requirements: 6.4_
  - [x] 10.4 Implement `GET /health` — always return HTTP 200 with `HealthResponse` including `model_state` and `ready_for_predictions: bool` (true only when `model_state == "ready"`); populate `model_version`, `training_date`, `validation_mae` from `model_metadata.json` when loaded
    - _Requirements: 6.3_
  - [x] 10.5 Implement `GET /metrics` — return `MetricsResponse` from `metrics.py` collector
    - _Requirements: 10.2_
  - [x] 10.6 Write property test for invalid percentile rejected (Property 24)
    - **Property 24: Invalid percentile rejected**
    - **Validates: Requirements 5.6, 6.5**
    - For any `student_percentile` outside [0, 100], assert HTTP 422 response
  - [x] 10.7 Write property test for batch response ordering (Property 25)
    - **Property 25: Batch response ordering**
    - **Validates: Requirements 6.8**
    - For any batch of N requests, assert response array has exactly N results in the same order
  - [x] 10.8 Write property test for ML response fields completeness (Property 26)
    - **Property 26: ML response fields completeness**
    - **Validates: Requirements 6.2**
    - For any valid request to `/api/predict` or `/api/predict-batch`, assert all required fields are present in the JSON response
  - [x] 10.9 Write property test for prediction log completeness (Property 30)
    - **Property 30: Prediction log completeness**
    - **Validates: Requirements 10.1**
    - For any prediction served, assert structured log entry contains all required fields

- [x] 11. Checkpoint — Ensure all FastAPI route tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Node_Backend MLServiceClient (`backend-mhtcet/src/services/mlServiceClient.ts`)
  - Create `mlServiceClient.ts` — implement `MLServiceClient` class with `predictBatch(requests, requestId?)` method using `axios.post` to `${ML_SERVICE_URL}/api/predict-batch` with 150ms timeout and `X-Request-ID` header (use provided `requestId` or generate UUID via `randomUUID()`); export singleton `mlServiceClient`; add `MLPredictionRequest` and `MLPredictionResult` interfaces matching the design data models
  - _Requirements: 7.1, 7.4_

- [x] 13. Implement Node_Backend mlPredictionCache (`backend-mhtcet/src/services/mlPredictionCache.ts`)
  - Create `mlPredictionCache.ts` — implement in-process `Map<string, { result: MLPredictionResult; expiresAt: number }>` cache; implement `cacheKey(req, modelVersion)` using `SHA256(college_code|branch_name|category|cap_round|modelVersion)`; implement `get(req, modelVersion)` (returns null on miss or TTL expiry), `set(req, modelVersion, result)` (stores with `Date.now() + ML_CACHE_TTL_MS`); implement `warmCache(topN)` — source the top `topN` combinations from the most frequent `(college_code, branch_name, category, cap_round)` tuples recorded in recent request logs, falling back to top colleges sorted by `college_prestige_score` from `dataService` if no request history exists; call `mlServiceClient.predictBatch` for those combinations and store results; if ML_Service unavailable, log warning and return silently (non-blocking)
  - _Requirements: 7.5_

- [x] 14. Update Node_Backend types (`backend-mhtcet/src/types/index.ts`)
  - Add optional ML fields to `CollegeRecommendation`: `p10?: number`, `p50?: number`, `p90?: number`, `admissionProbability?: number`, `admissionBand?: 'Safe' | 'Likely' | 'Moderate' | 'Risky'`, `confidenceLabel?: string`, `topFactors?: string[]`
  - Add `ml_unavailable?: boolean` to `ApiResponse.metadata`
  - _Requirements: 7.2, 7.3_

- [x] 15. Update Node_Backend recommendationService (`backend-mhtcet/src/services/recommendationService.ts`)
  - [x] 15.1 Generate a UUID `request_id` per incoming recommendation request; after rule-based filter, build `MLPredictionRequest[]` from filtered colleges (include `district` field from each college); check cache for each item; call `mlServiceClient.predictBatch` for cache-miss items with the `request_id`; merge ML results into `CollegeRecommendation` (populate `p10`, `p50`, `p90`, `admissionProbability`, `admissionBand`, `confidenceLabel`, `topFactors`); read `model_version` from `GET /health` on startup for cache key construction
    - _Requirements: 7.1, 7.2, 7.5_
  - [x] 15.2 Implement graceful fallback — on timeout, non-200, or unreachable ML_Service: keep existing rule-based `admissionChance` values, set `ml_unavailable: true` in response metadata, log fallback event with `request_id`, `reason`, and affected `(college_code, branch_name, category, cap_round)`
    - _Requirements: 7.3, 10.3_

- [x] 16. Checkpoint — Ensure Node_Backend compiles and existing tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 17. Write Node_Backend tests
  - [x] 17.1 Write unit tests for `MLServiceClient` (`mlServiceClient.test.ts`) — test 150ms timeout enforcement using a mock slow server; test batch call structure and `X-Request-ID` header
    - _Requirements: 7.1, 7.4_
  - [x] 17.2 Write unit tests for `mlPredictionCache` (`mlPredictionCache.test.ts`) — test cache hit on repeated request; TTL expiry (miss after TTL); model-version key invalidation (different version = miss)
    - _Requirements: 7.5_
  - [x] 17.3 Write unit tests for `recommendationService` (`recommendationService.test.ts`) — test ML enrichment on success (all ML fields populated); fallback on timeout (`ml_unavailable: true`, rule-based `admissionChance` preserved); fallback on non-200 (`ml_unavailable: true`); `ml_unavailable` flag absent on success
    - _Requirements: 7.2, 7.3_
  - [x] 17.4 Write fast-check property test for Node_Backend ML enrichment on success (Property 27)
    - **Property 27: Node_Backend ML enrichment on success**
    - **Validates: Requirements 7.2**
    - For any successful ML response, assert `CollegeRecommendation` includes all ML fields populated
  - [x] 17.5 Write fast-check property test for Node_Backend graceful fallback (Property 28)
    - **Property 28: Node_Backend graceful fallback**
    - **Validates: Requirements 7.3**
    - For any ML failure (timeout/non-200/unreachable), assert `ml_unavailable: true` in metadata and rule-based `admissionChance` preserved
  - [x] 17.6 Write fast-check property test for cache hit on repeated identical request (Property 29)
    - **Property 29: Cache hit on repeated identical request**
    - **Validates: Requirements 7.5**
    - For any two identical requests with same `model_version`, assert second is served from cache without calling ML_Service
  - [x] 17.7 Write fast-check property test for Node_Backend fallback log completeness (Property 31)
    - **Property 31: Node_Backend fallback log completeness**
    - **Validates: Requirements 10.3**
    - For any fallback event, assert log entry contains `request_id`, `reason`, and `(college_code, branch_name, category, cap_round)`

- [x] 18. Write integration test (`ml-service/tests/test_integration.py`)
  - Load a small fixture XLSX dataset (≥3 years, ≥5 college-branch-category combinations); trigger `POST /api/train` and poll `GET /health` until `ready_for_predictions == true` (timeout configurable via `ML_TRAIN_TIMEOUT_SEC`, default 120); call `POST /api/predict` with a valid request and assert all `PredictionResult` fields are present and within valid ranges (`p10 ≤ p50 ≤ p90`, `0 ≤ admission_probability ≤ 100`, `0 ≤ confidence_score ≤ 1`, `admission_band` in valid set, `confidence_label` in valid set); call `POST /api/predict-batch` with N requests and assert response array has exactly N results in the same order as input; call `POST /api/train` while training is in progress and assert HTTP 409
  - _Requirements: 5.1–5.3, 5.7, 5.8, 6.8_

- [x] 19. Final checkpoint — Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional — skip for MVP: focus on tasks 1–2, 4, 6–8, 10, 12–15 first (Data → Features → Model → Predict → API → Node integration), then add tests and observability
- SHAP is off by default — set `explain=true` in the request or tune `SHAP_SAMPLE_THRESHOLD` to enable it selectively
- Each task references specific requirements for traceability
- Property tests use `hypothesis` (Python) and `fast-check` (TypeScript), minimum 100 iterations each
- Each property test must include a comment: `# Feature: mhtcet-cutoff-prediction, Property N: <property_text>`
- Checkpoints ensure incremental validation before moving to the next layer
- **Training workflow**: run `python train.py` locally → artifacts written to `ml-service/models/` → `git commit models/` → `git push` → Render/Railway redeploys automatically
- **Local dev**: `uvicorn main:app --reload --port 8000` with `TRAINING_ENABLED=true` in `.env`
- **Production**: `TRAINING_ENABLED=false` — `POST /api/train` returns HTTP 403; service is inference-only
- Use `python train.py --dry-run` to debug feature/data issues without overwriting production model artifacts
- XLSX data files go in `ml-service/data/` which is gitignored — never commit raw data
