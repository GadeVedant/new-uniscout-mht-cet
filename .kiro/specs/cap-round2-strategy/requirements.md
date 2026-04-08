# Requirements Document

## Introduction

This feature adds a "CAP Round 2 Strategy" tab to the UniScout ResultsPage, visible only when the student has queried CAP Round I results. It surfaces three pieces of actionable intelligence derived from historical `cap_round_delta` data (the difference between CAP Round I and CAP Round II cutoffs per college-branch-category combination):

1. A "Missed in Round 1" list — colleges the student narrowly missed in Round 1 that historically drop enough in Round 2 to fall within the student's range.
2. A "Freeze or Float?" advisor — a personalised recommendation on whether the student should accept their current best Round 1 offer or wait for Round 2 to open better options.
3. A "Round 2 Opportunities" list — all colleges currently flagged with a Round 2 opportunity badge, sorted by expected cutoff drop.

A new backend endpoint `POST /api/strategy/round2` powers the analysis. The frontend renders the strategy as a dedicated tab on the ResultsPage, shown only when `capRound === 'I'`.

---

## Glossary

- **Strategy_Tab**: The new "CAP Round 2 Strategy" tab rendered on the Results_Page when `capRound === 'I'`.
- **Results_Page**: The existing React component `ResultsPage.tsx` that renders the list of college recommendations.
- **Strategy_Endpoint**: The new backend REST endpoint `POST /api/strategy/round2` that computes and returns the Round 2 strategy analysis.
- **Strategy_Response**: The JSON response returned by the Strategy_Endpoint, containing `missedColleges`, `freezeOrFloat`, and `round2Opportunities`.
- **Missed_College**: A college that the student narrowly missed in Round 1 (Round 1 cutoff exceeds student percentile by ≤8 points) and whose historical average `cap_round_delta` is ≥3 percentile points.
- **cap_round_delta**: The difference in cutoff percentile between CAP Round I and CAP Round II for the same `(college_code, branch_name, category, year)` combination, as computed by the ML Feature_Engineer. A positive value means the Round 2 cutoff is lower (easier to get in).
- **Historical_Average_Delta**: The mean `cap_round_delta` across all available years for a given `(college_code, branch_name, category)` combination.
- **Expected_Round2_Cutoff**: The Round 1 cutoff minus the Historical_Average_Delta for a given college-branch-category combination.
- **Round2_Probability**: The ML-derived admission probability for the student at the Expected_Round2_Cutoff, computed using the same sigmoid mapping as the ML_Service Predictor.
- **Best_Round1_Option**: The college in the student's Round 1 results with the highest Admission_Band rank (Safe > Likely > Moderate > Risky), breaking ties by highest `admission_probability`.
- **Freeze_Advice**: The advisor recommendation to accept the Best_Round1_Option and not wait for Round 2.
- **Float_Advice**: The advisor recommendation to wait for Round 2 because a meaningfully better college is likely to open.
- **Better_Option**: A college not in the student's current Round 1 results whose Expected_Round2_Cutoff falls within the student's percentile range (student percentile ≥ Expected_Round2_Cutoff) and whose `college_prestige_score` or placement data indicates it is a better outcome than the Best_Round1_Option.
- **Admission_Band**: A categorical label derived from ML `admission_probability`: "Safe" (≥80%), "Likely" (50–79%), "Moderate" (20–49%), or "Risky" (<20%). Defined in the `mhtcet-cutoff-prediction` spec.
- **Round2_Opportunity**: A boolean flag set to `true` when the Historical_Average_Delta for a college-branch-category combination is ≥3.0 percentile points. Defined in the `enhanced-results-page` spec.
- **Node_Backend**: The TypeScript/Node.js Express backend at `backend-mhtcet/`.
- **CollegeRecommendation**: The existing TypeScript interface in `src/services/api.ts` representing a single college result, extended by the `enhanced-results-page` spec with ML and placement fields.
- **Strategy_Service**: The Node_Backend component responsible for computing the Round 2 strategy analysis from the in-memory dataset and ML-derived fields.
- **Tab_Bar**: The tab navigation control added to the Results_Page header area, allowing the student to switch between the existing "Results" view and the new "Round 2 Strategy" view.
- **ML_Service**: The Python FastAPI microservice defined in the `mhtcet-cutoff-prediction` spec.

