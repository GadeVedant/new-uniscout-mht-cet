# Design Document: College Detail Page

## Overview

This feature adds a full-screen `CollegeDetailPage` component that replaces the inline card-expand interaction in `ResultsPage`. When a student clicks "View Details" on any `CollegeCard`, the app transitions to a dedicated page showing all available data for that college-branch-category-CAP round combination: ML admission intelligence with a probability bar, a 3-year cutoff history chart, placement stats, college metadata, and a conditional Round 2 strategy advisory.

> **Cross-cutting note**: Uses `resolveAdmissionProbability()` and `generateEntryReason()` from `src/lib/scoring.ts`. All API fields are camelCase. The `GET /api/colleges/:code/cutoff-history` response includes `dataVersion` in metadata. The Chances section shows admission band + probability bar as primary; confidence label and top factors are secondary (below the fold or in a collapsible).

Navigation remains state-based (no React Router). The selected college is passed through `App.tsx` state. A new backend endpoint `GET /api/colleges/:collegeCode/cutoff-history` serves the chart data from the existing in-memory `dataService`.

**Files changed:**
- `src/App.tsx` — add `'college-detail'` view, `selectedCollege` state, `onViewDetails` callback
- `src/components/ResultsPage.tsx` — add "View Details" button to `CollegeCard`, independent of expand toggle
- `src/components/CollegeDetailPage.tsx` — new component (Hero, Chances, CutoffHistory, Placement, CollegeInfo, Round2Strategy sections)
- `src/services/api.ts` — add `getCutoffHistory` function, `CutoffHistoryEntry` interface
- `backend-mhtcet/src/controllers/collegeController.ts` — new controller with `getCutoffHistory` handler
- `backend-mhtcet/src/routes/index.ts` — register `GET /colleges/:collegeCode/cutoff-history`
- `backend-mhtcet/src/types/index.ts` — add `CutoffHistoryEntry` interface

---

## Architecture

```mermaid
sequenceDiagram
    participant Student
    participant ResultsPage
    participant App
    participant CollegeDetailPage
    participant API as api.ts
    participant Backend as Node Backend

    Student->>ResultsPage: clicks "View Details" on CollegeCard
    ResultsPage->>App: onViewDetails(college: CollegeRecommendation)
    App->>App: setSelectedCollege(college); setCurrentView('college-detail')
    App->>CollegeDetailPage: render with { college, colleges, onBack, onHome }

    Note over CollegeDetailPage: Hero/Chances/Placement/Info/Round2 render immediately from props

    CollegeDetailPage->>API: getCutoffHistory(code, branch, category, capRound)
    API->>Backend: GET /api/colleges/:code/cutoff-history?branch=&category=&capRound=
    Backend->>Backend: dataService.getAllColleges() → filter → deduplicate → sort
    Backend-->>API: { success: true, data: CutoffHistoryEntry[] }
    API-->>CollegeDetailPage: CutoffHistoryEntry[]
    CollegeDetailPage->>CollegeDetailPage: render CutoffHistoryChart

    Student->>CollegeDetailPage: clicks "Back to Results"
    CollegeDetailPage->>App: onBack()
    App->>App: setCurrentView('results') [colleges array preserved]
    App->>ResultsPage: render with same colleges array
```

---

## Components and Interfaces

### App.tsx changes

```typescript
// Extended Portal type
export type Portal = 'home' | 'mht-cet' | 'ssc' | 'results' | 'college-detail';

// New state
const [selectedCollege, setSelectedCollege] = useState<CollegeRecommendation | null>(null);

// New callback passed to ResultsPage → CollegeCard
const handleViewDetails = (college: CollegeRecommendation) => {
  setSelectedCollege(college);
  setCurrentView('college-detail');
};

// Back callback passed to CollegeDetailPage
const handleBackToResults = () => {
  setCurrentView('results');
  // colleges array and portalType are NOT cleared
};

// Render branch
{currentView === 'college-detail' && selectedCollege && (
  <CollegeDetailPage
    college={selectedCollege}
    colleges={colleges}
    onBack={handleBackToResults}
    onHome={handleBackToHome}
  />
)}
```

