# Requirements Document

## Introduction

This feature replaces the existing rule-based admission chance classifier in the MHT-CET backend with a production-ready ML-powered cutoff prediction system. The system uses LightGBM quantile regression blended with Ridge Regression to predict P10, P50, and P90 cutoff percentile bounds for any college-branch-category-CAP round combination. It exposes a FastAPI microservice that the existing Node.js backend calls, returning a predicted cutoff range, median cutoff, admission probability, and confidence score. The system is trained on 3 years of MHT-CET CAP data and is designed to be extensible to other competitive exams (JEE, NEET, SSC) via an `exam_type` feature.

---

## Glossary

- **ML_Service**: The Python FastAPI microservice responsible for model training, inference, and serving predictions.
- **Node_Backend**: The existing TypeScript/Node.js Express backend at `backend-mhtcet/`.
- **LightGBM_Model**: The primary LightGBM quantile regression model predicting P10, P50, and P90 cutoff bounds.
- **Ridge_Model**: The secondary Ridge Regression model blended at ~30% weight with the LightGBM_Model output.
- **Ensemble**: The weighted blend of LightGBM_Model and Ridge_Model predictions.
- **Feature_Engineer**: The component responsible for computing derived features from raw historical data.
- **Predictor**: The inference component that accepts a prediction request and returns a PredictionResult.
- **Trainer**: The component that executes time-series cross-validation training and persists model artifacts.
- **Cold_Start_Handler**: The component that provides fallback predictions for unseen college-branch-category combinations.
- **Data_Loader**: The component that reads and normalises XLSX cutoff data files into a structured dataset.
- **PredictionResult**: The output object containing `p10`, `p50`, `p90`, `admission_probability`, and `confidence_score`.
- **CAP Round**: One of three Maharashtra centralised admission rounds (I, II, III).
- **Category**: A seat reservation category (e.g., OPEN, OBC, SC, ST, NT, EWS, TFWS).
- **Percentile**: A student's MHT-CET percentile score (0–100).
- **Confidence_Score**: A value in [0, 1] indicating the model's certainty in a prediction, derived from prediction interval width and training sample size using a deterministic weighted formula.
- **Admission_Probability**: The probability (0–100%) that a student with a given percentile will be admitted, derived from a sigmoid mapping of the student's normalised percentile distance from the predicted median cutoff.
- **Admission_Band**: A categorical label derived from `admission_probability`: "Safe" (≥80%), "Likely" (50–79%), "Moderate" (20–49%), or "Risky" (<20%).
- **Confidence_Label**: A human-readable label derived from `confidence_score`: "High confidence" (>0.75), "Medium confidence" (0.50–0.75), or "Low confidence (estimated)" (<0.50).
- **top_factors**: A list of up to 3 human-readable strings explaining the key drivers of a prediction, derived from SHAP feature importances.
- **Directional_Accuracy**: The fraction of predictions where the direction of year-over-year cutoff change is correctly predicted.
- **MAE**: Mean Absolute Error in percentile points between predicted P50 and actual cutoff.
- **Within_±1_Accuracy**: The fraction of predictions where the actual cutoff falls within ±1 percentile point of the predicted P50.
- **exam_type**: A categorical feature identifying the exam (e.g., `mhtcet`, `jee`, `neet`) to support future multi-exam extensibility.

---

## Requirements

### Requirement 1: Data Ingestion and Normalisation

**User Story:** As a data engineer, I want the ML service to load and normalise raw MHT-CET XLSX cutoff data, so that a clean, consistent dataset is available for feature engineering and model training.

#### Acceptance Criteria

1. WHEN the ML_Service starts or a training job is triggered, THE Data_Loader SHALL read all XLSX files from the configured data directory and parse them into a structured tabular dataset.
2. THE Data_Loader SHALL normalise column names to a canonical schema: `college_code`, `college_name`, `branch_name`, `category`, `cap_round`, `year`, `cutoff_percentile`, `location`, `district`, `fees`, `intake`.
3. WHEN a row is missing `college_name`, `branch_name`, `category`, `cap_round`, `year`, or `cutoff_percentile`, THE Data_Loader SHALL discard that row and log a warning with the row index and file name.
4. WHEN `cutoff_percentile` is outside the range [0, 100], THE Data_Loader SHALL discard that row and log a warning.
5. THE Data_Loader SHALL deduplicate rows with identical `(college_code, branch_name, category, cap_round, year)` keys by retaining the row with the highest `cutoff_percentile`.
6. THE Data_Loader SHALL expose a round-trip validation: FOR ALL valid rows loaded, serialising the dataset back to CSV and re-parsing it SHALL produce an equivalent dataset (same row count, same values within floating-point tolerance of 0.001).

