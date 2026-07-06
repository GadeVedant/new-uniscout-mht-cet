# UniScout ML Roadmap

Last updated: 17 June 2026

---

## Core Decision: One Model Per Exam Ecosystem

❌ Do NOT train one giant model for all exams.  
✅ Create a separate prediction engine/model for each admission ecosystem.

Each exam has completely different data distributions, counselling processes, eligibility criteria, cutoff behaviour, and features. A combined model would learn noisy and conflicting patterns.

---

## Exam-wise Plan

### 1. MHT-CET Engineering (Current — Live)
- Algorithm: **LightGBM Quantile Regression (P10/P50/P90)**
- Data: ~93k records, 386 colleges, 4 years of CAP data
- Owner: You
- Status: ✅ Production
- Improvements planned:
  - Better features (seat vacancy data, demand trends)
  - More years of data

### 2. DSYE (Direct Second Year Engineering)
- Algorithm: **CatBoost or LightGBM**
- Owner: You
- Status: 🔲 Not started
- Suggested features: Diploma %, Category, College, Branch, Year, Round
- Reuse much of the MHT-CET engineering pipeline

### 3. MHT-CET PCB (B.Pharmacy)
- Algorithm: **Historical Trend Engine first → LightGBM later**
- Owner: Friend
- Status: 🔲 Not started
- Start simple: estimate cutoff from 3-4 year trend
- Upgrade to LightGBM when accuracy demands it

### 4. JEE Main
- Algorithm: **CatBoost**
- Owner: TBD
- Status: 🔲 Future
- Suggested features: CRL Rank, Category Rank, State, College, Branch, Round

### 5. NEET
- Algorithm: **CatBoost**
- Owner: TBD
- Status: 🔲 Future
- Different counselling logic and rank system

### 6. CLAT / CAT
- Status: 🔲 Future (do not plan yet)
- Will require completely different feature engineering

---

## Algorithm Choice

| Exam | Algorithm | Reason |
|------|-----------|--------|
| Engineering | LightGBM | Existing, proven, fast |
| DSYE | CatBoost or LightGBM | Handles categoricals well |
| Pharmacy | Trend engine → LightGBM | Start simple |
| JEE | CatBoost | Better with high-cardinality categoricals |
| NEET | CatBoost | Same reasoning |

**Note:** Deep Learning is NOT recommended for admission prediction. CatBoost / LightGBM / XGBoost outperform neural networks on tabular admission data.

---

## Team Collaboration Plan

| Person | Responsibility |
|--------|---------------|
| You | DSYE predictor |
| Friend | Pharmacy predictor (MHT-CET PCB) |
| TBD | JEE Main predictor |
| TBD | NEET predictor |

### Git Workflow

All branches are created off `master`. Each exam gets its own isolated branch.

```
# Active branches (already created)
feature/dsye-model       ← You (DSYE predictor)
feature/pharmacy-model   ← Friend (MHT-CET PCB / Pharmacy)
feature/jee-model        ← Future (JEE Main predictor)
feature/neet-model       ← Future (NEET predictor)

# To switch to your branch
git checkout feature/dsye-model

# Friend fetches and checks out their branch
git fetch origin
git checkout feature/pharmacy-model

# Push a branch to remote (first time)
git push -u origin feature/dsye-model
```

- Never commit directly to `master`
- Create Pull Requests for review before merging into `master`
- ✅ Branch Protection enabled on GitHub (Rulesets → master):
  - Require a pull request before merging
  - Restrict deletions
  - Block force pushes
- Future owners (JEE, NEET) should checkout their branch when they begin work — scaffolding is already in place

### .gitignore — Never commit model files
```
*.pkl
*.joblib
*.csv
data/
models/
```

Store generated models on: Render disk / S3 / Google Drive / Hugging Face Storage — **not in Git**.

---

## ML Service Structure (Target)

```
uniscout-ml/
│
├── shared/
│   ├── preprocessing.py
│   ├── metrics.py
│   └── utils.py
│
├── engineering/          ← You (existing, MHT-CET PCM)
│   ├── train.py
│   ├── predict.py
│   └── model/
│
├── dsye/                 ← You (feature/dsye-model)
│   ├── train.py
│   └── predict.py
│
├── pharmacy/             ← Friend (feature/pharmacy-model)
│   ├── train.py
│   └── predict.py
│
├── jee/                  ← Future (feature/jee-model)
│   ├── train.py
│   └── predict.py
│
├── neet/                 ← Future (feature/neet-model)
│   ├── train.py
│   └── predict.py
│
└── router.py             ← Routes requests to the right predictor
```

### Shared Predictor Interface
All models implement the same base class:
```python
class Predictor:
    def predict(self, payload: dict) -> dict:
        pass

class DSYEPredictor(Predictor): ...
class PharmacyPredictor(Predictor): ...
class JEEPredictor(Predictor): ...
class NEETPredictor(Predictor): ...
```

Backend routes based on exam:
```python
predictors = {
    "DSYE": DSYEPredictor(),
    "PHARMACY": PharmacyPredictor(),
    "ENGINEERING": EngineeringPredictor(),
    "JEE": JEEPredictor(),        # future
    "NEET": NEETPredictor(),      # future
}
result = predictors[exam].predict(payload)
```

### Unified Response Contract
All predictors return the same structure:
```json
{
  "college": "...",
  "branch": "...",
  "probability": 0.82,
  "band": "Likely",
  "predicted_cutoff": 92.4
}
```

The frontend never needs to know which model is running underneath.

---

## Project Structure (Target)

```
uniscout/
│
├── frontend/             (React + Vite)
├── backend/              (Node.js + Express)
│   ├── routes/
│   │   ├── engineering.ts
│   │   ├── pharmacy.ts
│   │   ├── dsye.ts
│   │   ├── jee.ts        ← future
│   │   └── neet.ts       ← future
│   └── services/
│       ├── engineeringService.ts
│       ├── pharmacyService.ts
│       ├── dsyeService.ts
│       ├── jeeService.ts        ← future
│       └── neetService.ts       ← future
│
├── ml/
│   ├── engineering/
│   ├── pharmacy/
│   ├── dsye/
│   ├── jee/              ← future
│   ├── neet/             ← future
│   └── shared/
│
├── data/
│   ├── engineering/
│   ├── pharmacy/
│   ├── dsye/
│   ├── jee/              ← future
│   └── neet/             ← future
│
├── scripts/              (move root-level check_*.py files here)
│   ├── check_branch.py
│   ├── check_coverage.py
│   ├── check_csv.py
│   └── debug_parser.py
│
└── docs/
```

---

## Known Technical Debt (Current Repo)

1. **Too many scripts in root** — `check_branch.py`, `check_coverage.py`, `debug_*.py` etc. should move to `scripts/`
2. **Exam features mixed** — all logic is MHT-CET focused; needs exam-level separation as new exams are added
3. **ML service not exam-oriented** — currently one flat structure; restructure as above when DSE/Pharmacy work begins
4. **College data not separated** — single data folder; split by exam type as new data arrives
5. **Backend has no domain separation** — all routes/services in one place; split by exam when scale demands

---

## Priority Order

1. ✅ MHT-CET Engineering (done)
2. 🔲 DSYE (next — you, `feature/dsye-model`)
3. 🔲 MHT-CET Pharmacy (next — friend, `feature/pharmacy-model`)
4. 🔲 JEE Main (future, `feature/jee-model`)
5. 🔲 NEET (future, `feature/neet-model`)
6. 🔲 CLAT/CAT (don't plan yet)
