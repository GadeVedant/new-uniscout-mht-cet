# UniScout — MHT CET College Predictor

**Live:** [uniscout.co.in](https://www.uniscout.co.in)

An AI-powered college prediction and counselling assistant for Maharashtra engineering admissions (MHT CET). Helps students make smarter decisions during CAP counselling by predicting college eligibility, generating optimized preference lists, and providing round-wise strategy.

---

## Features

- **MHT-CET College Predictor** — personalized college recommendations with AI admission bands (Safe / Likely / Moderate / Risky)
- **Smart Form Filling** — tiered preference list (Safe / Target / Dream picks) with PDF download
- **CAP Round 2 Strategy** — freeze-or-float advice, missed colleges, and Round 3 outlook
- **College Comparison** — side-by-side comparison of up to 3 colleges with AI best-pick
- **College Detail Pages** — cutoff history chart, placement data, fees, seats
- **District Filtering** — select up to 5 districts; uses word-boundary matching (not substring)
- **Category Expansion** — "SC" automatically matches all SC seat types (GSCS, GSCH, GSCO…)
- **Rank → Percentile Converter** — inline converter in the portal form
- **Session Persistence** — results survive page refresh via sessionStorage

---

## Tech Stack

### Frontend
- React 18 + TypeScript, Vite 6
- Tailwind CSS, Framer Motion, Recharts
- Radix UI, Lucide React

### Backend (`backend-mhtcet/`)
- Node.js + Express + TypeScript
- In-memory data store — loads ~93k records from CSV on startup
- LightGBM ML service client with prediction cache

### ML Service (`ml-service/`)
- Python + FastAPI
- LightGBM quantile regression (P10 / P50 / P90)
- SHAP for explainability

---

## Project Structure

```
new-uniscout-mht-cet/
├── src/                          # Frontend (React)
│   ├── App.tsx                   # Root — routing + session state
│   ├── components/               # All UI components
│   │   ├── MhtCetPortal.tsx      # Input form
│   │   ├── ResultsPage.tsx       # Results list, filters, sort, compare
│   │   ├── CollegeCard.tsx       # Individual college card
│   │   ├── CollegeDetailPage.tsx # Full college detail + cutoff chart
│   │   ├── CollegeComparisonPage.tsx
│   │   ├── SmartFormPage.tsx     # Form-filling input
│   │   ├── PreferenceList.tsx    # Tiered preference list output
│   │   ├── StrategyTab.tsx       # Round 2 strategy tab
│   │   └── ui/                   # shadcn/ui primitives
│   ├── services/
│   │   └── api.ts                # All API calls + TypeScript interfaces
│   └── lib/
│       └── scoring.ts            # Shared scoring utilities
├── backend-mhtcet/               # Node.js backend
│   ├── src/
│   │   ├── controllers/          # Route controllers
│   │   ├── services/             # Business logic (recommendation, formFilling, strategy…)
│   │   ├── middleware/           # Validation
│   │   ├── routes/               # API routes
│   │   ├── types/                # Shared TypeScript types
│   │   └── utils/                # categoryMap, scoring, logger
│   └── data/                     # CSV data files (CAP cutoffs 2022–2025, fees, seat matrix)
├── ml-service/                   # Python FastAPI ML service
├── PROJECT.md                    # Architecture + infrastructure notes
├── FRONTEND_GUIDE.md             # Developer onboarding + design system
├── UX_AUDIT.md                   # Bug tracker + UX audit log
└── DEPLOYMENT.md                 # Deployment instructions
```

---

## Getting Started

### Prerequisites
- Node.js 20+
- npm

### Installation

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
cd backend-mhtcet && npm install && cd ..
```

### Running Locally

```bash
# Terminal 1 — backend
cd backend-mhtcet
npm run dev        # starts on http://localhost:3001

# Terminal 2 — frontend
npm run dev        # starts on http://localhost:5173
```

### Production Build

```bash
# Backend
cd backend-mhtcet && npm run build

# Frontend
npm run build
```

---

## Environment Variables

### Frontend (`.env`)
```
VITE_API_URL=http://localhost:3001/api
```

### Backend (`backend-mhtcet/.env`)
```
PORT=3001
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
DATA_DIR=./data
ML_SERVICE_URL=https://uniscout-ml-226x.onrender.com
```

---

## API Endpoints

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

### Recommendation Request Body

```json
{
  "percentile": 95.5,
  "year": "2025-26",
  "capRound": "I",
  "category": "GOPENS",
  "branchPreference": "computer engineering",
  "location": "Pune,Nashik"
}
```

---

## Data Coverage

| Data | Coverage |
|------|----------|
| CAP cutoff data | 2022–23, 2023–24, 2024–25, 2025–26 (all 3 rounds) |
| Colleges | 386 colleges |
| Seat intake | 385/386 colleges (99.7%) |
| Fees data | ~255 colleges (66%) |
| Placement data | ~94 colleges (24%) |
| Branches | 103 unique branches |

---

## Recent Bug Fixes (August 2026)

### District / Location Filtering
- Replaced loose `field.includes(term)` substring match with word-boundary matching across `recommendationService`, `formFillingService`, and the sort step — prevents short district names from over-matching unrelated locations
- Category supplemental (Open-category fallback for reserved categories) now applies the same district filter

### Branch Matching
- Removed the `'artificial intelligence'` catch-all key from `BRANCH_ALIASES` in both `recommendationService` and `formFillingService` — it was causing AI & Data Science requests to return AI & Machine Learning colleges and vice versa

### Cutoff Trends & Round 2 Strategy
- `cutoffTrendService` and all four `strategyService` methods switched from `getAllColleges()` (deduped, single year) to `getAllYearsData()` — trends were always `stable` and Round 2 strategy always returned empty results
- Historical delta computation now includes rising cutoff years for an unbiased average

### Results Page
- Fees sort now strips non-numeric characters before `parseFloat` — `₹1,20,000` was parsing as `NaN`, leaving sort order undefined
- Stats counter: `b3` used `'Medium'` (same as `b2`) when ML was unavailable, double-counting Medium colleges; fixed to use `'Low'`
- PDF blob URL revoked 1 s after `win.print()` instead of immediately — prevented blank print dialogs in Firefox/Safari

### Smart Form Filling
- GOPENS category fallback now flags `categoryFallback: true` in the response so reserved-category users see a warning
- Budget filter guards against fees stored as decimal LPA values
- `formFillingController` now validates `budget` (non-negative) and `priorityMode` (`'college'` | `'branch'`)
- `DollarSign` icon replaced with `IndianRupee` on the budget field
- Empty-result retry now shows an interim "retrying…" banner instead of a silent 6-second wait
- Round I disclosure note added to the form so Round II/III students know the output is Round I optimized

### College Comparison
- `onBack` / `onHome` props were declared but never destructured — parent navigation was broken; fixed and Back button now calls `onBack` with `navigate` fallback
- `computeBestPick([])` called before the empty-state guard; moved after the guard to prevent crashes on empty input

### Strategy Tab
- `AbortController.signal` was created but never passed to the `fetch` call — the 10-second timeout showed a UI error but the HTTP request kept running; fixed by threading `signal` through `api.getRound2Strategy`

### College Card
- `admissionProbability > 0` guard hid legitimate near-zero ML predictions (e.g. 1% rounded to 0%); changed to `!= null`

### Strategy Controller
- Malformed elements in the `colleges` array from request body now filtered before being passed to `computeFreezeOrFloat`, preventing TypeErrors from propagating as 500 errors

---

## License

ISC License — see [LICENSE](LICENSE)