---

### Requirement 2: Feature Engineering

**User Story:** As a data scientist, I want the Feature_Engineer to compute rich temporal and contextual features from the normalised dataset, so that the model can learn meaningful patterns beyond raw cutoff values.

#### Acceptance Criteria

1. THE Feature_Engineer SHALL compute year-over-year lag features `cutoff_t1`, `cutoff_t2`, `cutoff_t3` representing the cutoff percentile for the same `(college_code, branch_name, category, cap_round)` combination in the previous 1, 2, and 3 years respectively.
2. THE Feature_Engineer SHALL compute `cutoff_volatility` as the rolling standard deviation of `cutoff_percentile` over the available historical years for each `(college_code, branch_name, category, cap_round)` group.
3. THE Feature_Engineer SHALL compute `cap_round_delta` as the difference in cutoff percentile between CAP Round I and CAP Round II for the same `(college_code, branch_name, category, year)` combination.
4. THE Feature_Engineer SHALL compute `college_prestige_score` as the mean cutoff percentile across all branches and categories for a given `college_code` in the most recent available year.
5. THE Feature_Engineer SHALL compute `branch_demand_index` as the mean cutoff percentile across all colleges and categories for a given `branch_name` in the most recent available year.
6. THE Feature_Engineer SHALL compute `category_fill_rate` as the ratio of filled seats to total intake for a given `(college_code, branch_name, category, cap_round, year)` combination; WHEN intake data is unavailable, THE Feature_Engineer SHALL set `category_fill_rate` to the median fill rate of the same category across all colleges.
7. THE Feature_Engineer SHALL include `seat_count` (intake) as a numeric feature; WHEN intake is missing, THE Feature_Engineer SHALL impute it with the median intake for the same `branch_name`.
8. THE Feature_Engineer SHALL encode `location` and `district` as numeric `location_influence` scores derived from the mean cutoff percentile of colleges in that location/district.
9. THE Feature_Engineer SHALL include `exam_type` as a categorical feature, set to `"mhtcet"` for all current records, to support future multi-exam extensibility.
10. WHEN a lag feature (`cutoff_t1`, `cutoff_t2`, `cutoff_t3`) is unavailable due to insufficient history, THE Feature_Engineer SHALL set the missing lag to the available mean cutoff for that `(college_code, branch_name, category)` group, and SHALL set a boolean flag `is_cold_start` to `True` for that row.
11. THE Feature_Engineer SHALL compute `global_cutoff_shift` as the difference between the mean cutoff percentile across all colleges, branches, and categories in the current year and the previous year, to capture macro-level year-over-year shifts in cutoff trends.

---

### Requirement 3: Model Training

**User Story:** As a data scientist, I want the Trainer to train the Ensemble using time-series cross-validation, so that the model is evaluated on genuinely unseen future data and avoids data leakage.

#### Acceptance Criteria

1. THE Trainer SHALL use time-series cross-validation: for each fold, training data SHALL consist only of years strictly earlier than the validation year, and the most recent available year SHALL be used as the final validation fold.
2. THE Trainer SHALL train the LightGBM_Model as three separate quantile regression models targeting quantiles 0.10, 0.50, and 0.90 respectively.
3. THE Trainer SHALL train the Ridge_Model on the same feature set targeting the median cutoff (P50).
4. THE Trainer SHALL blend LightGBM_Model and Ridge_Model P50 predictions using a fixed weight of 0.70 for LightGBM_Model and 0.30 for Ridge_Model to produce the final P50 estimate.
5. WHEN training is complete, THE Trainer SHALL evaluate the Ensemble on the held-out validation fold and log MAE, Within_±1_Accuracy, and Directional_Accuracy.
6. WHEN MAE on the validation fold exceeds 3.0 percentile points, THE Trainer SHALL log a warning indicating the model may be underfit or the data may be insufficient.
7. THE Trainer SHALL persist trained model artifacts (LightGBM_Model binaries, Ridge_Model coefficients, feature scaler, feature column list) to a configured model directory.
8. THE Trainer SHALL record training metadata (training date, data row count, validation MAE, validation Within_±1_Accuracy) in a `model_metadata.json` file alongside the model artifacts.

---

### Requirement 4: Cold Start Handling

**User Story:** As a product manager, I want the system to return a reasonable prediction for new colleges or branches with no historical data, so that users are never shown an error for a valid query.

#### Acceptance Criteria

