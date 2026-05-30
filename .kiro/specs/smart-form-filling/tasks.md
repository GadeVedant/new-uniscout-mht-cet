# Implementation Plan: Smart Form Filling Generator

## Overview

Implement the Smart Form Filling Generator end-to-end: backend types, service, controller, and route; frontend types, navigation, form page, and display components; copy/PDF buttons; and property-based + unit tests.

The shared scoring module (`backend-mhtcet/src/utils/scoring.ts`) is the backend mirror of `src/lib/scoring.ts`. This feature imports `SCORING_WEIGHT_*` env vars from it — never redefine scoring logic locally.

## Tasks

- [x] 1. Add backend type definitions
  - `FormFillingRequest`, `PreferenceEntry` (with `entryReason`), `FormFillingResponse` added to `backend-mhtcet/src/types/index.ts`
  - _Requirements: 3.1, 3.2, 13.1, 13.2, 13.3_

- [x] 2. Implement FormFillingService
  - [x] 2.1 `backend-mhtcet/src/services/formFillingService.ts` implemented
  - [x]* 2.2 Property test for `parseAnnualFees` (Property 5)
  - [x]* 2.3 Property test for budget filter correctness (Property 4)
  - [x] 2.4 `computeWeightedScore` via `backend-mhtcet/src/utils/scoring.ts`
  - [x]* 2.5 Property test for weighted score bounds (Property 6)
  - [x]* 2.6 Property test for component scores (Property 7)
  - [x] 2.7 `assignTier`, `generateEntryReason`, `sortSafeTier` implemented
  - [x]* 2.8 Property test for tier ordering invariant (Property 2)
  - [x]* 2.9 Property test for dream tier cutoff constraint (Property 9)
  - [x]* 2.10 Property test for entry reason non-empty (Property 8)
  - [x]* 2.11 Property test for priority mode sort (Property 10)
  - [x] 2.12 `generatePreferenceList` final assembly implemented
  - [x]* 2.13 Property test for sequential rank numbers (Property 3)
  - [x]* 2.14 Property test for determinism (Property 1)
  - [x]* 2.15 Property test for response serialisation round-trip (Property 11)

- [x] 3. Implement FormFillingController
  - `backend-mhtcet/src/controllers/formFillingController.ts` implemented
  - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Register route
  - `POST /form-filling/generate` registered in `backend-mhtcet/src/routes/index.ts`
  - _Requirements: 3.1_

- [x] 5. Backend checkpoint — all non-optional backend tasks complete

- [x] 6. Add frontend type definitions and API method
  - `FormFillingRequest`, `PreferenceEntry`, `FormFillingResponse` in `src/services/api.ts`
  - `api.generateFormFillingList` calls `POST /api/form-filling/generate`
  - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 7. Update App.tsx navigation
  - `/smart-form` route renders `<SmartFormPage />`
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 8. Implement SmartFormPage component
  - [x] 8.1 `src/components/SmartFormPage.tsx` with full validation, progress indicator, branch/district guards
    - _Requirements: 1.5, 2.1–2.9, 9.1–9.5_
  - [x]* 8.2 Property test for percentile validation (Property 14)
  - [x]* 8.3 Property test for duplicate branch validation (Property 15)
  - [x]* 8.4 Property test for district count invariant (Property 16)

- [x] 9. Implement PreferenceList component
  - `src/components/PreferenceList.tsx` — Safe/Target/Dream tiers, summary bar, banners, empty state
  - _Requirements: 8.1, 8.3–8.7_

- [x] 10. Implement PreferenceEntryCard component
  - `src/components/PreferenceEntryCard.tsx` — rank, name, branch, entryReason, cutoff, band, probability, fees
  - _Requirements: 8.2, 6.6_

- [x] 11. Implement CopyButton component
  - `src/components/CopyButton.tsx` — spec format, clipboard, toast, hidden when empty
  - _Requirements: 10.1–10.5_
  - [x]* 11.1 Property test for copy format correctness (Property 12)
  - [x]* 11.2 Property test for copy button visibility (Property 13)

- [x] 12. Add disabled PDF button
  - Rendered in `PreferenceList.tsx`; disabled; "Coming soon" label
  - _Requirements: 11.1–11.4_

- [x] 13. Frontend checkpoint — all non-optional frontend tasks complete

- [x] 14. Write unit tests for FormFillingService
  - [x]* 14.1 Unit tests for `parseAnnualFees`, `assignTier`, `generateEntryReason`, `computeWeightedScore`, `sortSafeTier`
  - [x]* 14.2 Unit tests for budget filter and ML fallback

- [x] 15. Write unit tests for FormFillingController
  - [x]* 15.1 Controller validation tests

- [x] 16. Write unit tests for frontend components
  - [x]* 16.1 CopyButton tests
  - [x]* 16.2 PreferenceEntryCard tests
  - [x]* 16.3 SmartFormPage tests

## Notes

- Tasks marked with `*` are optional
- Property tests use fast-check with a minimum of 100 iterations per property
- Each property test includes the comment tag `// Feature: smart-form-filling, Property N: <property_text>`
- The shared scoring module (`backend-mhtcet/src/utils/scoring.ts`) owns `SCORING_WEIGHT_*` env vars
