# Implementation Plan: College Detail Page

## Overview

Implement the `CollegeDetailPage` feature end-to-end: a new backend cutoff history endpoint, frontend type/API additions, App.tsx navigation wiring, a "View Details" button on `CollegeCard`, and the full `CollegeDetailPage` component with all six sections.

## Tasks

- [x] 1. Backend: cutoff history endpoint
  - [x] 1.1 Add `CutoffHistoryEntry` interface to `backend-mhtcet/src/types/index.ts`
  - [x] 1.2 Implement `getCutoffHistory` controller in `backend-mhtcet/src/controllers/collegeController.ts`
  - [x] 1.3 Write property test for cutoff history sorting (Property 7)
  - [x] 1.4 Write property test for cutoff history deduplication (Property 8)
  - [x] 1.5 Write property test for missing query params returning HTTP 400 (Property 9)
  - [x] 1.6 Register route in `backend-mhtcet/src/routes/index.ts`
  - [x] 1.7 Write unit tests for `getCutoffHistory` controller

- [x] 2. Checkpoint — backend endpoint

- [x] 3. Frontend type and API additions
  - [x] 3.1 Add `CutoffHistoryEntry` interface to `src/services/api.ts`
  - [x] 3.2 Add `getCutoffHistory` method to the API service in `src/services/api.ts`

- [x] 4. App.tsx navigation wiring
  - [x] 4.1 Extend `Portal` type to include `'college-detail'` in `src/App.tsx`
  - [x] 4.2 Add `selectedCollege` state and `handleViewDetails` callback
  - [x] 4.3 Add `handleBackToResults` callback and render branch for `CollegeDetailPage`
  - [x] 4.4 Write property test for back navigation state preservation (Property 3)
    - **Property 3: State preservation on back navigation**
    - Tag: `// Feature: college-detail-page, Property 3`
  - [x] 4.5 Write unit tests for App navigation (`CollegeDetailPage.test.tsx`)
    - Navigate to detail then back → `colleges` array unchanged

- [x] 5. CollegeCard "View Details" button
  - [x] 5.1 Add `onViewDetails` prop to `CollegeCard`
  - [x] 5.2 Render "View Details" button on the collapsed card face
  - [x] 5.3 Write unit test for CollegeCard button isolation (Property 2)
    - Click "View Details" → `onViewDetails` called, `onToggle` NOT called

- [x] 6. CollegeDetailPage component scaffold
  - [x] 6.1 Create `src/components/CollegeDetailPage.tsx` with props interface and section slots
  - [x] 6.2 Add cutoff history fetch logic with 10s timeout
  - [x] 6.3 Write property test for non-chart sections rendering immediately (Property 14)
    - **Property 14: Non-chart sections render immediately from props**
    - Tag: `// Feature: college-detail-page, Property 14`
  - [x] 6.4 Write property test for fetch error not crashing page (Property 15)
    - **Property 15: Fetch error shows error state with retry, does not crash page**
    - Tag: `// Feature: college-detail-page, Property 15`

- [x] 7. Hero section
  - [x] 7.1 Implement `HeroSection` inside `CollegeDetailPage.tsx`
  - [x] 7.2 Write property test for Hero section field rendering (Property 1)
    - **Property 1: Hero section renders all identity fields**
    - Tag: `// Feature: college-detail-page, Property 1`

- [x] 8. Chances section
  - [x] 8.1 Implement `ChancesSection` and `ProbabilityBar` sub-component inside `CollegeDetailPage.tsx`
  - [x] 8.2 Write property test for Chances section ML vs legacy rendering (Property 5)
    - **Property 5: Chances section renders correct fields per ML availability**
    - Tag: `// Feature: college-detail-page, Property 5`
  - [x] 8.3 Write property test for probability bar bounds (Property 10 — Y-axis domain)
    - **Property 10: Chart Y-axis domain includes ±2 padding**
    - Tag: `// Feature: college-detail-page, Property 10`
  - [x] 8.4 Write unit tests for Chances section (`CollegeDetailPage.test.tsx`)

- [x] 9. Cutoff History section
  - [x] 9.1 Implement `CutoffHistorySection` inside `CollegeDetailPage.tsx`
  - [x] 9.2 Write unit tests for loading/error/empty/data states (`CollegeDetailPage.test.tsx`)

- [x] 10. Placement section
  - [x] 10.1 Implement `PlacementSection` inside `CollegeDetailPage.tsx`
  - [x] 10.2 Write property test for Placement section conditional rendering (Property 11)
    - **Property 11: Placement section renders only when data is present**
    - Tag: `// Feature: college-detail-page, Property 11`
  - [x] 10.3 Write unit tests for Placement section (`CollegeDetailPage.test.tsx`)

- [x] 11. College Info section
  - [x] 11.1 Implement `CollegeInfoSection` inside `CollegeDetailPage.tsx`
  - [x] 11.2 Write property test for College Info fallback (Property 12)
    - **Property 12: College info section displays fallback for missing fields**
    - Tag: `// Feature: college-detail-page, Property 12`
  - [x] 11.3 Write unit tests for College Info section (`CollegeDetailPage.test.tsx`)

- [x] 12. Round 2 Strategy section
  - [x] 12.1 Implement `Round2StrategySection` inside `CollegeDetailPage.tsx`
  - [x] 12.2 Write property test for Round 2 section conditional rendering (Property 13)
    - **Property 13: Round 2 section conditional rendering**
    - Tag: `// Feature: college-detail-page, Property 13`
  - [x] 12.3 Write unit tests for Round 2 section (`CollegeDetailPage.test.tsx`)

- [x] 13. Final checkpoint — full page implementation

## Notes

- Pure logic functions (`computeYAxisDomain`) exported from `CollegeDetailPage.tsx` for direct testing
- Each property test tagged with `// Feature: college-detail-page, Property N`
- Property tests use `fast-check` with minimum 100 runs; deduplication/sort tests use 200
- All sections except `CutoffHistorySection` render immediately from the `college` prop