1. WHEN a prediction is requested for a `(college_code, branch_name, category, cap_round)` combination with no historical cutoff data, THE Cold_Start_Handler SHALL return a prediction based on the district-level average cutoff for the same `(branch_name, category, cap_round)`.
2. WHEN district-level data is also unavailable, THE Cold_Start_Handler SHALL fall back to the state-level average cutoff for the same `(branch_name, category, cap_round)`.
3. WHEN state-level data is also unavailable, THE Cold_Start_Handler SHALL return the overall median cutoff for the given `category` and `cap_round`.
4. WHEN the Cold_Start_Handler is used, THE Predictor SHALL set `confidence_score` according to the fallback level applied — district-level fallback SHALL cap `confidence_score` at 0.50, state-level fallback SHALL cap `confidence_score` at 0.35, and global median fallback SHALL cap `confidence_score` at 0.25 — and SHALL include a `fallback_reason` field in the PredictionResult indicating which fallback level was applied.
5. THE Cold_Start_Handler SHALL NOT return a null or error response for any valid combination of `(branch_name, category, cap_round)` present in the training data.

---

### Requirement 5: Prediction Inference

**User Story:** As a backend developer, I want the Predictor to return a complete PredictionResult for a given college-branch-category-percentile query, so that the Node_Backend can display meaningful admission guidance to students.

#### Acceptance Criteria

1. WHEN a valid prediction request is received, THE Predictor SHALL return a PredictionResult containing `p10`, `p50`, `p90` (predicted cutoff percentile bounds), `admission_probability` (0–100), `confidence_score` (0–1), `confidence_label`, `admission_band`, `top_factors`, and `predicted_year`.
2. THE Predictor SHALL compute `admission_probability` using a sigmoid mapping: compute `z = (student_percentile - p50) / (p90 - p10)`, then `admission_probability = sigmoid(k * z) * 100` where `k` is a tunable parameter in the range [2, 3].
3. THE Predictor SHALL ensure `p10 <= p50 <= p90` for every PredictionResult; IF `p10 > p50`, THE Predictor SHALL set `p10 = p50 - epsilon`; IF `p90 < p50`, THE Predictor SHALL set `p90 = p50 + epsilon`; where `epsilon` is a small configurable value in the range [0.1, 0.3].
4. THE Predictor SHALL compute `confidence_score` using the deterministic formula: `confidence = normalize(w1 * (1 / (p90 - p10)) + w2 * log(sample_size + 1))` normalised to [0, 1], where `sample_size` is the number of historical training samples for that `(college_code, branch_name, category)` group and `w1`, `w2` are configurable weights.
5. WHEN the model artifacts are not loaded, THE Predictor SHALL return an HTTP 503 response with a descriptive error message.
6. WHEN the input `percentile` is outside [0, 100], THE Predictor SHALL return an HTTP 422 response with a validation error.
7. THE Predictor SHALL derive `admission_band` from `admission_probability`: a value ≥80% SHALL map to "Safe", 50–79% to "Likely", 20–49% to "Moderate", and <20% to "Risky".
8. THE Predictor SHALL derive `confidence_label` from `confidence_score`: a value >0.75 SHALL map to "High confidence", 0.50–0.75 to "Medium confidence", and <0.50 to "Low confidence (estimated)".
9. THE Predictor SHALL include a `top_factors` field in the PredictionResult containing up to 3 human-readable strings explaining the key drivers of the prediction (e.g., "High branch demand", "Low seat availability", "Rising cutoff trend"), derived from the top SHAP feature importances for that prediction.

---

### Requirement 6: FastAPI Service and API Contract

**User Story:** As a backend developer, I want a well-defined REST API from the ML_Service, so that the Node_Backend can integrate predictions without tight coupling to ML internals.

#### Acceptance Criteria

1. THE ML_Service SHALL expose a `POST /api/predict` endpoint accepting a JSON body with fields: `college_code` (string), `branch_name` (string), `category` (string), `cap_round` (string, one of "I", "II", "III"), `student_percentile` (float, 0–100), and optional `exam_type` (string, default `"mhtcet"`).
2. WHEN a valid request is received, THE ML_Service SHALL respond with HTTP 200 and a JSON body containing: `p10`, `p50`, `p90` (floats), `admission_probability` (float, 0–100), `confidence_score` (float, 0–1), `confidence_label` (string), `admission_band` (string), `top_factors` (array of strings), `predicted_year` (integer), and optional `fallback_reason` (string).
3. THE ML_Service SHALL expose a `GET /health` endpoint that returns HTTP 200 with model load status and training metadata when models are loaded, and HTTP 503 when models are not loaded.
4. THE ML_Service SHALL expose a `POST /api/train` endpoint that triggers a full retraining job asynchronously and returns HTTP 202 with a job ID.
5. WHEN a request body fails schema validation, THE ML_Service SHALL return HTTP 422 with a structured error response listing all invalid fields.
6. THE ML_Service SHALL process a single prediction request within 200ms (p95 latency) under normal operating conditions with models loaded in memory.
7. THE ML_Service SHALL be configurable via environment variables for: data directory path, model artifact directory path, service port, and log level.
8. THE ML_Service SHALL expose a `POST /api/predict-batch` endpoint accepting a JSON array of prediction request objects (same schema as `POST /api/predict`) and returning a JSON array of PredictionResult objects in the same order as the input array.