### ResultsPage / CollegeCard changes

`CollegeCard` receives a new `onViewDetails` prop. The "View Details" button uses `e.stopPropagation()` to prevent bubbling to the card's `onClick` (expand toggle).

```typescript
interface CollegeCardProps {
  college: CollegeRecommendation;
  delay: number;
  isExpanded: boolean;
  onToggle: () => void;
  onViewDetails: (college: CollegeRecommendation) => void; // new
}

// Inside CollegeCard render, before the expand hint footer:
<motion.button
  onClick={(e) => { e.stopPropagation(); onViewDetails(college); }}
  className="w-full px-4 py-2 bg-gradient-to-r from-cyan-600/30 to-blue-600/30 border border-cyan-400/30 rounded-xl text-cyan-300 text-sm font-semibold hover:from-cyan-600/50 hover:to-blue-600/50 transition-all"
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
>
  View Details →
</motion.button>
```

### CollegeDetailPage component

```typescript
// src/components/CollegeDetailPage.tsx
interface CollegeDetailPageProps {
  college: CollegeRecommendation;
  colleges: CollegeRecommendation[];
  onBack: () => void;
  onHome: () => void;
}

export function CollegeDetailPage({ college, onBack, onHome }: CollegeDetailPageProps) {
  // cutoff history fetch state
  const [cutoffHistory, setCutoffHistory] = useState<CutoffHistoryEntry[] | null>(null);
  const [cutoffLoading, setCutoffLoading] = useState(true);
  const [cutoffError, setCutoffError] = useState<string | null>(null);

  // fetch on mount with 10s timeout via AbortController
  useEffect(() => { fetchCutoffHistory(); }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-950 via-purple-950 to-slate-950">
      <StickyHeader onBack={onBack} onHome={onHome} collegeName={college.name} />
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        <HeroSection college={college} />
        <ChancesSection college={college} />
        <CutoffHistorySection
          loading={cutoffLoading}
          error={cutoffError}
          data={cutoffHistory}
          onRetry={fetchCutoffHistory}
        />
        <PlacementSection college={college} />
        <CollegeInfoSection college={college} />
        {college.round2Opportunity && <Round2StrategySection college={college} />}
      </main>
    </div>
  );
}
```

### Probability_Bar sub-component

Renders a horizontal bar representing the 0–100 percentile range. The P10–P90 band is a shaded region. The student's `cutoffPercentile` (used as a proxy for their percentile position relative to the cutoff) is marked with a vertical indicator line.

```typescript
interface ProbabilityBarProps {
  p10: number;   // admissionProbabilityP10
  p90: number;   // admissionProbabilityP90
  studentPercentile: number; // college.cutoffPercentile + college.percentileDifference
}

// Layout (all values mapped to 0–100% of bar width):
// |----[shaded P10–P90 region]----[student marker]---|
// 0                                                 100
```

The shaded region left offset = `p10%`, width = `(p90 - p10)%`. The student marker left = `studentPercentile%`.

### CutoffHistorySection

Uses `ChartContainer` + `LineChart` from shadcn/ui chart (which wraps Recharts). The Y-axis domain is `[Math.floor(minCutoff) - 2, Math.ceil(maxCutoff) + 2]`.

```typescript
// Loading state: skeleton div with animate-pulse
// Error state: error message + "Retry" button
// Empty data: "No historical data available for this combination"
// Data present: Recharts LineChart
```

---

## Data Models

### TypeScript interfaces (frontend — api.ts)

```typescript
export interface CutoffHistoryEntry {
  year: number;
  cutoffPercentile: number;
}

export interface CollegeDetailPageProps {
  college: CollegeRecommendation;
  colleges: CollegeRecommendation[];
  onBack: () => void;
  onHome: () => void;
}
```

