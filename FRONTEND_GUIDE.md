# UniScout MHT-CET — Frontend Guide

> Consolidated reference covering: developer onboarding, design system, and feature status across all specs.

---

## 1. Developer Onboarding

### Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 18 + TypeScript |
| Build tool | Vite 6 |
| Styling | Tailwind CSS |
| Animation | Framer Motion (`motion` package) |
| Charts | Recharts (via shadcn/ui `ChartContainer`) |
| UI primitives | Radix UI (full suite) |
| Icons | Lucide React |
| Forms | React Hook Form |
| Notifications | Sonner |

### Project Structure

```
src/
├── App.tsx                  # Root — navigation state machine
├── services/
│   └── api.ts               # All API calls + TypeScript interfaces
├── lib/
│   └── scoring.ts           # Shared scoring utilities (weighted score, entry reason, etc.)
├── components/
│   ├── HomePage.tsx          # Entry point — portal selection
│   ├── MhtCetPortal.tsx      # MHT-CET input form
│   ├── SscPortal.tsx         # SSC input form (coming soon)
│   ├── ResultsPage.tsx       # College cards list + stats bar + filters
│   ├── CollegeDetailPage.tsx # Full detail view for a single college
│   ├── ComingSoon.tsx        # Placeholder for unbuilt portals
│   ├── ui/                   # shadcn/ui primitives (Button, Card, etc.)
│   └── figma/                # Figma-exported assets
└── styles/
    └── index.css
```

### Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Build for production
npm run build
```

The frontend expects the Node.js backend running at `http://localhost:3001` (or whatever `VITE_API_URL` is set to in `.env`).

### Navigation Model

The app uses **state-based routing** — no React Router. `App.tsx` owns a `currentView` state of type `Portal`:

```ts
type Portal = 'home' | 'mht-cet' | 'ssc' | 'results' | 'college-detail'
// Planned additions (not yet wired):
// | 'college-comparison' | 'smart-form'
```

Navigation flow:
```
home → mht-cet → results → college-detail → results (back)
home → ssc → (coming soon)
```

Key state variables in `App.tsx`:

| State | Type | Purpose |
|---|---|---|
| `currentView` | `Portal` | Which page is rendered |
| `colleges` | `CollegeRecommendation[]` | Results from last API call — preserved on back nav |
| `selectedCollege` | `CollegeRecommendation \| null` | College being viewed in detail page |
| `portalType` | `'mht-cet' \| 'ssc'` | Which portal was used |
| `isLoading` | `boolean` | API call in progress |
| `error` | `string \| null` | API error message |

---

## 2. Design System

### Background

All pages share a dark gradient background defined in `App.tsx`:

```
bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950
```

Two animated blur orbs are rendered as absolute-positioned decorative elements.

### Glassmorphism Cards

The standard card pattern used throughout:

```
bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl
```

For more prominent cards:
```
bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl
```

### Colour Palette

#### Admission Band Colours

| Band | Background | Text | Border |
|---|---|---|---|
| Safe | `bg-emerald-500/20` | `text-emerald-400` | `border-emerald-500/30` |
| Likely | `bg-blue-500/20` | `text-blue-400` | `border-blue-500/30` |
| Moderate | `bg-amber-500/20` | `text-amber-400` | `border-amber-500/30` |
| Risky | `bg-red-500/20` | `text-red-400` | `border-red-500/30` |

#### Cutoff Trend Colours

| Trend | Colour | Meaning |
|---|---|---|
| Rising ↑ | `text-red-400` | Harder to get in |
| Falling ↓ | `text-emerald-400` | Easier to get in |
| Stable → | `text-slate-400` | No significant change |

#### Confidence Label Colours

| Label | Colour |
|---|---|
| High confidence | `text-emerald-400` |
| Medium confidence | `text-amber-400` |
| Low confidence (estimated) | `text-slate-400` (muted/italic) |

#### Round 2 Badge

```
bg-teal-500/20 text-teal-400 border-teal-500/30
```

