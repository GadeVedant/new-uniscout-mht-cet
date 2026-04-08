# Implementation Plan: Enhanced Results Page

## Overview

Enrich the `/api/recommendations` response and `ResultsPage.tsx` UI with ML-powered admission intelligence, placement data, cutoff trend indicators, prediction explainability, and a Round 2 opportunity badge. Implementation proceeds backend-first (shared utilities → types → services → controller) then frontend (component extraction → ML display → stats/filter/sort).

## Tasks

- [x] 1. Create shared scoring module
  - Create `src/lib/scoring.ts` with `resolveAdmissionProbability()`, `generateEntryReason()`, `computeWeightedScore()`, `DEFAULT_WEIGHTS`, `PRESTIGE_SCORES`, `parseAnnualFees()`, `parsePackageLPA()`
  - This module is the foundation imported by all other features; never redefine these utilities locally
  - _Requirements: 9.1, 9.5, 11.1_

- [x] 2. Update backend TypeScript types
  - [x] 2.1 Extend `CollegeRecommendation` in `backend-mhtcet/src/types/index.ts` with optional fields: `admissionBand`, `admissionProbabilityP10`, `admissionProbabilityP90`, `confidenceLabel`, `topFactors`, `cutoffTrend`, `round2Opportunity`, `round2Delta`, `avgPackage`, `highestPackage`
    - All new fields must use `?` so existing code paths remain valid
    - _Requirements: 9.2, 9.5_
  - [x] 2.2 Extend `ApiResponse` metadata in `backend-mhtcet/src/types/index.ts` with optional `ml_unavailable: boolean`
    - Add `DATA_VERSION` env var reference in a comment or constant
    - _Requirements: 9.4, 11.2_

- [x] 3. Update frontend TypeScript types
  - [x] 3.1 Extend `CollegeRecommendation` in `src/services/api.ts` with the same optional fields as task 2.1
    - _Requirements: 9.1, 9.5_
  - [x] 3.2 Extend `ApiResponse` metadata in `src/services/api.ts` with optional `ml_unavailable: boolean`
    - _Requirements: 9.3_

- [x] 4. Implement PlacementLoader service
  - [x] 4.1 Create `backend-mhtcet/src/services/placementLoader.ts`
    - Define `PlacementRecord` interface with `collegeCode`, `collegeName`, `avgPackage`, `highestPackage`
    - Implement `PlacementLoader` class with `private byCode` and `private byName` maps
    - Implement `load(filePath: string): Promise<void>` — reads CSV, builds both maps; logs warning and returns empty maps if file not found (do not throw)
    - Skip rows with non-numeric `avg_package` / `highest_package` and log warning with row index and value
    - Format plain numeric values as `"₹{value} LPA"`; use pre-formatted values as-is after trim
    - Implement `getPlacement(collegeCode, collegeName)` — code lookup first, normalised name fallback, returns `{ avgPackage: null, highestPackage: null }` when no match
    - Export singleton `placementLoader`
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 10.1, 10.2, 10.3, 10.4, 10.6_
  - [x]* 4.2 Write property test for PlacementLoader round-trip join correctness
    - **Property 7: Placement CSV round-trip join correctness**
    - **Validates: Requirements 3.1, 3.2, 3.3, 3.4, 10.1**
  - [x]* 4.3 Write property test for package value formatting
    - **Property 8: Package value formatting**
    - **Validates: Requirements 10.6**
  - [x] 4.4 Write unit tests for PlacementLoader
    - Valid CSV → correct formatted values returned
    - Missing `college_code` rows → name-based fallback works
    - Non-numeric package values → rows skipped, no exception
    - Non-existent file path → no exception, empty map
    - _Requirements: 3.1, 3.2, 10.2, 10.3_
  - [x]* 4.5 Write property test for invalid CSV rows skipped
    - **Property 20: Invalid CSV rows are skipped**
    - **Validates: Requirements 10.3**

- [x] 5. Implement CutoffTrendService
  - [x] 5.1 Create `backend-mhtcet/src/services/cutoffTrendService.ts`
    - Define `TrendDirection` type and `TrendResult` interface
    - Implement `CutoffTrendService` class with `getTrend(collegeCode, branchName, category, capRound): TrendResult`
    - Trend logic: filter `dataService.getAllColleges()` for matching combination, sort by year desc, compare latest vs 2-years-prior; delta > 1.0 → "rising", < -1.0 → "falling", else "stable"; fewer than 2 distinct years → "stable"
    - Round 2 logic: find paired Round I / Round II rows for same `(collegeCode, branchName, category)` per year; avg `cap_round_delta = roundI_cutoff - roundII_cutoff`; avg ≥ 3.0 → `round2Opportunity: true`; no paired data → `false`, `round2Delta: null`
    - Export singleton `cutoffTrendService`
    - _Requirements: 2.2, 2.3, 6.2, 6.3_
  - [x]* 5.2 Write property test for trend computation threshold
    - **Property 6: Trend computation threshold**
    - **Validates: Requirements 2.2, 2.3**
  - [x]* 5.3 Write property test for Round 2 threshold computation
    - **Property 13: Round 2 threshold computation**
    - **Validates: Requirements 6.2, 6.3**
  - [x]* 5.4 Write unit tests for CutoffTrendService
    - 3 years data, delta > 1.0 → "rising"
    - 3 years data, delta < -1.0 → "falling"
    - 3 years data, delta within ±1.0 → "stable"
    - 1 year only → "stable"
    - Paired Round I/II avg delta ≥ 3.0 → `round2Opportunity: true`
    - Paired Round I/II avg delta < 3.0 → `round2Opportunity: false`
    - _Requirements: 2.2, 2.3, 6.2, 6.3_