`CollegeRecommendation` already has all required fields from the `enhanced-results-page` spec (admissionBand, admissionProbabilityP10/P90, confidenceLabel, topFactors, round2Opportunity, round2Delta, avgPackage, highestPackage). No new fields needed.

### Backend — CutoffHistoryEntry (types/index.ts)

```typescript
export interface CutoffHistoryEntry {
  year: number;
  cutoffPercentile: number;
}
```

### Backend — getCutoffHistory controller logic

```typescript
// backend-mhtcet/src/controllers/collegeController.ts
export async function getCutoffHistory(req: Request, res: Response) {
  const { collegeCode } = req.params;
  const { branch, category, capRound } = req.query as Record<string, string>;

  // Validate required query params
  const missing = ['branch', 'category', 'capRound'].filter(p => !req.query[p]);
  if (missing.length > 0) {
    return res.status(400).json({ success: false, error: `Missing required parameters: ${missing.join(', ')}` });
  }

  const all = dataService.getAllColleges();

  // Filter matching records
  const matches = all.filter(c =>
    c.collegeCode === collegeCode &&
    c.branchName.toLowerCase() === branch.toLowerCase() &&
    c.category === category &&
    c.capRound === capRound
  );

  // Deduplicate by year: keep highest cutoffPercentile per year
  const byYear = new Map<number, number>();
  for (const record of matches) {
    const yr = parseInt(record.year);
    if (!isNaN(yr)) {
      const existing = byYear.get(yr) ?? -Infinity;
      if (record.cutoffPercentile > existing) byYear.set(yr, record.cutoffPercentile);
    }
  }

  // Sort ascending by year
  const data: CutoffHistoryEntry[] = [...byYear.entries()]
    .sort(([a], [b]) => a - b)
    .map(([year, cutoffPercentile]) => ({ year, cutoffPercentile }));

  return res.status(200).json({ success: true, data });
}
```

### Route registration

```typescript
// backend-mhtcet/src/routes/index.ts — add:
import { getCutoffHistory } from '../controllers/collegeController.js';
router.get('/colleges/:collegeCode/cutoff-history', getCutoffHistory);
```

### Frontend API function

```typescript
// src/services/api.ts — add:
async getCutoffHistory(
  collegeCode: string,
  branch: string,
  category: string,
  capRound: string,
  signal?: AbortSignal
): Promise<ApiResponse<CutoffHistoryEntry[]>> {
  const params = new URLSearchParams({ branch, category, capRound });
  const response = await fetch(
    `${API_BASE_URL}/colleges/${encodeURIComponent(collegeCode)}/cutoff-history?${params}`,
    { signal }
  );
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}
```

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Hero section renders all identity fields

*For any* `CollegeRecommendation`, the rendered `HeroSection` should contain the college name, college code, branch name, location, and district. When `collegeType` is a non-empty string it should also contain the college type badge; when `collegeType` is absent or empty the badge element should not be present.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6**

### Property 2: "View Details" click does not toggle card expansion

*For any* `CollegeCard` in any expanded/collapsed state, clicking the "View Details" button should not change the card's `isExpanded` state (the `onToggle` callback should not be called).

**Validates: Requirements 1.3**

### Property 3: State preservation on back navigation

*For any* `colleges` array and `RecommendationRequest` stored in `App` state, navigating to `'college-detail'` and then calling `onBack` should result in the `colleges` array being identical (same length, same elements) and `currentView` returning to `'results'`.

**Validates: Requirements 2.2, 2.3, 10.3**

### Property 4: Exclusive rendering — only one view active at a time

*For any* navigation state value, exactly one of `HomePage`, `MhtCetPortal`, `SscPortal`, `ResultsPage`, `CollegeDetailPage` should be present in the rendered output. When state is `'college-detail'`, `ResultsPage` should not be in the DOM.