#### Freeze / Float Badge

| Advice | Colour |
|---|---|
| Freeze | Emerald/green |
| Float | Blue/cyan |

### Typography

- Page headings: `text-2xl font-bold text-white`
- Section headings: `text-lg font-semibold text-white`
- Body text: `text-slate-300`
- Muted/secondary: `text-slate-400`
- Labels: `text-xs text-slate-500 uppercase tracking-wide`

### Buttons

Primary action:
```
bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500
text-white font-semibold rounded-lg px-4 py-2
```

Secondary/ghost:
```
border border-white/20 text-slate-300 hover:bg-white/10 rounded-lg px-4 py-2
```

View Details button (on CollegeCard):
```
border border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 rounded-lg
```

### Animations

All entrance animations use Framer Motion. Standard pattern:

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, delay: index * 0.05 }}
>
```

Staggered list items use `delay: index * 0.05`.

Hover scale on interactive cards:
```tsx
whileHover={{ scale: 1.02 }}
whileTap={{ scale: 0.98 }}
```

### Responsive Breakpoints

- Mobile: single column (`grid-cols-1`)
- Tablet/Desktop: multi-column (`md:grid-cols-2`, `lg:grid-cols-3`)
- Sticky headers use `sticky top-0 z-10 backdrop-blur-md`
- Floating bars use `fixed bottom-0 left-0 right-0 z-50`

---

## 3. Feature Status

### Spec 1: Enhanced Results Page

**Status: Not started**

| Task | Status | Description |
|---|---|---|
| Shared scoring module (`src/lib/scoring.ts`) | ⬜ Pending | `resolveAdmissionProbability`, `computeWeightedScore`, `generateEntryReason` |
| Backend types update | ⬜ Pending | Add ML fields to `CollegeRecommendation` |
| Frontend types update | ⬜ Pending | Mirror backend ML fields in `api.ts` |
| PlacementLoader service | ⬜ Pending | Load `placements.csv`, join to recommendations |
| CutoffTrendService | ⬜ Pending | Compute `cutoffTrend`, `round2Opportunity`, `round2Delta` |
| Backend controller update | ⬜ Pending | Pass through ML fields, add placement + trend data |
| Extract `CollegeCard` component | ⬜ Pending | Move out of `ResultsPage.tsx` into own file |
| ML admission band badge | ⬜ Pending | Replace High/Medium/Low with Safe/Likely/Moderate/Risky |
| Cutoff trend indicator | ⬜ Pending | ↑/↓/→ adjacent to cutoff percentile |
| Placement data on card | ⬜ Pending | `avgPackage` on collapsed, `highestPackage` on expanded |
| Round 2 badge | ⬜ Pending | Teal badge on collapsed card face |
| Confidence label + top factors | ⬜ Pending | Expanded state only |
| Stats bar update | ⬜ Pending | Safe/Likely/Moderate/Risky counts |
| Filter + sort update | ⬜ Pending | Band-aware filter options and sort order |

---

### Spec 2: MHT-CET Cutoff Prediction (ML Service)

**Status: Complete (ML pipeline)**

| Task | Status | Description |
|---|---|---|
| ML service scaffold | ✅ Done | FastAPI app, schemas, metrics |
| DataLoader | ✅ Done | CSV loading, round/year from filename, category decomposition, seat matrix join |
| Feature Engineer | ✅ Done | 24 features: lags, volatility, prestige, demand, location, seat features, encoded categoricals |
| Trainer | ✅ Done | LightGBM + Ridge blend, 2024 validation, 2025 secondary check, category bias saved |
| Cold Start Handler | ✅ Done | District → state → global fallback |
| Predictor | ✅ Done | Inference, sigmoid admission probability, confidence score, SHAP top factors |
| FastAPI routes | ✅ Done | `/api/predict`, `/api/predict-batch`, `/api/train`, `/health`, `/metrics` |
| Node.js MLServiceClient | ✅ Done | 150ms timeout, batch call, `X-Request-ID` |
| Node.js prediction cache | ✅ Done | SHA256 cache key, TTL, warm cache |
| Node.js recommendation service update | ✅ Done | ML enrichment + graceful fallback |

**Current model metrics (version 20260407_100636):**
- Validation year: 2024 | Training: 2022–2023
- MAE: 4.16 percentile points
- Within ±1: 28.1% | Within ±3: 60.7%
- Directional accuracy: 87.2%
- 2025 R1 simulation: MAE 6.09, Within ±3: 51.9%

---

### Spec 3: College Detail Page

**Status: Partially built**

| Task | Status | Description |
|---|---|---|
| Backend cutoff history endpoint | ✅ Done | `GET /api/colleges/:collegeCode/cutoff-history` |
| Frontend API types + method | ✅ Done | `CutoffHistoryEntry`, `getCutoffHistory()` in `api.ts` |
| App.tsx navigation wiring | ✅ Done | `college-detail` view, `handleViewDetails`, `handleBackToResults` |
| "View Details" button on CollegeCard | ✅ Done | Cyan border button, `stopPropagation` |
| CollegeDetailPage scaffold | ✅ Done | Sticky header, 6 section slots, cutoff fetch with 10s timeout |
| Hero section | ✅ Done | College name, type badge, location, code, branch |
| Chances section | ✅ Done | Admission band, ProbabilityBar, P10/P90, confidence, top factors |
| Cutoff History section | ✅ Done | Line chart (Recharts), loading/error/empty states |
| Placement section | ✅ Done | Conditional render, avg/highest package stat cards |
| College Info section | ✅ Done | Fees, seats, branch, category, CAP round grid |
| Round 2 Strategy section | ⬜ Pending | Conditional on `round2Opportunity`, teal accent |
| Tests (property + unit) | ⬜ Pending | All test tasks across sections 4–13 |

---

### Spec 4: CAP Round 2 Strategy

**Status: Not started**

| Task | Status | Description |
|---|---|---|
| Backend types | ⬜ Pending | `Round2StrategyRequest`, `MissedCollege`, `FreezeOrFloatResult`, etc. |
| StrategyService | ⬜ Pending | `computeHistoricalAvgDelta`, `computeMissedColleges`, `computeFreezeOrFloat`, `computeRound2Opportunities` |
| StrategyController | ⬜ Pending | `POST /api/strategy/round2` |
| Frontend types + API method | ⬜ Pending | Mirror backend types in `api.ts`, `getRound2Strategy()` |
| Tab bar on ResultsPage | ⬜ Pending | "Results" / "Round 2 Strategy" tabs, visible only when `capRound === 'I'` |
| Strategy data fetching | ⬜ Pending | Lazy fetch on first tab activation, 10s timeout, cache |
| FreezeFloatCard component | ⬜ Pending | Large Freeze/Float badge, reasoning, better option summary |
| MissedCollegeList component | ⬜ Pending | Up to 10 cards, "Good chance" indicator, "Within your range" badge |
| Round2OpportunitiesList component | ⬜ Pending | Up to 20 entries sorted by expected drop |
| StrategyTab layout | ⬜ Pending | Staggered animations, responsive grid |
| Tests | ⬜ Pending | All property + unit tests |

---

### Spec 5: College Comparison

**Status: Not started**

| Task | Status | Description |
|---|---|---|
| App.tsx navigation (`college-comparison` view) | ⬜ Pending | `comparisonSelection` state, toggle/open/back/home handlers |
| FloatingCompareBar component | ⬜ Pending | Fixed bottom bar, "Compare (N)", enabled at 2+, Clear button |
| Compare checkbox on CollegeCard | ⬜ Pending | `CheckSquare`/`Square` icon, `stopPropagation`, disabled at capacity |
| Comparison toast | ⬜ Pending | "You can compare up to 3 colleges at a time." — 3s auto-dismiss |
| CollegeComparisonPage scaffold | ⬜ Pending | Sticky header, fallback when < 2 selected |
| ComparisonTable component | ⬜ Pending | CSS Grid, sticky label column, sticky header row, 12 metric rows |
| Best-value cell highlighting | ⬜ Pending | `ring-2 ring-cyan-400/60` on best cell per quantitative row |
| BestPickCard component | ⬜ Pending | Weighted score winner, tie handling, no raw score shown |
| `src/lib/scoring.ts` utilities | ⬜ Pending | `parseAnnualFees`, `parsePackageLPA`, `computeWeightedScores`, `computeBestPick`, `computeBestValueHighlights` |
| Tests | ⬜ Pending | All 20 property tests + unit tests |

---

### Spec 6: Smart Form Filling

**Status: Not started**

| Task | Status | Description |
|---|---|---|
| Backend types | ⬜ Pending | `FormFillingRequest`, `PreferenceEntry`, `FormFillingResponse` |
| FormFillingService | ⬜ Pending | Filter candidates, budget filter, ML batch call, tier assignment, weighted score, entry reason, priority mode sort |
| FormFillingController | ⬜ Pending | `POST /api/form-filling/generate` |
| Frontend types + API method | ⬜ Pending | Mirror backend types, `generateFormFillingList()` |
| App.tsx navigation (`smart-form` view) | ⬜ Pending | "Generate Form Filling List" button on HomePage |
| SmartFormPage component | ⬜ Pending | Full input form with validation, progress indicator, loading/error states |
| PreferenceList component | ⬜ Pending | Safe/Target/Dream tier sections, summary bar, banners |
| PreferenceEntryCard component | ⬜ Pending | Rank, name, branch, entry reason, band, probability, fees |
| CopyButton component | ⬜ Pending | Plain-text clipboard copy with tier headers |
| Disabled PDF button | ⬜ Pending | "Coming soon" label, always visible |
| Tests | ⬜ Pending | All property + unit tests |

---

## 4. API Reference

All API calls go through `src/services/api.ts`. Base URL: `import.meta.env.VITE_API_URL` (default `http://localhost:3001`).

