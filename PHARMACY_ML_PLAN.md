# Pharmacy ML Model — Design & Implementation Plan

This document specs out the plan to train a dedicated LightGBM model for pharmacy
(B Pharmacy / D Pharmacy) cutoff prediction, modelled after the existing engineering
pipeline. It covers how the engineering model works, what is reusable, what needs
to change, and what difficulties to expect.

---

## 1. How the Engineering Model Works (Reference)

### 1.1 Data
- Source files: `cap1/2/3_2022.csv` through `cap1/2/3_2025.csv` (12 files, ~93,000 rows)
- Loaded by `DataLoader` — parses filename for round and year (authoritative), normalises
  college codes, decomposes category codes into 4 sub-fields, joins seat matrix
- Seat matrix: `seat_matrix_2022/2023/2024.csv` + `seatmatrix_2025.csv`

### 1.2 Feature Engineering (`feature_engineer.py`)
All 23 features are computed from the raw data:

| Feature | What it captures |
|---|---|
| `cutoff_t1/t2/t3` | Lag cutoffs (1/2/3 years prior) per college+branch+category+round |
| `cutoff_volatility` | Std deviation of available lags — unstable trends = lower confidence |
| `branch_new` | 1 if no lag history exists (cold start flag) |
| `college_prestige_score` | Avg cutoff across all branches for the college (latest year) |
| `branch_demand_index` | Avg cutoff for the branch across all colleges (latest year) |
| `location_influence` | Avg cutoff by district |
| `is_home_univ/is_other_univ/is_state` | University scope flags from category code |
| `hu_interaction` | Home-university × prestige score (HU cutoffs track prestige more tightly) |
| `global_cutoff_shift` | Year-over-year macro trend (single scalar) |
| `total_seats/seat_density/seat_available_flag` | Seat intake from seat matrix |
| `cutoff_rank_in_college` | Percentile rank of this branch's cutoff within the college |
| `gender_enc/reservation_enc/scope_enc/quota_enc` | Label-encoded category decomposition |
| `round_enc/branch_enc/college_enc` | Label-encoded round, branch, college |

### 1.3 Model Architecture (`trainer.py`)
- **3 LightGBM quantile regressors**: P10 (α=0.10), P50 (α=0.50), P90 (α=0.90)
- **Ridge regressor** as a stability anchor for P50
- **Blend**: `P50_final = 0.70 × LGBM_P50 + 0.30 × Ridge_P50`
- **Training split**: train on 2022–2024, validate on 2025 (time-series, no data leakage)
- **Cold start handler**: separate lookup table for college+branch combinations with no
  lag history — uses category-level or branch-level averages as P50 fallback

### 1.4 Inference (`predictor.py`)
- Loads 6 artifacts: `lgbm_p10.txt`, `lgbm_p50.txt`, `lgbm_p90.txt`,
  `ridge_p50.pkl`, `feature_scaler.pkl`, `feature_columns.json`
- Builds a single-row DataFrame from the request, applies `FeatureEngineer.transform()`
  (uses saved stats — no refitting), runs all 4 models, blends P50
- SHAP explainability: `shap.TreeExplainer(lgbm_p50)` for top-3 feature labels
- Returns: `p10, p50, p90, admission_probability, confidence_score, admission_band, top_factors`

### 1.5 Validation Metrics (Current Engineering Model)
From `model_metadata.json` — trained on 2022–2024, validated on 2025:
- MAE: target < 3.0 percentile points
- Within ±1 accuracy: fraction of predictions within 1 percentile point of actual
- Within ±3 accuracy: fraction within 3 percentile points
- Calibration coverage: fraction where actual falls within [P10, P90] band

---

## 2. Pharmacy Model Plan

### 2.1 Why a Separate Model

The engineering model is trained exclusively on `cap*.csv` files with 103 branches
and 386 colleges. Its feature statistics (prestige map, branch demand index,
label encoders) are specific to that domain. Training pharmacy data alongside
engineering would:
- Confuse the branch demand index (CSE vs B Pharmacy have nothing in common)
- Pollute the college prestige score (pharmacy-only colleges have no engineering data)
- Force label encoders to handle a disjoint set of colleges and branches
- Produce worse predictions for both domains

A separate model trained only on pharmacy data is cleaner and will produce
better-calibrated predictions for pharmacy colleges.

### 2.2 Data Available