**Validates: Requirements 1.5, 10.5**

### Property 5: Chances section renders correct fields per ML availability

*For any* `CollegeRecommendation` where `admissionBand` is present, the `ChancesSection` should render the band label, the `ProbabilityBar`, the P10–P90 range label, and up to 3 `topFactors` pills (when non-empty). When `admissionBand` is absent, it should render the legacy `admissionChance` label and a "Basic prediction" indicator, and should not render the `ProbabilityBar` or `topFactors`.

**Validates: Requirements 4.1, 4.2, 4.3, 4.5, 4.6**

### Property 6: Confidence label colour mapping

*For any* `confidenceLabel` value, the rendered element should carry the correct colour class: emerald for `"High confidence"`, amber for `"Medium confidence"`, slate/grey for `"Low confidence (estimated)"`.

**Validates: Requirements 4.4**

### Property 7: Cutoff history endpoint returns data sorted ascending by year

*For any* valid `(collegeCode, branch, category, capRound)` combination present in the in-memory dataset, the `CutoffHistoryEntry[]` returned by `GET /api/colleges/:collegeCode/cutoff-history` should be sorted in strictly ascending order by `year`.

**Validates: Requirements 9.2, 5.2**

### Property 8: Cutoff history deduplication retains max cutoff per year

*For any* dataset containing multiple records with the same `(collegeCode, branch, category, capRound, year)` combination, the endpoint should return exactly one entry per year, and that entry's `cutoffPercentile` should equal the maximum across all matching records for that year.

**Validates: Requirements 9.7**

### Property 9: Missing query parameters return HTTP 400

*For any* request to `GET /api/colleges/:collegeCode/cutoff-history` that omits one or more of `branch`, `category`, or `capRound`, the response status should be 400 and the body should list the missing parameter names.

**Validates: Requirements 9.5**

### Property 10: Chart Y-axis domain includes ±2 padding

*For any* non-empty `CutoffHistoryEntry[]`, the Y-axis domain computed for the chart should be `[floor(min) - 2, ceil(max) + 2]`, ensuring the min and max data points are never at the chart boundary.

**Validates: Requirements 5.7**

### Property 11: Placement section renders only when data is present

*For any* `CollegeRecommendation`, the `PlacementSection` should be present in the DOM if and only if at least one of `avgPackage` or `highestPackage` is non-null. Each non-null package field should render its own stat card; null fields should not render a card.

**Validates: Requirements 6.1, 6.2, 6.3**

### Property 12: College info section displays fallback for missing fields

*For any* `CollegeRecommendation`, the `CollegeInfoSection` should render all five fields (fees, seats, branch, category, capRound). When `fees` is absent/empty or `seats` is zero/absent, the rendered value for that field should be the string `"Not available"`.

**Validates: Requirements 7.1, 7.2, 7.3**

### Property 13: Round 2 section conditional rendering

*For any* `CollegeRecommendation`, the `Round2StrategySection` should be present in the DOM if and only if `round2Opportunity === true`. When present and `round2Delta` is a number, the message should contain the delta value; when `round2Delta` is null/undefined, the message should still render without crashing.

**Validates: Requirements 8.1, 8.2, 8.3, 8.5**

### Property 14: Non-chart sections render immediately from props

*For any* `CollegeDetailPage` render, the Hero, Chances, Placement, CollegeInfo, and Round2Strategy sections should be present in the DOM before the cutoff history fetch resolves (i.e., they depend only on the `college` prop, not on async state).

**Validates: Requirements 12.1, 12.4**

### Property 15: Fetch error shows error state with retry, does not crash page

*For any* network error or non-200 response from the cutoff history endpoint, the `CutoffHistorySection` should display an error message and a retry button, and all other sections of `CollegeDetailPage` should remain rendered and functional.

**Validates: Requirements 5.5, 12.2, 12.5**

