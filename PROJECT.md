# UniScout — MHT CET College Predictor

**Live:** [uniscout.in](https://uniscout.in)

---

## What is UniScout?

UniScout is an AI-powered college prediction and counselling assistant for Maharashtra engineering admissions (MHT CET). It helps students make smarter decisions during the CAP (Centralized Admission Process) by predicting which colleges they are likely to get into, generating optimized preference lists, and providing round-wise strategy.

---

## The Problem It Solves

Every year, over 4 lakh students appear for MHT CET. During CAP counselling, students must fill a preference list of colleges — often 50+ entries — without knowing:
- Which colleges they are realistically eligible for
- What the cutoff was in previous years
- Whether to freeze their current allotment or float to a better college in Round 2
- How fees, placement, and seat availability compare across colleges

UniScout solves all of this in one place.

---

## Core Features

### 1. MHT-CET College Predictor
- Enter your percentile, category, branch preference, and preferred districts
- Get a ranked list of colleges with **admission probability bands**: Safe, Likely, Moderate, Risky
- Results are powered by an ML model trained on 4 years of CAP cutoff data (2022–2025)
- Supports all 11 reservation categories (Open, SC, ST, OBC, SEBC, EWS, NT1/2/3, VJ/DT, TFWS)
- Category expansion: selecting "SC" automatically includes all SC seat types (GSCS, GSCH, GSCO, LSCS, etc.)
- Colleges with no reserved-category data show estimated cutoffs based on the Open category with a category-specific discount

### 2. College Detail Page
- Full details for each college: fees, seat intake, placement data, college type
- **Cutoff History Chart** — 3-year trend (2023, 2024, 2025) with line graph
- **AI Admission Probability** — ML-predicted probability with confidence label
- **Round 2 Strategy** — whether to freeze or float, with expected cutoff drops
- **Similar Colleges** — internal linking to colleges with similar cutoffs

### 3. Smart Form Filling
- Multi-branch selection (up to 5 branches, searchable from 103 branches)
- Multi-district selection (up to 5 districts or All Maharashtra)
- Generates a tiered preference list: **Safe Picks**, **Target Picks**, **Dream Picks**
- Each entry shows: college name, branch, location, cutoff, admission band, fees, seats, avg package
- **Download PDF** — generates a printable preference list
- **Copy List** — copies the list to clipboard for pasting into the DTE portal

### 4. CAP Round 2 Strategy
- Analyzes historical Round 1 → Round 2 cutoff drops
- Shows colleges that were just out of reach in Round 1 but may be accessible in Round 2
- Calculates probability of getting admission in Round 2 for each college
- **Freeze or Float** recommendation with reasoning
- **Round 3 Outlook** — estimated Round 3 cutoffs with probability

### 5. College Comparison
- Compare up to 3 colleges side by side
- Parameters: cutoff, AI probability, fees, seats, avg package, highest package, Round 2 opportunity
- **AI Best Pick** — recommends the best option based on weighted scoring
- Mobile-optimized: stacked cards on phone, table on desktop

---

## Data Coverage

| Data Type | Coverage |
|-----------|----------|
| CAP cutoff data | 2022–23, 2023–24, 2024–25, 2025–26 (all 3 rounds) |
| Colleges | 386 colleges |
| Seat intake | 385/386 colleges (99.7%) |
| Fees data | ~255 colleges (66%) |
| Placement data | ~94 colleges (24%) |
| Branches | 103 unique branches |

---

## Technology Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** for styling
- **Framer Motion** for animations
- **Recharts** for cutoff history charts
- Deployed on **Render** (Static Site)

### Backend
- **Node.js** + **Express.js** + **TypeScript**
- REST API with 8 endpoints
- In-memory data store — loads ~93,000 records on startup
- Deployed on **Render** (Web Service)

### ML Service
- **Python** + **FastAPI**
- **LightGBM** model (3 quantile regressors: P10, P50, P90)
- **SHAP** for explainability (top factors)
- Trained on 4 years of CAP data
- Deployed on **Railway**

---

## Architecture

```
Browser (React)
    │
    ▼
Render Static Site (uniscout.in)
    │  REST API calls
    ▼
Render Web Service (api.uniscout.in)
    │  Node.js + Express
    │  Loads CSV data on startup
    │  ML prediction calls
    ▼
Railway (ML Service)
    Python + FastAPI + LightGBM
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health + data stats |
| POST | `/api/recommendations` | College predictions |
| GET | `/api/filters` | Available filter options |
| GET | `/api/colleges/:code/cutoff-history` | 3-year cutoff chart |
| POST | `/api/strategy/round2` | CAP Round 2 strategy |
| POST | `/api/form-filling/generate` | Smart preference list |

---

## Key Technical Decisions

**Why in-memory data?**
Loading 93k CSV records into RAM (~150MB) on startup gives sub-10ms query times without a database. For a read-heavy, low-write workload this is faster and simpler than PostgreSQL.

**Why LightGBM?**
Gradient boosting handles the non-linear relationship between percentile, college prestige, branch, and admission probability better than linear models. Quantile regression gives P10/P50/P90 bands instead of a single point estimate.

**Why category expansion?**
DTE Maharashtra uses 70+ category codes (GOPENS, GOPENH, GOPENO, GSCS, GSCH...). Students think in terms of "Open" or "SC" — the expansion map translates user intent to all matching data rows automatically.

**Why estimated cutoffs for missing categories?**
Some colleges don't report SC/ST cutoffs to DTE. Rather than hiding these colleges, UniScout estimates the cutoff using the Open cutoff minus a category-specific discount (SC: −15 pts, ST: −20 pts, OBC: −3 pts) based on historical MHT CET hierarchy.

---

## SEO & Discoverability

- Static HTML shell in `index.html` — visible to crawlers before JavaScript loads
- Structured data: `WebSite`, `WebApplication`, `ItemList`, `FAQPage` schemas
- Sitemap with 107 real college URLs + all static pages
- `robots.txt` with proper allow/disallow rules
- Canonical URLs and Open Graph tags on every page

---

## What's Next

- JEE Main college predictor (data ready, UI in progress)
- NEET and CAT predictors
- Push notifications for cutoff updates
- User accounts to save preference lists
- Comparison with previous year's allotment data
