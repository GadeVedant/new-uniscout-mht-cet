# Requirements Document

## Introduction

This feature enhances the UniScout MHT-CET results page with ML-powered admission intelligence, placement data, and richer college card information. The existing `ResultsPage.tsx` displays college cards with a simple High/Medium/Low admission chance derived from a rule-based percentile difference. This feature replaces that with ML-predicted admission bands (Safe/Likely/Moderate/Risky), probability ranges, cutoff trend indicators, placement package data, prediction explainability factors, confidence labels, and a "Round 2 opportunity" badge. It also updates the stats bar, adds graceful fallback when the ML service is unavailable, and enriches the backend `/api/recommendations` response with placement data joined from a CSV file.

The ML prediction fields (`p10`, `p50`, `p90`, `admission_probability`, `admission_band`, `confidence_label`, `top_factors`, `confidence_score`) are produced by the ML service specified in the `mhtcet-cutoff-prediction` spec. This spec covers only the frontend display changes, the frontend type updates, the backend Node.js type pass-through, and the backend placement data loading and joining.

---

## Glossary

- **Results_Page**: The React component `ResultsPage.tsx` that renders the list of college recommendations.
- **College_Card**: The React component `CollegeCard` that renders a single college recommendation within the Results_Page.
- **Stats_Bar**: The row of four summary stat cards at the top of the Results_Page showing counts by admission outcome.
- **Admission_Band**: A categorical label derived from ML `admission_probability`: "Safe" (≥80%), "Likely" (50–79%), "Moderate" (20–49%), or "Risky" (<20%).
- **Probability_Range**: A human-readable string showing the P10–P90 admission probability bounds, e.g. "78–85% chance".
- **Cutoff_Trend**: A directional indicator (↑ rising / ↓ falling / → stable) computed from 3 years of historical cutoff data for a given college-branch-category-CAP round combination.
- **Placement_Data**: College-level average and highest placement package figures loaded from a CSV file and joined to recommendation results by `college_code` or `college_name`.
- **Top_Factors**: Up to 3 human-readable explainability strings (e.g. "High branch demand") returned by the ML service in the `top_factors` field of a PredictionResult.
- **Confidence_Label**: A human-readable reliability label returned by the ML service: "High confidence", "Medium confidence", or "Low confidence (estimated)".
- **Round2_Badge**: A visual badge shown on a College_Card when historical `cap_round_delta` data indicates the cutoff typically drops ≥3 percentile points in CAP Round II relative to CAP Round I.
- **ML_Enriched_Response**: The `/api/recommendations` API response when the ML service is available, containing all ML fields alongside existing fields.
- **ML_Fallback_Response**: The `/api/recommendations` API response when the ML service is unavailable, containing `ml_unavailable: true` in metadata and retaining the existing `admissionChance` (High/Medium/Low) field.
- **Node_Backend**: The TypeScript/Node.js Express backend at `backend-mhtcet/`.
- **Placement_Loader**: The Node_Backend component responsible for reading the placement CSV file and building an in-memory lookup map keyed by `college_code`.
- **API_Types**: The TypeScript interface definitions in `backend-mhtcet/src/types/index.ts` and `src/services/api.ts`.
- **cap_round_delta**: The difference in cutoff percentile between CAP Round I and CAP Round II for the same college-branch-category-year combination, as computed by the ML service Feature_Engineer.

---

## Requirements

### Requirement 1: ML Admission Band Display

**User Story:** As a student, I want to see an ML-powered admission band (Safe/Likely/Moderate/Risky) with a probability percentage range on each college card, so that I can understand my admission chances more precisely than a simple High/Medium/Low label.

#### Acceptance Criteria

1. WHEN the API response contains ML fields (`admission_band`, `admission_probability`, `p10`, `p90`), THE College_Card SHALL display the `admission_band` label ("Safe", "Likely", "Moderate", or "Risky") in place of the existing "High", "Medium", or "Low" label.
2. WHEN the API response contains `p10` and `p90` admission probability bounds, THE College_Card SHALL display a Probability_Range string formatted as "{p10}–{p90}% chance" (e.g. "78–85% chance") alongside the admission band label.
3. THE College_Card SHALL apply distinct colour styling per admission band: "Safe" SHALL use an emerald/green palette, "Likely" SHALL use a blue palette, "Moderate" SHALL use an amber/orange palette, and "Risky" SHALL use a red/rose palette.
4. WHEN the API response contains `ml_unavailable: true` in the metadata, THE College_Card SHALL display the existing `admissionChance` label ("High", "Medium", or "Low") with no probability range shown.
5. THE College_Card SHALL NOT display both the ML admission band and the legacy admissionChance label simultaneously.