---

## Error Handling

| Scenario | Behaviour |
|---|---|
| Cutoff history fetch — network error | `cutoffError` state set; error message + retry button shown in `CutoffHistorySection`; other sections unaffected |
| Cutoff history fetch — non-200 response | Same as network error |
| Cutoff history fetch — 10s timeout | `AbortController.abort()` called; timeout message + retry button shown |
| Cutoff history returns empty array | "No historical data available for this combination" message shown in place of chart |
| `collegeType` absent/empty | Hero section omits the type badge element entirely |
| `round2Delta` null with `round2Opportunity: true` | Round2 section renders message without delta value: "This college's cutoff typically drops in Round 2" |
| `admissionBand` absent (ML fallback) | Chances section renders legacy `admissionChance` label + "Basic prediction" indicator; no ProbabilityBar |
| Both `avgPackage` and `highestPackage` null | `PlacementSection` not rendered |
| Section-level rendering error (unexpected null) | Each section is wrapped in an error boundary; one section failing does not crash the page |
| Missing query params on backend endpoint | HTTP 400 with descriptive message listing missing params |
| `collegeCode` not found in dataset | HTTP 200 with `{ success: true, data: [] }` |

---

## Testing Strategy

### Unit Tests

**collegeController** (`collegeController.test.ts`):
- Valid request with matching data → verify response sorted ascending by year (Property 7)
- Dataset with duplicate years → verify deduplication retains max cutoff (Property 8)
- Request missing `branch` → verify HTTP 400 with "branch" in error message (Property 9)
- Request missing multiple params → verify all missing names listed in error (Property 9)
- `collegeCode` not in dataset → verify HTTP 200 with empty array (edge case Req 9.6)
- No matching branch/category/capRound → verify HTTP 200 with empty array (edge case Req 9.4)

**CollegeDetailPage** (`CollegeDetailPage.test.tsx`):
- Render with full ML `CollegeRecommendation` → verify all hero fields present (Property 1)
- Render with empty `collegeType` → verify no type badge in DOM (Property 1 edge case)
- Render with `admissionBand: 'Safe'` → verify band label, ProbabilityBar, P10/P90 label present (Property 5)
- Render with no `admissionBand` → verify legacy label + "Basic prediction" present, no ProbabilityBar (Property 5)
- Render with `confidenceLabel: 'High confidence'` → verify emerald class (Property 6)
- Render with `avgPackage: '₹6.5 LPA'`, `highestPackage: null` → verify one stat card, no second card (Property 11)
- Render with both packages null → verify PlacementSection absent (Property 11)
- Render with `fees: ''`, `seats: 0` → verify "Not available" for both fields (Property 12)
- Render with `round2Opportunity: true`, `round2Delta: 4.2` → verify section present with delta (Property 13)
- Render with `round2Opportunity: true`, `round2Delta: null` → verify section renders without crashing (Property 13)
- Render with `round2Opportunity: false` → verify section absent (Property 13)
- Mock fetch resolving → verify chart section renders, other sections already present (Property 14)
- Mock fetch rejecting → verify error message + retry button, other sections intact (Property 15)

**CollegeCard** (`CollegeCard.test.tsx`):
- Click "View Details" button → verify `onViewDetails` called, `onToggle` not called (Property 2)

**App** (`App.test.tsx`):
- Navigate to detail then call onBack → verify `colleges` array unchanged, view is 'results' (Property 3)
- When view is 'college-detail' → verify ResultsPage not in DOM (Property 4)

### Property-Based Tests

Use **fast-check** (TypeScript). Minimum 100 iterations per test.