---

## Requirements

### Requirement 1: Strategy Tab Visibility and Navigation

**User Story:** As a student who has just viewed Round 1 results, I want a "CAP Round 2 Strategy" tab on the results page, so that I can access Round 2 planning without leaving my current context.

#### Acceptance Criteria

1. WHEN `capRound === 'I'` in the active recommendation query, THE Results_Page SHALL render a Tab_Bar with two tabs: "Results" (the existing view) and "Round 2 Strategy".
2. WHEN `capRound` is not `'I'` (i.e. Round II or Round III), THE Results_Page SHALL NOT render the Tab_Bar or the Strategy_Tab; the existing results view SHALL be the only content shown.
3. WHEN the student clicks the "Round 2 Strategy" tab, THE Results_Page SHALL display the Strategy_Tab content and SHALL hide the existing college cards grid, stats bar, and filter controls.
4. WHEN the student clicks the "Results" tab, THE Results_Page SHALL restore the existing college cards grid, stats bar, and filter controls and SHALL hide the Strategy_Tab content.
5. THE Tab_Bar SHALL visually indicate the currently active tab using a distinct highlight style consistent with the existing dark glassmorphism design system.
6. THE Tab_Bar SHALL be rendered in the Results_Page header area, below the page title and above the stats bar, so it is visible without scrolling on initial page load.

---

### Requirement 2: Strategy Data Fetching

**User Story:** As a student, I want the Round 2 strategy analysis to load automatically when I open the strategy tab, so that I do not have to trigger it manually.

#### Acceptance Criteria

1. WHEN the student first activates the "Round 2 Strategy" tab, THE Results_Page SHALL call `POST /api/strategy/round2` with the student's `percentile`, `category`, `branch` (from the original query), and the full `colleges` array from the current Round 1 results.
2. THE Results_Page SHALL call the Strategy_Endpoint at most once per results session; subsequent activations of the "Round 2 Strategy" tab SHALL use the cached Strategy_Response without re-fetching.
3. WHILE the Strategy_Endpoint call is in progress, THE Strategy_Tab SHALL display a loading skeleton in place of each of the three strategy sections.
4. WHEN the Strategy_Endpoint returns a non-200 HTTP response or a network error occurs, THE Strategy_Tab SHALL display an inline error message and a retry button that re-triggers the fetch.
5. IF the Strategy_Endpoint call has not resolved within 10 seconds, THE Strategy_Tab SHALL cancel the request, display a timeout message, and offer a retry button.

---

### Requirement 3: "Missed in Round 1" List

**User Story:** As a student who narrowly missed some colleges in Round 1, I want to see which of those colleges historically drop their cutoff enough in Round 2 to fall within my range, so that I know which colleges are worth targeting in Round 2.

#### Acceptance Criteria