- [x] 6. Update backend recommendation controller
  - [x] 6.1 Integrate `placementLoader` and `cutoffTrendService` into `backend-mhtcet/src/services/recommendationService.ts`
    - Call `placementLoader.getPlacement(rec.code, rec.name)` for each recommendation and merge `avgPackage`, `highestPackage`
    - Call `cutoffTrendService.getTrend(rec.code, rec.branch, rec.category, rec.capRound)` and merge `cutoffTrend`, `round2Opportunity`, `round2Delta`
    - Pass through ML fields: `admissionBand`, `admissionProbabilityP10`, `admissionProbabilityP90`, `confidenceLabel`, `topFactors`
    - Map `admissionBand` → `admissionChance` for backward compat: Safe/Likely → "High", Moderate → "Medium", Risky → "Low"
    - _Requirements: 3.3, 3.4, 6.2, 6.3, 10.5, 11.1, 11.2, 11.3, 11.4_
  - [x] 6.2 Initialise `placementLoader` in `backend-mhtcet/src/server.ts` before `app.listen`
    - Call `await placementLoader.load(process.env.PLACEMENT_DATA_PATH ?? './data/placements.csv')`
    - _Requirements: 10.1, 10.2_
  - [x]* 6.3 Write unit tests for admissionChance backward-compatibility mapping
    - **Property 18: admissionChance backward-compatibility mapping**
    - **Property 19: Raw ML fields not exposed in response**
    - **Validates: Requirements 11.3, 11.4**

- [x] 7. Checkpoint — backend complete

- [x] 8. Extract CollegeCard component
  - [x] 8.1 Extract `CollegeCard` from `src/components/ResultsPage.tsx` into `src/components/CollegeCard.tsx`
    - _Requirements: 1.1, 1.3, 1.5_

- [x] 9. Update CollegeCard with ML fields
  - [x] 9.1 Add admission band badge and probability range to `CollegeCard`
    - ML band badge with BAND_CONFIG colour palette; probability range `"{p10}–{p90}% chance"`; fallback to legacy label + "Basic prediction" when ML unavailable
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 12.1, 12.2_
  - [x] 9.2 Add cutoff trend indicator to `CollegeCard`
    - ↑ red / ↓ emerald / → slate; shown even in fallback mode
    - _Requirements: 2.1, 2.4, 2.5, 12.3_
  - [x] 9.3 Add placement data to `CollegeCard`
    - `avgPackage` chip on collapsed face; `highestPackage` in expanded view; omit when both null
    - _Requirements: 3.5, 3.6, 3.7_
  - [x] 9.4 Add Round 2 badge to `CollegeCard`
    - Teal "Round 2 Opp" badge on collapsed face when `round2Opportunity: true`
    - _Requirements: 6.1, 6.4, 6.5_
  - [x] 9.5 Add confidence label and top factors to expanded `CollegeCard` state
    - `confidenceLabel` emerald/amber/slate; up to 3 `topFactors` pills; expanded state only
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4_
  - [x]* 9.6–9.16 Property tests and unit tests (optional)

- [x] 10. Update Stats_Bar
  - [x] 10.1 ML mode: Safe/Likely/Moderate/Risky counts; fallback mode: High/Medium/Low counts; zero when empty
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 12.5_
  - [x]* 10.2–10.3 Property tests (optional)

- [x] 11. Update filter and sort controls
  - [x] 11.1 ML mode: filter by `admissionBand`; fallback: filter by `admissionChance`; sort by chance uses `admissionProbabilityP10` as tiebreaker in ML mode
    - _Requirements: 8.1, 8.2, 8.3, 8.4_
  - [x]* 11.2–11.3 Property tests (optional)

- [x] 12. Final checkpoint — frontend complete

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Property tests use **fast-check** (TypeScript), minimum 100 iterations each
- `resolveAdmissionProbability()` and `generateEntryReason()` from `src/lib/scoring.ts` must never be redefined locally
- All API response fields use camelCase; `dataVersion` must be included in metadata
- Collapsed College_Cards show admission band + probability range only; confidence label and top factors are expanded-state only