```typescript
// Feature: college-detail-page, Property 1: Hero section renders all identity fields
fc.assert(fc.property(
  arbitraryCollegeRecommendation(),
  (college) => {
    const { getByText, queryByTestId } = render(<HeroSection college={college} />);
    const hasName = !!getByText(college.name);
    const hasCode = !!getByText(college.code);
    const hasBranch = !!getByText(college.branch);
    const typeBadge = queryByTestId('college-type-badge');
    const typeBadgeCorrect = college.collegeType
      ? typeBadge !== null
      : typeBadge === null;
    return hasName && hasCode && hasBranch && typeBadgeCorrect;
  }
), { numRuns: 100 });

// Feature: college-detail-page, Property 7: Cutoff history sorted ascending by year
fc.assert(fc.property(
  fc.array(arbitraryCutoffRecord(), { minLength: 1, maxLength: 50 }),
  async (records) => {
    const result = computeCutoffHistory(records);
    for (let i = 1; i < result.length; i++) {
      if (result[i].year <= result[i - 1].year) return false;
    }
    return true;
  }
), { numRuns: 200 });

// Feature: college-detail-page, Property 8: Deduplication retains max cutoff per year
fc.assert(fc.property(
  fc.array(
    fc.record({ year: fc.integer({ min: 2020, max: 2025 }), cutoffPercentile: fc.float({ min: 50, max: 99 }) }),
    { minLength: 1, maxLength: 30 }
  ),
  (records) => {
    const result = computeCutoffHistory(records);
    for (const entry of result) {
      const maxForYear = Math.max(...records.filter(r => r.year === entry.year).map(r => r.cutoffPercentile));
      if (entry.cutoffPercentile !== maxForYear) return false;
    }
    return true;
  }
), { numRuns: 200 });

// Feature: college-detail-page, Property 10: Chart Y-axis domain includes ±2 padding
fc.assert(fc.property(
  fc.array(fc.record({ year: fc.integer(), cutoffPercentile: fc.float({ min: 0, max: 100 }) }), { minLength: 1 }),
  (entries) => {
    const [domainMin, domainMax] = computeYAxisDomain(entries);
    const minCutoff = Math.min(...entries.map(e => e.cutoffPercentile));
    const maxCutoff = Math.max(...entries.map(e => e.cutoffPercentile));
    return domainMin <= Math.floor(minCutoff) - 2 && domainMax >= Math.ceil(maxCutoff) + 2;
  }
), { numRuns: 100 });

// Feature: college-detail-page, Property 11: Placement section renders only when data present
fc.assert(fc.property(
  fc.record({
    avgPackage: fc.oneof(fc.string(), fc.constant(null)),
    highestPackage: fc.oneof(fc.string(), fc.constant(null)),
  }),
  ({ avgPackage, highestPackage }) => {
    const college = { ...baseCollege, avgPackage, highestPackage };
    const { queryByTestId } = render(<PlacementSection college={college} />);
    const section = queryByTestId('placement-section');
    const shouldRender = avgPackage !== null || highestPackage !== null;
    return shouldRender ? section !== null : section === null;
  }
), { numRuns: 100 });

// Feature: college-detail-page, Property 13: Round 2 section conditional rendering
fc.assert(fc.property(
  fc.record({
    round2Opportunity: fc.boolean(),
    round2Delta: fc.oneof(fc.float({ min: 0, max: 20 }), fc.constant(null)),
  }),
  ({ round2Opportunity, round2Delta }) => {
    const college = { ...baseCollege, round2Opportunity, round2Delta };
    const { queryByTestId } = render(<Round2StrategySection college={college} />);
    const section = queryByTestId('round2-section');
    return round2Opportunity ? section !== null : section === null;
  }
), { numRuns: 100 });
```

**Property test configuration:**
- Library: `fast-check` (already available in the TypeScript ecosystem)
- Each test runs minimum 100 iterations (`numRuns: 100`), deduplication/sort tests run 200
- Each test is tagged with `// Feature: college-detail-page, Property N: <property text>` comment
- Pure logic functions (`computeCutoffHistory`, `computeYAxisDomain`) are extracted from components to enable direct unit + property testing without DOM overhead