1. THE Strategy_Service SHALL identify Missed_Colleges as colleges present in the in-memory dataset (but not necessarily in the student's Round 1 results) where the Round 1 cutoff for the student's `(category, branch)` combination exceeds the student's percentile by more than 0 and at most 8 percentile points, AND the Historical_Average_Delta for that college-branch-category combination is ≥3.0 percentile points.
2. THE Strategy_Endpoint SHALL return each Missed_College with the following fields: `collegeName`, `branch`, `collegeCode`, `round1Cutoff` (the current Round 1 cutoff), `historicalAvgRound2Cutoff` (the Expected_Round2_Cutoff), `expectedDrop` (the Historical_Average_Delta), and `round2Probability` (the Round2_Probability for the student at the Expected_Round2_Cutoff).
3. WHEN the Strategy_Tab renders the "Missed in Round 1" section, THE Strategy_Tab SHALL display each Missed_College as a card showing: college name, branch, Round 1 cutoff, expected Round 2 cutoff, expected drop (formatted as "↓ {value} pts"), and Round2_Probability as a percentage.
4. THE Strategy_Tab SHALL sort the Missed_College list by `expectedDrop` descending (largest drop first) so the most accessible colleges appear at the top.
5. WHEN the Missed_College list is empty, THE Strategy_Tab SHALL display the message "No colleges found within 8 points of your percentile with a historical Round 2 drop of 3+ points" in place of the list.
6. THE Strategy_Service SHALL limit the Missed_College list to a maximum of 10 entries to keep the response focused and the UI scannable.
7. WHEN `round2Probability` is ≥50%, THE Strategy_Tab SHALL highlight the corresponding Missed_College card with a "Good chance in Round 2" indicator using an emerald/green accent.
8. WHEN `round2Probability` is <50%, THE Strategy_Tab SHALL display the Missed_College card without the positive indicator, using a neutral styling.

---

### Requirement 4: "Freeze or Float?" Advisor

**User Story:** As a student with a Round 1 offer, I want a clear recommendation on whether to accept my current best offer or wait for Round 2, so that I can make a confident decision without manually comparing dozens of colleges.

#### Acceptance Criteria

1. THE Strategy_Service SHALL identify the Best_Round1_Option as the college in the input `colleges` array with the highest Admission_Band rank (Safe > Likely > Moderate > Risky), breaking ties by highest `admission_probability`; WHEN `admissionBand` is absent, THE Strategy_Service SHALL use `admissionChance` (High > Medium > Low) as the fallback ranking.
2. THE Strategy_Service SHALL determine Freeze_Advice WHEN the Best_Round1_Option has an Admission_Band of "Safe" or "Likely" AND no Better_Option exists among the Missed_College list.
3. THE Strategy_Service SHALL determine Float_Advice WHEN at least one Better_Option exists: a college in the Missed_College list whose `college_prestige_score` exceeds the Best_Round1_Option's `college_prestige_score` by more than 5 points, OR whose `avgPackage` (if available) exceeds the Best_Round1_Option's `avgPackage` by more than ₹1 LPA, AND whose `round2Probability` is ≥50%.
4. THE Strategy_Endpoint SHALL return a `freezeOrFloat` object containing: `advice` ("Freeze" or "Float"), `bestCurrentOption` (the Best_Round1_Option's `collegeName`, `branch`, and `admissionBand`), `reasoning` (a human-readable string), and optionally `betterOption` (the top Better_Option's `collegeName`, `branch`, `historicalAvgRound2Cutoff`, and `round2Probability`) when Float_Advice applies.
5. WHEN Float_Advice applies, THE Strategy_Endpoint SHALL populate `reasoning` with a string in the format: "Your best current option is {bestCollegeName} ({admissionBand}). In Round 2, {betterCollegeName} typically drops to {historicalAvgRound2Cutoff}, which is within your range."
6. WHEN Freeze_Advice applies, THE Strategy_Endpoint SHALL populate `reasoning` with a string in the format: "Your best current option is {bestCollegeName} ({admissionBand}). No significantly better college is likely to open in Round 2 within your range. Freezing is the safer choice."
7. WHEN the input `colleges` array is empty or no Best_Round1_Option can be determined, THE Strategy_Endpoint SHALL return `advice: "Freeze"` with `reasoning: "No Round 1 results available to evaluate. Consider freezing any offer you hold."`.
8. THE Strategy_Tab SHALL render the "Freeze or Float?" section as a prominent advisory card displaying: the advice label ("Freeze" or "Float") as a large badge, the `reasoning` string, and — when Float_Advice applies — a summary of the Better_Option with its expected Round 2 cutoff and Round2_Probability.
9. THE Strategy_Tab SHALL style the "Freeze" badge with an emerald/green colour and the "Float" badge with a blue/cyan colour to provide immediate visual distinction.

---

### Requirement 5: Round 2 Opportunities List

**User Story:** As a student, I want to see all colleges currently flagged as Round 2 opportunities sorted by expected cutoff drop, so that I can quickly identify the colleges most likely to become accessible in Round 2.

#### Acceptance Criteria

1. THE Strategy_Service SHALL build the Round 2 Opportunities list from all colleges in the in-memory dataset (for the student's `category` and `branch`) where `round2Opportunity` is `true` (Historical_Average_Delta ≥3.0 percentile points), regardless of whether the student missed them in Round 1.
2. THE Strategy_Endpoint SHALL return each Round 2 Opportunity entry with: `collegeName`, `branch`, `collegeCode`, `round1Cutoff`, `historicalAvgRound2Cutoff`, `expectedDrop`, and `round2Opportunity: true`.
3. THE Strategy_Tab SHALL render the "Round 2 Opportunities" section as a sortable list, defaulting to sort by `expectedDrop` descending (largest drop first).
4. THE Strategy_Tab SHALL display each Round 2 Opportunity entry as a row or card showing: college name, branch, Round 1 cutoff, expected Round 2 cutoff, and expected drop formatted as "↓ {value} pts".
5. WHEN the Round 2 Opportunities list is empty, THE Strategy_Tab SHALL display the message "No colleges in your branch and category show a consistent Round 2 cutoff drop of 3+ points based on historical data."
6. THE Strategy_Tab SHALL visually distinguish colleges in the Round 2 Opportunities list that are also in the student's Missed_College list (i.e. within 8 points of the student's percentile) using a "Within your range" badge or highlight.
7. THE Strategy_Service SHALL limit the Round 2 Opportunities list to a maximum of 20 entries, ordered by `expectedDrop` descending before applying the limit.

---

### Requirement 6: Strategy Endpoint Contract

**User Story:** As a frontend developer, I want a well-defined REST endpoint for the Round 2 strategy analysis, so that the Strategy_Tab can fetch all required data in a single call.

#### Acceptance Criteria

1. THE Strategy_Endpoint SHALL be accessible at `POST /api/strategy/round2` and SHALL accept a JSON body with fields: `percentile` (number, 0–100), `category` (string), `branch` (string), and `colleges` (array of CollegeRecommendation objects, may be empty).
2. WHEN a valid request is received, THE Strategy_Endpoint SHALL return HTTP 200 with a JSON body: `{ success: true, data: { missedColleges: MissedCollege[], freezeOrFloat: FreezeOrFloatResult, round2Opportunities: Round2Opportunity[] } }`.
3. WHEN `percentile` is outside [0, 100], THE Strategy_Endpoint SHALL return HTTP 422 with a descriptive validation error.
4. WHEN `category` or `branch` is absent from the request body, THE Strategy_Endpoint SHALL return HTTP 400 with a descriptive error listing the missing fields.
5. WHEN `colleges` is absent from the request body, THE Strategy_Endpoint SHALL treat it as an empty array and proceed; the `freezeOrFloat` advice SHALL default to "Freeze" per Requirement 4, criterion 7.
6. THE Strategy_Endpoint SHALL respond within 500ms (p95 latency) under normal operating conditions with the in-memory dataset loaded.
7. THE Strategy_Endpoint SHALL source all `cap_round_delta` and `college_prestige_score` data from the existing in-memory dataset already loaded by the Node_Backend at startup; it SHALL NOT require a new data file or external service call.
8. THE Strategy_Endpoint SHALL be documented in the Node_Backend route definitions with JSDoc comments describing the request schema, response schema, and error codes.

---

### Requirement 7: TypeScript Type Definitions

**User Story:** As a frontend developer, I want TypeScript interfaces for all strategy-related data structures, so that the compiler enforces correct usage in the Strategy_Tab component.

#### Acceptance Criteria

1. THE `src/services/api.ts` file SHALL define a `Round2StrategyRequest` interface with fields: `percentile` (number), `category` (string), `branch` (string), `colleges` (CollegeRecommendation array).
2. THE `src/services/api.ts` file SHALL define a `MissedCollege` interface with fields: `collegeName` (string), `branch` (string), `collegeCode` (string), `round1Cutoff` (number), `historicalAvgRound2Cutoff` (number), `expectedDrop` (number), `round2Probability` (number).
3. THE `src/services/api.ts` file SHALL define a `FreezeOrFloatResult` interface with fields: `advice` (`'Freeze' | 'Float'`), `bestCurrentOption` (`{ collegeName: string; branch: string; admissionBand: string }`), `reasoning` (string), and optional `betterOption` (`{ collegeName: string; branch: string; historicalAvgRound2Cutoff: number; round2Probability: number }`).
4. THE `src/services/api.ts` file SHALL define a `Round2Opportunity` interface with fields: `collegeName` (string), `branch` (string), `collegeCode` (string), `round1Cutoff` (number), `historicalAvgRound2Cutoff` (number), `expectedDrop` (number), `round2Opportunity` (true).
5. THE `src/services/api.ts` file SHALL define a `Round2StrategyResponse` interface with fields: `missedColleges` (MissedCollege array), `freezeOrFloat` (FreezeOrFloatResult), `round2Opportunities` (Round2Opportunity array).
6. THE `api` object in `src/services/api.ts` SHALL expose a `getRound2Strategy(request: Round2StrategyRequest): Promise<ApiResponse<Round2StrategyResponse>>` method that calls `POST /api/strategy/round2`.
7. THE Node_Backend SHALL define equivalent interfaces in `backend-mhtcet/src/types/index.ts` for `Round2StrategyRequest`, `MissedCollege`, `FreezeOrFloatResult`, `Round2Opportunity`, and `Round2StrategyResponse`, consistent with the frontend definitions in criteria 1–5.

---

### Requirement 8: Strategy Tab Layout and Visual Design

**User Story:** As a student, I want the Round 2 Strategy tab to be visually clear and easy to scan on both desktop and mobile, so that I can quickly extract the key insights without reading dense text.

#### Acceptance Criteria

1. THE Strategy_Tab SHALL render the three sections in the following top-to-bottom order: "Freeze or Float?" advisor, "Missed in Round 1" list, "Round 2 Opportunities" list.
2. THE Strategy_Tab SHALL use the same dark glassmorphism design system as the existing Results_Page: the same Tailwind CSS utility classes, backdrop-blur panels, gradient borders, and Framer Motion animation patterns.
3. THE Strategy_Tab SHALL be fully responsive: on screens narrower than 768px, each section SHALL stack vertically in a single column; on screens 768px and wider, the "Missed in Round 1" and "Round 2 Opportunities" sections MAY use a two-column grid layout.
4. THE "Freeze or Float?" advisory card SHALL be visually prominent — larger than the list item cards — so students immediately see the primary recommendation when the tab loads.
5. WHEN the Strategy_Tab first renders after a successful fetch, THE three sections SHALL animate into view using Framer Motion staggered entrance animations consistent with the existing college card animations.
6. ALL interactive elements in the Strategy_Tab (retry buttons, sort controls) SHALL have accessible labels so that screen reader users can identify their purpose.

---

### Requirement 9: Edge Cases and Data Integrity

**User Story:** As a platform engineer, I want the Strategy_Service to handle missing or incomplete historical data gracefully, so that students never see broken UI or misleading advice.

#### Acceptance Criteria

1. WHEN a college-branch-category combination has fewer than 2 years of `cap_round_delta` data, THE Strategy_Service SHALL exclude that combination from the Missed_College list and the Round 2 Opportunities list, and SHALL NOT use it as a Better_Option in the Freeze or Float calculation.
2. WHEN all colleges in the input `colleges` array have `admissionBand` absent (full ML fallback mode), THE Strategy_Service SHALL use `admissionChance` (High/Medium/Low) as the ranking signal for Best_Round1_Option, mapping "High" → Safe-equivalent, "Medium" → Likely-equivalent, "Low" → Moderate-equivalent.
3. WHEN the student's `percentile` is above the Round 1 cutoff of all colleges in the in-memory dataset for the given `category` and `branch`, THE Strategy_Service SHALL return an empty `missedColleges` array and SHALL set `freezeOrFloat.advice` to "Freeze" with reasoning indicating no missed colleges were found.
4. WHEN `avgPackage` data is unavailable for both the Best_Round1_Option and the Better_Option candidate, THE Strategy_Service SHALL rely solely on `college_prestige_score` to determine whether a Better_Option qualifies, and SHALL NOT produce a Float_Advice recommendation based on package data alone.
5. IF the Strategy_Service encounters an unexpected error while computing any of the three strategy components, THE Strategy_Endpoint SHALL return HTTP 500 with a structured error response and SHALL log the error with the input parameters; THE Strategy_Endpoint SHALL NOT return a partial response with some components missing.