---

### Requirement 2: Cutoff Trend Indicator

**User Story:** As a student, I want to see whether a college's cutoff has been rising, falling, or stable over the past 3 years, so that I can factor trend direction into my college selection strategy.

#### Acceptance Criteria

1. WHEN the API response includes a `cutoffTrend` field for a college, THE College_Card SHALL display a directional trend indicator: "↑" for "rising", "↓" for "falling", and "→" for "stable".
2. THE Node_Backend SHALL compute `cutoffTrend` for each recommendation by comparing the cutoff percentile of the most recent year to the cutoff percentile 2 years prior for the same `(college_code, branch_name, category, cap_round)` combination; a difference of more than +1.0 percentile point SHALL be "rising", less than -1.0 SHALL be "falling", and within ±1.0 SHALL be "stable".
3. WHEN fewer than 2 years of historical data are available for a given combination, THE Node_Backend SHALL set `cutoffTrend` to "stable" as the default.
4. THE College_Card SHALL colour the trend indicator: "rising" SHALL use a red/rose colour (cutoff going up is harder for students), "falling" SHALL use an emerald/green colour (cutoff going down is easier), and "stable" SHALL use a neutral grey/blue colour.
5. THE College_Card SHALL display the trend indicator adjacent to the cutoff percentile value on the card face (collapsed state).

---

### Requirement 3: Placement Data Display

**User Story:** As a student, I want to see average and highest placement packages on each college card, so that I can compare career outcomes alongside admission chances.

#### Acceptance Criteria

1. THE Placement_Loader SHALL read a placement CSV file from a configurable path (default: `data/placements.csv`) at Node_Backend startup and build an in-memory lookup map keyed by `college_code`.
2. THE Placement_Loader SHALL parse the CSV columns `college_code`, `college_name`, `avg_package`, and `highest_package`; WHEN `college_code` is absent or empty for a row, THE Placement_Loader SHALL attempt to match by normalised `college_name` (lowercase, trimmed).
3. WHEN a college in the recommendations result has a matching entry in the placement lookup, THE Node_Backend SHALL include `avgPackage` and `highestPackage` (formatted as "₹X LPA") in the CollegeRecommendation response object.
4. WHEN no placement data is found for a college, THE Node_Backend SHALL set `avgPackage` and `highestPackage` to `null` in the response.
5. WHEN `avgPackage` is non-null, THE College_Card SHALL display it in the collapsed card view alongside fees and seats.
6. WHEN `highestPackage` is non-null, THE College_Card SHALL display it in the expanded card view.
7. WHEN both `avgPackage` and `highestPackage` are null, THE College_Card SHALL not render the placement section, leaving no empty placeholder visible to the student.

---

### Requirement 4: Prediction Explainability (Top Factors)

**User Story:** As a student, I want to see up to 3 key reasons why a college was predicted at a given admission chance, so that I can understand what is driving my likelihood of admission.

#### Acceptance Criteria

1. WHEN the API response contains a non-empty `top_factors` array for a college, THE College_Card SHALL display up to 3 Top_Factors strings in the expanded (detail) view of the card.
2. THE College_Card SHALL render each Top_Factor as a distinct pill or tag element, visually separated from other card content.
3. WHEN `top_factors` is absent or an empty array, THE College_Card SHALL not render the Top_Factors section in the expanded view.
4. THE College_Card SHALL display Top_Factors only in the expanded state; they SHALL NOT be visible on the collapsed card face.

---

### Requirement 5: Confidence Label Display

**User Story:** As a student, I want to know how reliable the ML prediction is for each college, so that I can weigh predictions from data-rich colleges more heavily than estimates for newer colleges.

#### Acceptance Criteria

1. WHEN the API response contains a `confidence_label` field, THE College_Card SHALL display it in the expanded view (e.g. "High confidence", "Medium confidence", "Low confidence (estimated)").
2. THE College_Card SHALL apply distinct styling per confidence level: "High confidence" SHALL use an emerald colour, "Medium confidence" SHALL use an amber colour, and "Low confidence (estimated)" SHALL use a grey/slate colour with an italicised or muted style to signal lower reliability.
3. WHEN `confidence_label` is absent (ML fallback mode), THE College_Card SHALL not render the confidence label section.
4. THE College_Card SHALL display the confidence label only in the expanded state; it SHALL NOT be visible on the collapsed card face.

