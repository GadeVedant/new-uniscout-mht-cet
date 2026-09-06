# UniScout — MHT CET College Predictor

**Live:** [uniscout.co.in](https://www.uniscout.co.in)

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

## Infrastructure & Keep-Alive

Render's free tier spins down services after 15 minutes of inactivity. Both the backend and ML service are kept warm via UptimeRobot cron jobs that ping their health endpoints every 5 minutes.

| Service | Render Account | UptimeRobot Account | Health URL |
|---------|---------------|---------------------|------------|
| Backend (Node.js) | kirtane.vedant1@gmail.com | kirtane.vedant1@gmail.com | `https://uniscout-backend.onrender.com/health` |
| ML Service (Python/FastAPI) | gadevedant04@gmail.com | gadevedant04@gmail.com | `https://uniscout-ml-226x.onrender.com/health` |

> **Note:** UptimeRobot sends HEAD requests by default. The ML service `/health` endpoint was updated to accept both GET and HEAD (`@app.api_route("/health", methods=["GET", "HEAD"])`) to prevent 405 errors.

The frontend also has a client-side fallback: `SmartFormPage.tsx` retries failed requests up to 3 times with a 3-second wait between attempts, handling the case where the server wakes up mid-request.

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
- **Python** + **FastAPI** (a Python REST API framework)
- **LightGBM** model (3 quantile regressors: P10, P50, P90)
- **SHAP** for explainability (top factors)
- Trained on 4 years of CAP data
- Deployed on **Render** (Web Service, account: gadevedant04@gmail.com)

---

## Architecture

```
Browser (React)
    │
    ▼
Render Static Site (uniscout.co.in)
    │  REST API calls
    ▼
Render Web Service (api.uniscout.co.in)  [account: kirtane.vedant1@gmail.com]
    │  Node.js + Express
    │  Loads CSV data on startup
    │  ML prediction calls
    ▼
Render Web Service (uniscout-ml-226x.onrender.com)  [account: gadevedant04@gmail.com]
    Python + FastAPI + LightGBM
```

---

## API Endpoints

The entire project uses **REST API** architecture — JSON over HTTP. The main backend uses Express.js, and the ML service uses FastAPI (a Python framework that also builds REST APIs). Both communicate via standard HTTP GET/POST requests.

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Server health + data stats |
| POST | `/api/recommendations` | College predictions |
| GET | `/api/filters` | Available filter options |
| GET | `/api/branches` | All branch names |
| GET | `/api/locations` | All location names |
| GET | `/api/categories` | All category codes |
| GET | `/api/colleges/:code/cutoff-history` | Multi-year cutoff chart data |
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

---

## Test Suite

**Runner:** Vitest (both backend and frontend share the same `vitest` config at the project root)

**Total: 223 tests across 18 files — all passing as of August 2026**

### Backend (`backend-mhtcet/src/tests/`)

| File | What it covers |
|---|---|
| `collegeController.test.ts` | Cutoff history endpoint, filter/branch/location endpoints |
| `cutoffTrendService.test.ts` | Trend direction (rising/falling/stable), Round 2 opportunity flag, property-based threshold tests |
| `formFillingController.test.ts` | Input validation (percentile, category, capRound, branchPreferences, budget, priorityMode) |
| `formFillingService.test.ts` | Tier assignment, district filter, budget filter, ML enrichment, GOPENS fallback |
| `mlPredictionCache.test.ts` | Cache hit/miss, TTL expiry, SHA-256 key generation |
| `mlServiceClient.test.ts` | HTTP batch predict, timeout handling, error propagation |
| `placementLoader.test.ts` | CSV loading, code-based and name-based lookup, missing data handling |
| `recommendationService.test.ts` | ML enrichment pipeline, graceful fallback on ML failure, cache integration |
| `strategyController.test.ts` | Strategy endpoint validation, response shape, malformed colleges array |
| `strategyService.test.ts` | `computeHistoricalAvgDelta`, `computeMissedColleges`, `computeFreezeOrFloat`, `computeRound2Opportunities`, property-based bound tests |

### Frontend (`src/__tests__/`)

| File | What it covers |
|---|---|
| `collegeComparison.test.ts` | `computeBestPick`, `computeBestValueHighlights`, tie handling |
| `CollegeDetailPage.test.tsx` | Detail page rendering, cutoff chart, placement section, back navigation |
| `CopyButton.test.tsx` | Clipboard copy, toast feedback, visibility when empty |
| `enhancedResultsPage.test.ts` | Band filter, sort order, stats bar counts |
| `PreferenceEntryCard.test.tsx` | All required fields rendered, correct band colour class |
| `scoring.test.ts` | `parseAnnualFees`, `parsePackageLPA`, `computeWeightedScore`, `generateEntryReason` |
| `SmartFormPage.test.tsx` | Form validation, district cap, branch cap, submission flow, retry banner |
| `strategyProperties.test.ts` | Property-based tests for FreezeFloatCard and MissedCollegeList |

### Running tests

```bash
# From project root — runs all 18 test files
npm run test -- --run
```

### Test mock note (August 2026)

After switching `cutoffTrendService` and `strategyService` from `getAllColleges()` to `getAllYearsData()`, the `dataService` mocks in `cutoffTrendService.test.ts`, `strategyService.test.ts`, and `recommendationService.test.ts` were updated to expose `getAllYearsData` alongside `getAllColleges`, mirroring the same data so existing test expectations remain valid.

---

Full detail in `UX_AUDIT.md` → *Bug-Fix Session — August 2026*. Summary of changes:

| Area | Fix |
|------|-----|
| District filtering | Word-boundary matching replaces `field.includes(term)` across `recommendationService`, `formFillingService`, and sort step |
| Category supplemental | Open-category fallback for reserved categories now applies the same district filter |
| Branch matching | Removed `'artificial intelligence'` catch-all in `BRANCH_ALIASES` — was cross-matching AiDS ↔ AiML |
| Cutoff trends | `cutoffTrendService` + all `strategyService` methods switched to `getAllYearsData()` — trends were always `'stable'` |
| Round 2 strategy | `computeHistoricalAvgDelta` now includes rising cutoff years for an unbiased average |
| Results fees sort | `parseFloat("₹1,20,000")` returned NaN — now strips non-numeric chars first |
| Results stats | `b3` double-counted Medium colleges when ML unavailable; fixed to use `'Low'` |
| PDF print | Blob URL revoked 1 s after `win.print()` instead of immediately — prevented blank print in Firefox/Safari |
| GOPENS fallback | Reserved-category users now receive `categoryFallback: true` in the response metadata |
| Budget filter | Guards against fee values stored as decimal LPA (e.g. `1.5`) being divided by 100,000 twice |
| Form input validation | `budget` (≥ 0) and `priorityMode` now validated in `formFillingController` |
| SmartFormPage UX | `IndianRupee` icon instead of `DollarSign`; retrying banner; Round I disclosure note |
| CollegeComparisonPage | `onBack`/`onHome` props now correctly destructured and used; `computeBestPick` moved after empty-state guard |
| StrategyTab | `AbortController.signal` threaded through to `fetch` — timeout now actually cancels the request |
| CollegeCard | `admissionProbability != null` check instead of `> 0` — near-zero ML predictions no longer hidden |
| strategyController | Malformed `colleges` array elements filtered before passing to service |