### Existing endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/recommendations` | Get college recommendations |
| `GET` | `/api/colleges/:code/cutoff-history` | Cutoff history for detail page chart |

### Planned endpoints

| Method | Path | Spec |
|---|---|---|
| `POST` | `/api/strategy/round2` | CAP Round 2 Strategy |
| `POST` | `/api/form-filling/generate` | Smart Form Filling |

### Key TypeScript interfaces (current)

```ts
// CollegeRecommendation — core data object
interface CollegeRecommendation {
  collegeCode: string;
  collegeName: string;
  branchName: string;
  category: string;
  capRound: string;
  cutoffPercentile: number;
  admissionChance: 'High' | 'Medium' | 'Low';
  fees: string;
  seats: number;
  location: string;
  district: string;
  collegeType: string;
  // ML fields (added by enhanced-results-page spec — pending)
  admissionBand?: 'Safe' | 'Likely' | 'Moderate' | 'Risky';
  admissionProbabilityP10?: number;
  admissionProbabilityP90?: number;
  confidenceLabel?: string;
  topFactors?: string[];
  cutoffTrend?: 'rising' | 'falling' | 'stable';
  round2Opportunity?: boolean;
  round2Delta?: number | null;
  avgPackage?: string | null;
  highestPackage?: string | null;
}
```

---

## 5. What to Build Next (Priority Order)

1. **Enhanced Results Page** — highest user impact; unlocks ML band display, placement data, trend indicators, and Round 2 badges across all college cards. Requires `src/lib/scoring.ts` first.

2. **Round 2 Strategy section** in CollegeDetailPage — single component, low effort, completes the detail page spec.

3. **CAP Round 2 Strategy tab** — backend service + frontend tab; high value for Round 1 students.

4. **College Comparison** — medium complexity; depends on `src/lib/scoring.ts` being complete.

5. **Smart Form Filling** — most complex; depends on ML service being live and all scoring utilities ready.