| File pattern | Years | Rounds |
|---|---|---|
| `2022BPHARMA_CAP1/2/3_CutOff.csv` | 2022 | I, II, III |
| `2023BPHARMA_CAP1/2/3_CutOff.csv` | 2023 | I, II, III |
| `2024BPHARMA_CAP1/2/3_CutOff.csv` | 2024 | I, II, III |
| `2025BPHARMA_CAP1/2/3_CutOff.csv` | 2025 | I, II, III |
| `2023DPHARMACY_CAP1/2/3.csv` | 2023 | I, II, III |
| `2024DPHARMACY_CAP1/2/3_.csv` | 2024 | I, II, III |
| `2025DPHARMACY_CAP1/2/3.csv` | 2025 | I, II, III |
| `2022/2023/2024/2025SeatMatrix bpharmacy.csv` | 2022–2025 | — |
| `seat_matrix_2024/2025_d_pharmacy.csv` | 2024–2025 | — |

Total: ~3 years of B Pharmacy data, ~3 years of D Pharmacy data.
Estimated row count: 50,000–80,000 rows (much smaller than engineering).

### 2.3 What Can Be Reused

| Component | Reuse? | Notes |
|---|---|---|
| `trainer.py` | ✅ Full reuse | Architecture is domain-agnostic |
| `predictor.py` | ✅ Full reuse | Already a class — instantiate a second `Predictor` |
| `feature_engineer.py` | ✅ Mostly reuse | Same feature logic, separate fit stats |
| `cold_start_handler.py` | ✅ Full reuse | Falls back to branch/category averages |
| `schemas.py` | ✅ Full reuse | Request/response shapes are identical |
| `data_loader.py` | ⚠️ Needs a new loader | Pharmacy filenames don't match `cap[123]_YYYY.csv` |
| `main.py` (FastAPI routes) | ⚠️ Needs new endpoint | `/api/predict-batch/pharmacy` or separate router |
| Model artifacts directory | ⚠️ Separate dir | `models/pharmacy/` alongside `models/` |

### 2.4 What Needs to Be Built

#### 2.4.1 `app/pharmacy_data_loader.py`
A loader that reads pharmacy files using their actual naming patterns:
```python
# Matches: 2022BPHARMA_CAP1_CutOff.csv, 2025DPHARMACY_CAP3.csv, etc.
PHARMACY_FILE_PATTERN = re.compile(
    r"(\d{4})(BPHARMA|DPHARMACY)_CAP([123]).*\.csv",
    re.IGNORECASE
)
```
Extracts year and round from filename (same principle as `DataLoader`).
Normalises column names to match what `FeatureEngineer` expects:
`college_code`, `branch_name`, `category`, `cutoff_percentile`, `round`, `year`, `location`.

Joins pharmacy seat matrix files (`SeatMatrix bpharmacy.csv`,
`seat_matrix_2024_d_pharmacy.csv`, etc.) using the same aggregation logic.

#### 2.4.2 Separate training script: `train_pharmacy.py`
Same structure as `train.py` but uses `PharmacyDataLoader` and saves
artifacts to `models/pharmacy/`:
```python
loader = PharmacyDataLoader()
df = loader.load(data_dir)

fe = FeatureEngineer(scaler_path="./models/pharmacy/feature_scaler.pkl")
df_feat = fe.fit_transform(df)

trainer = Trainer()
result = trainer.train(df_feat, model_dir="./models/pharmacy/")
```

#### 2.4.3 New FastAPI endpoint in `main.py`
```python
pharmacy_predictor = Predictor()
# loaded from models/pharmacy/ at startup

@app.post("/api/predict-batch/pharmacy")
async def pharmacy_predict_batch(body: BatchPredictRequest):
    return {"results": pharmacy_predictor.predict_batch(body.requests)}
```

#### 2.4.4 Backend `pharmacyRecommendationService.ts` — add ML calls
Currently uses raw cutoff filtering. Would need to call
`POST /api/predict-batch/pharmacy` instead of `/api/predict-batch`,
passing `college_code`, `branch_name` (`b pharmacy` / `d pharmacy`),
`category`, `cap_round`, `student_percentile`.

---

## 3. Expected Difficulties

### 3.1 Small Dataset — Overfitting Risk
Engineering has ~93,000 rows across 4 years. Pharmacy has far fewer colleges
and only 2 branches. With fewer rows:
- Lag features (`cutoff_t1/t2/t3`) will be sparse — more cold-start cases
- LightGBM's `min_child_samples=20` may need lowering (try 10 or 5)
- The Ridge blend becomes more important as a regulariser