---

### Requirement 6: Round 2 Opportunity Badge

**User Story:** As a student, I want to see a "Round 2 opportunity" badge on colleges where the cutoff historically drops in CAP Round II, so that I can identify colleges worth waiting for in the second round.

#### Acceptance Criteria

1. WHEN the API response includes `round2Opportunity: true` for a college, THE College_Card SHALL display a "Round 2 opportunity" badge visually distinct from the admission band badge.
2. THE Node_Backend SHALL set `round2Opportunity: true` for a college when the historical `cap_round_delta` (CAP Round I cutoff minus CAP Round II cutoff) for the same `(college_code, branch_name, category)` averaged across available years is ≥3.0 percentile points.
3. WHEN insufficient historical data exists to compute `cap_round_delta` for a combination, THE Node_Backend SHALL set `round2Opportunity: false`.
4. THE Round2_Badge SHALL be rendered on the collapsed card face so students can see it without expanding the card.
5. THE Round2_Badge SHALL use a distinct visual style (e.g. a teal or cyan accent) that does not conflict with the admission band colour palette.

---

### Requirement 7: Updated Stats Bar

**User Story:** As a student, I want the summary stats bar at the top of the results page to show counts by ML admission band (Safe/Likely/Moderate/Risky), so that I get an at-a-glance overview of my result set using the new classification.

#### Acceptance Criteria

1. WHEN the API response contains ML fields and `ml_unavailable` is absent or false, THE Stats_Bar SHALL display four stat cards labelled "Safe", "Likely", "Moderate", and "Risky" with counts of colleges in each band.
2. WHEN `ml_unavailable: true` is present in the API metadata, THE Stats_Bar SHALL display the existing three stat cards labelled "High Chance", "Medium Chance", and "Low Chance".
3. THE Stats_Bar SHALL apply the same colour palette per band as the College_Card: emerald for Safe, blue for Likely, amber for Moderate, and red for Risky.
4. THE Stats_Bar "Safe" count SHALL equal the number of colleges in the result set where `admission_band === "Safe"`, and similarly for the other three bands.
5. WHEN the result set is empty, THE Stats_Bar SHALL display all four band counts as zero.

---

### Requirement 8: Filter and Sort Compatibility

**User Story:** As a student, I want the existing filter and sort controls to work correctly with the new ML admission bands, so that I can filter by band and sort by admission chance without broken behaviour.

#### Acceptance Criteria

1. WHEN ML fields are present, THE Results_Page filter control SHALL offer filter options "All", "Safe", "Likely", "Moderate", and "Risky" in place of "All", "High", "Medium", "Low".
2. WHEN `ml_unavailable: true` is present, THE Results_Page filter control SHALL retain the existing "All", "High", "Medium", "Low" options.
3. WHEN sorting by "Admission Chance", THE Results_Page SHALL order colleges: Safe first, then Likely, then Moderate, then Risky (when ML bands are active), or High, Medium, Low (when in fallback mode).
4. THE Results_Page sort by "Admission Chance" SHALL use `admission_probability` as a secondary sort key (descending) to break ties within the same band.

---

### Requirement 9: API Type Updates

**User Story:** As a frontend developer, I want the TypeScript types in `api.ts` and the backend `types/index.ts` to include all new ML and placement fields, so that the compiler enforces correct usage across the codebase.

#### Acceptance Criteria

1. THE `CollegeRecommendation` interface in `src/services/api.ts` SHALL be extended with the following optional fields: `admissionBand` (`'Safe' | 'Likely' | 'Moderate' | 'Risky'`), `admissionProbabilityP10` (number), `admissionProbabilityP90` (number), `confidenceLabel` (string), `topFactors` (string array), `cutoffTrend` (`'rising' | 'falling' | 'stable'`), `round2Opportunity` (boolean), `avgPackage` (string or null), `highestPackage` (string or null).
2. THE `CollegeRecommendation` interface in `backend-mhtcet/src/types/index.ts` SHALL be extended with the same optional fields as specified in criterion 1.
3. THE `ApiResponse` metadata interface in `src/services/api.ts` SHALL be extended with an optional `ml_unavailable` boolean field.
4. THE `ApiResponse` metadata interface in `backend-mhtcet/src/types/index.ts` SHALL be extended with an optional `ml_unavailable` boolean field.
5. ALL new fields SHALL be typed as optional (using `?`) so that existing code paths that do not populate them remain valid without type errors.

