# Implementation Plan: CAP Round 2 Strategy

## Overview

Add a Round 2 Strategy tab to the ResultsPage, powered by a new `POST /api/strategy/round2` backend endpoint. Implementation proceeds backend-first (types → service → controller → routes) then frontend (types → tab bar → data fetching → components → layout).

## Tasks

- [x] 1. Add backend TypeScript types
  - `Round2StrategyRequest`, `MissedCollege`, `FreezeOrFloatResult`, `Round2Opportunity`, `Round2StrategyResponse` added to `backend-mhtcet/src/types/index.ts`
  - All fields camelCase; `FreezeOrFloatResult.betterOption` optional; `Round2Opportunity.round2Opportunity` literal `true`
  - _Requirements: 7.7_

- [x] 2. Implement StrategyService
  - [x] 2.1 `backend-mhtcet/src/services/strategyService.ts` — `computeHistoricalAvgDelta`: paired R1/R2 rows per year; mean delta; null when < 2 years paired data
    - _Requirements: 9.1, 6.7_
  - [x]* 2.2 Property test for `computeHistoricalAvgDelta` minimum data requirement
  - [x] 2.3 `computeMissedColleges`: R1 cutoff exceeds percentile by (0, 8] AND avgDelta ≥ 3.0; `round2Probability` via sigmoid margin; sort by `expectedDrop` desc; limit 10
    - _Requirements: 3.1, 3.2, 3.6, 9.1_
  - [x]* 2.4 Property test for missed college filter bounds
  - [x]* 2.5 Property test for round2Probability bounds
  - [x] 2.6 `computeFreezeOrFloat`: best R1 option by band rank then probability; Float when missedCollege has round2Probability ≥ 50; reasoning string generated
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7, 9.2, 9.4_
  - [x]* 2.7 Property test for freeze/float logic
  - [x] 2.8 `computeRound2Opportunities`: all colleges for category+branch with avgDelta ≥ 3.0; sort desc; limit 20
    - _Requirements: 5.1, 5.2, 5.7, 9.1_
  - [x]* 2.9 Property test for opportunities list ordering
  - [x]* 2.10 Unit tests for StrategyService

- [x] 3. Implement StrategyController
  - [x] 3.1 `backend-mhtcet/src/controllers/strategyController.ts` — validates percentile [0,100] → 422; validates category+branch present → 400; absent colleges → []; delegates to StrategyService; returns 200 with data + metadata.dataVersion; catches errors → 500
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.8, 9.5_
  - [x]* 3.2 Unit tests for StrategyController

- [x] 4. Register strategy route
  - [x] 4.1 `POST /strategy/round2` registered in `backend-mhtcet/src/routes/index.ts` wired to `strategyController`
  - [x] 4.2 Route active under `/api/strategy/round2`
  - _Requirements: 6.1_

- [x] 5. Checkpoint — backend complete

- [x] 6. Add frontend TypeScript types and API method
  - [x] 6.1 `Round2StrategyRequest`, `MissedCollege`, `FreezeOrFloatResult`, `Round2Opportunity`, `Round2StrategyResponse` in `src/services/api.ts`; all fields match backend; `betterOption` optional
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5_
  - [x] 6.2 `api.getRound2Strategy(request)` calls `POST /api/strategy/round2`
    - _Requirements: 7.6_

- [x] 7. Add Tab_Bar to ResultsPage
  - [x] 7.1 Tab bar rendered only when `capRound === 'I'` and `lastQuery` present; "Results" and "Round 2 Strategy" tabs; active tab highlighted with cyan
    - _Requirements: 1.1, 1.2, 1.5, 1.6_
  - [x] 7.2 Results tab shows college grid + stats + filters; Strategy tab shows `StrategyTab` component
    - _Requirements: 1.3, 1.4_
  - [x]* 7.3 Property test for tab visibility

- [x] 8. Implement strategy data fetching in StrategyTab
  - [x] 8.1 Lazy fetch on first activation via `hasFetched` ref; `AbortController` with 10s timeout; separate timeout/error/loading states; retry button on all failure states; result cached in component state
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [x]* 8.2 Property test for fetch caching

- [x] 9. Implement FreezeFloatCard component
  - `src/components/FreezeFloatCard.tsx` — Freeze (emerald) / Float (cyan) badge with icon; `reasoning` string; `betterOption` summary with expected R2 cutoff and probability when Float; Framer Motion entrance; `aria-label` on container and badge
  - _Requirements: 4.8, 4.9, 8.4, 8.5, 8.6_

- [x] 10. Implement MissedCollegeList component
  - `src/components/MissedCollegeList.tsx` — up to 10 cards; college name, branch, R1 cutoff, exp R2 cutoff, drop "↓ X pts"; "Good chance in Round 2" badge at ≥50%; "Within your range" cross-badge; empty state message
  - _Requirements: 3.3, 3.4, 3.5, 3.7, 3.8, 5.6_

- [x] 11. Implement Round2OpportunitiesList component
  - `src/components/Round2OpportunitiesList.tsx` — up to 20 entries sorted by `expectedDrop` desc; college name, branch, R1 cutoff, exp R2 cutoff, drop; "Within your range" cross-badge; empty state message
  - _Requirements: 5.3, 5.4, 5.5, 5.6_

- [x] 12. Implement StrategyTab layout
  - `src/components/StrategyTab.tsx` — FreezeFloatCard → two-column grid (MissedCollegeList + Round2OpportunitiesList) on desktop, single column on mobile; staggered Framer Motion animations; `dataVersion` footer; loading skeleton (3 sections); error+retry; timeout+retry
  - _Requirements: 8.1, 8.2, 8.3, 8.5, 8.6_

- [x] 13. Checkpoint — frontend complete

- [x] 14. Property-based and unit tests — all optional (`*`)
  - [x] 14.1 Remaining fast-check property tests in `src/__tests__/strategyProperties.test.ts`
  - [x] 14.2 Unit tests for StrategyTab component

## Notes

- Tasks marked with `*` are optional
- Property tests use **fast-check** (TypeScript), minimum 100 iterations each
- `resolveAdmissionProbability()` imported from `backend-mhtcet/src/utils/scoring.ts`; never redefine locally
- All API response fields use camelCase; `dataVersion` included in metadata
- Tab_Bar and Strategy_Tab only rendered when `capRound === 'I'`