**Mitigation**: increase `RIDGE_WEIGHT` to 0.40–0.50 for pharmacy,
lower `n_estimators` to 200–300, increase `min_child_samples` guard in
`FeatureEngineer` cold-start detection.

### 3.2 D Pharmacy Has Only 3 Years of Data (2023–2025)
The trainer requires at least 2 years. D Pharmacy has 3, but the lag features
`cutoff_t2` and `cutoff_t3` will be missing for most rows.
`is_cold_start` will fire frequently, pushing more predictions through
the `ColdStartHandler` fallback.

**Mitigation**: the `ColdStartHandler` already handles this gracefully.
Just ensure the pharmacy `ColdStartHandler` is fit on pharmacy data only.

### 3.3 Branch Demand Index Is Less Informative
With only 2 branches (B Pharmacy, D Pharmacy), `branch_demand_index`
collapses to 2 distinct values. The feature still works but carries less
signal than in engineering (103 branches).

**Mitigation**: this is fine — the model will assign it low importance
via LightGBM's feature importance, and the other features carry the signal.

### 3.4 Column Name Differences in Pharmacy CSVs
Pharmacy CSVs may use different column headers than engineering CSVs
(e.g. `Institute Name` instead of `College_Name`, missing `Branch_Code`, etc.).
The `PharmacyDataLoader` must handle this explicitly — do not assume
the same column mapping as `DataLoader._normalise_cutoff()`.

**Mitigation**: inspect each pharmacy CSV schema before writing the loader.
Use the same flexible `get(keys)` pattern already in `pharmacyDataService.ts`.

### 3.5 Seat Matrix Format Differences
Pharmacy seat matrix files (`SeatMatrix bpharmacy.csv`) have a space in the
filename and may have different column structures than engineering seat matrix files.
The loader needs to handle both `seat_matrix_2024_d_pharmacy.csv` (underscore)
and `2025SeatMatrix bpharmacy.csv` (space) naming conventions.

### 3.6 Memory on Free Tier (Render)
Deploying a second `Predictor` instance in the same ML service process
means loading 6 more model artifacts into RAM. LightGBM model files are
small (~1–5MB each), so this is unlikely to be a problem.
The pharmacy model will be smaller than engineering due to less training data.

### 3.7 Validation Data Is Limited
With only 3–4 years, the time-series CV has only 1–2 folds.
The validation metrics will have wider confidence intervals than engineering.
A MAE of 3–5 percentile points is acceptable for pharmacy given the data size;
don't expect engineering-level accuracy (<2.5 MAE) immediately.

---

## 4. Implementation Order

1. **Inspect pharmacy CSV schemas** — run `head` on each file, document column names
2. **Write `pharmacy_data_loader.py`** — load, normalise, join seat matrix
3. **Run `train_pharmacy.py --dry-run`** — verify data loads and feature matrix shapes
4. **Run full training** — save artifacts to `models/pharmacy/`
5. **Add `/api/predict-batch/pharmacy` endpoint** in `main.py`
6. **Update `pharmacyRecommendationService.ts`** — call ML endpoint, attach
   `admissionBand`, `p10/p50/p90`, `confidence_score` to results
7. **Update `MhtCetPharmacyPortal.tsx`** — render ML-enriched fields (same
   components used by engineering results page already support these fields)
8. **Deploy updated ML service** — commit new model artifacts + code, redeploy

---

## 5. Artefacts Layout After Implementation

```
ml-service/
├── models/
│   ├── lgbm_p10.txt              ← engineering model (existing)
│   ├── lgbm_p50.txt
│   ├── lgbm_p90.txt
│   ├── ridge_p50.pkl
│   ├── feature_scaler.pkl
│   ├── feature_columns.json
│   ├── model_metadata.json
│   ├── cold_start_handler.pkl
│   └── pharmacy/                 ← new
│       ├── lgbm_p10.txt
│       ├── lgbm_p50.txt
│       ├── lgbm_p90.txt
│       ├── ridge_p50.pkl
│       ├── feature_scaler.pkl
│       ├── feature_columns.json
│       ├── model_metadata.json
│       └── cold_start_handler.pkl
├── app/
│   ├── data_loader.py            ← engineering (existing)
│   ├── pharmacy_data_loader.py   ← new
│   ├── feature_engineer.py       ← shared (existing)
│   ├── trainer.py                ← shared (existing)
│   ├── predictor.py              ← shared (existing, two instances)
│   └── ...
├── train.py                      ← engineering (existing)
└── train_pharmacy.py             ← new
```