---

### Requirement 10: Backend Placement Data Loading

**User Story:** As a backend developer, I want the Node_Backend to load placement data from a CSV file at startup and join it to recommendation results, so that placement figures are available in the API response without a separate client-side request.

#### Acceptance Criteria

1. THE Placement_Loader SHALL be initialised at Node_Backend startup, before the HTTP server begins accepting requests.
2. WHEN the placement CSV file is not found at the configured path, THE Placement_Loader SHALL log a warning and continue startup with an empty placement map; THE Node_Backend SHALL NOT fail to start.
3. WHEN the placement CSV file contains a row with a non-numeric `avg_package` or `highest_package` value, THE Placement_Loader SHALL skip that row and log a warning with the row index and offending value.
4. THE Placement_Loader SHALL expose a `getPlacement(collegeCode: string, collegeName: string)` method that returns `{ avgPackage: string | null, highestPackage: string | null }`.
5. THE Node_Backend recommendation controller SHALL call `getPlacement` for each college in the result set and merge the returned fields into the CollegeRecommendation object before sending the API response.
6. THE Placement_Loader SHALL format package values as "₹{value} LPA" when the raw CSV value is a plain number (e.g. `6.5` becomes `"₹6.5 LPA"`); WHEN the raw value already contains a currency symbol or unit, THE Placement_Loader SHALL use it as-is after trimming whitespace.

---

### Requirement 11: ML Field Pass-Through in Node Backend

**User Story:** As a backend developer, I want the Node_Backend to pass through all ML prediction fields from the ML service response into the `/api/recommendations` API response, so that the frontend receives a single enriched response without making separate ML service calls.

#### Acceptance Criteria

1. WHEN the ML service returns a valid PredictionResult for a college, THE Node_Backend SHALL include `admissionBand`, `admissionProbabilityP10` (mapped from `p10` admission probability), `admissionProbabilityP90` (mapped from `p90` admission probability), `confidenceLabel`, and `topFactors` in the CollegeRecommendation response object.
2. WHEN the ML service is unavailable and the Node_Backend falls back to rule-based logic, THE Node_Backend SHALL include `ml_unavailable: true` in the `metadata` field of the API response and SHALL retain the existing `admissionChance` field with its High/Medium/Low value.
3. WHEN ML fields are present in the response, THE Node_Backend SHALL still include the `admissionChance` field for backward compatibility with any existing consumers; its value SHALL be derived from `admissionBand` by mapping "Safe" → "High", "Likely" → "High", "Moderate" → "Medium", "Risky" → "Low".
4. THE Node_Backend SHALL NOT expose raw ML service internal fields (e.g. `p10`, `p50`, `p90` cutoff percentile bounds) directly in the CollegeRecommendation object; only the derived admission probability bounds (`admissionProbabilityP10`, `admissionProbabilityP90`) SHALL be included.

---

### Requirement 12: Graceful Fallback When ML Service Is Unavailable

**User Story:** As a student, I want the results page to still work and show useful information even when the ML prediction service is down, so that a backend outage does not prevent me from seeing college recommendations.

#### Acceptance Criteria

1. WHEN `ml_unavailable: true` is present in the API response metadata, THE Results_Page SHALL render all college cards using the legacy `admissionChance` (High/Medium/Low) display with no probability range, no confidence label, and no top factors shown.
2. WHEN `ml_unavailable: true` is present, THE College_Card SHALL display a subtle indicator (e.g. a muted "Basic prediction" label) so students are aware the enhanced ML view is not active.
3. WHEN `ml_unavailable: true` is present, THE College_Card SHALL still display `cutoffTrend`, `round2Opportunity`, `avgPackage`, and `highestPackage` if those fields are present, as they are computed by the Node_Backend independently of the ML service.
4. THE Results_Page SHALL NOT display an error message or broken UI state solely because ML fields are absent; the fallback display SHALL be visually complete and functional.
5. WHEN `ml_unavailable: true` is present, THE Stats_Bar SHALL fall back to the High/Medium/Low counts as specified in Requirement 7, criterion 2.