---

### Requirement 7: Node.js Backend Integration

**User Story:** As a backend developer, I want the Node_Backend to call the ML_Service for predictions and fall back gracefully if the ML_Service is unavailable, so that the application remains functional under partial failure.

#### Acceptance Criteria

1. THE Node_Backend SHALL call `POST /api/predict-batch` on the ML_Service, sending all colleges in a recommendation result set in a single HTTP call, to enrich recommendations with ML-predicted cutoff bounds and admission probability.
2. WHEN the ML_Service returns a valid PredictionResult, THE Node_Backend SHALL replace the rule-based `admissionChance` (High/Medium/Low) with the ML-derived `admission_probability` and include `p10`, `p50`, `p90`, `admission_band`, `confidence_label`, and `top_factors` in the API response.
3. WHEN the ML_Service is unreachable or returns a non-200 response, THE Node_Backend SHALL fall back to the existing rule-based `percentileDifference` logic, SHALL include a `ml_unavailable: true` flag in the API response metadata, and SHALL log the reason for fallback (timeout, non-200, or unreachable).
4. THE Node_Backend SHALL enforce a 150ms timeout on ML_Service HTTP calls to prevent recommendation latency degradation.
5. THE Node_Backend SHALL cache ML predictions using a cache key derived from `hash(college_code + branch_name + category + cap_round + model_version)` for a configurable TTL (default 1 hour) to reduce redundant ML_Service calls and to automatically invalidate stale predictions after model retraining.

---

### Requirement 8: Evaluation and Performance Standards

**User Story:** As a data scientist, I want the system to meet defined accuracy thresholds, so that predictions are trustworthy enough to guide student decisions.

#### Acceptance Criteria

1. THE Ensemble SHALL achieve a MAE of less than 1.5 percentile points on the held-out validation fold (most recent year).
2. THE Ensemble SHALL achieve Within_±1_Accuracy greater than 70% on the held-out validation fold.
3. THE Ensemble SHALL achieve Directional_Accuracy greater than 65% on the held-out validation fold.
4. WHEN evaluation metrics are computed, THE Trainer SHALL report them broken down by `category`, `cap_round`, and `branch_name` (top 10 branches by record count) in addition to overall metrics.
5. THE Trainer SHALL produce a calibration report showing the fraction of actual cutoffs falling within the predicted P10–P90 interval; this fraction SHALL be between 0.75 and 0.85 for a well-calibrated model.

---

### Requirement 9: Multi-Exam Extensibility

**User Story:** As a product manager, I want the ML pipeline to be structured so that JEE, NEET, or SSC data can be added later without rewriting the core system, so that the platform can scale to other exams.

#### Acceptance Criteria

1. THE Feature_Engineer SHALL treat `exam_type` as a first-class categorical feature in the feature matrix, encoded consistently across training and inference.
2. THE Data_Loader SHALL accept a configurable `exam_type` parameter when loading data files, tagging all loaded rows with the corresponding `exam_type` value.
3. THE Trainer SHALL support training a single shared model across multiple exam types when data for more than one exam type is present in the data directory.
4. THE ML_Service API contract (Requirement 6) SHALL remain unchanged when additional exam types are added; new exam types SHALL be introduced solely by adding new data files and retraining.

---

### Requirement 10: Observability and Monitoring

**User Story:** As a platform engineer, I want the ML_Service and Node_Backend to emit structured logs and metrics, so that I can monitor prediction quality, latency, and fallback rates in production.

#### Acceptance Criteria

1. THE ML_Service SHALL log every prediction request with: input fields (`college_code`, `branch_name`, `category`, `cap_round`, `student_percentile`), output fields (`p10`, `p50`, `p90`), `latency_ms`, `fallback_reason` (if any), and `model_version`.
2. THE ML_Service SHALL expose a `GET /metrics` endpoint returning: p95 prediction latency, total predictions served, fallback usage percentage broken down by district/state/global level, cold start frequency, and current `model_version`.
3. WHEN the Node_Backend falls back to rule-based logic, THE Node_Backend SHALL log the fallback event including the reason (timeout, non-200 response, or ML_Service unreachable) and the affected `(college_code, branch_name, category, cap_round)` combination.
