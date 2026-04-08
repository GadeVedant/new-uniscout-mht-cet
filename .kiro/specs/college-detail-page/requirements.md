# Requirements Document

## Introduction

This feature introduces a dedicated `CollegeDetailPage` component to the UniScout MHT-CET platform. Currently, clicking a college card in the `ResultsPage` only expands it inline to reveal a few extra fields. This feature replaces that limited interaction with a full-screen detail page that surfaces all available data for a selected college: ML-powered admission chances, 3-year cutoff history visualised as a chart, placement statistics, college metadata, and a Round 2 strategy advisory. Navigation remains state-based (no React Router), passing the selected college through component state. A new backend endpoint provides cutoff history data for the chart.

---

## Glossary

- **College_Detail_Page**: The new React component `CollegeDetailPage.tsx` that renders the full detail view for a selected college.
- **College_Card**: The existing React component in `ResultsPage.tsx` that renders a single college recommendation. This feature adds a "View Details" button to it.
- **Results_Page**: The existing React component `ResultsPage.tsx` that renders the list of college recommendations.
- **App**: The root React component `App.tsx` that manages top-level navigation state.
- **Hero_Section**: The top section of the College_Detail_Page displaying college identity information (name, type, location, district, college code).
- **Chances_Section**: The section of the College_Detail_Page displaying ML-derived admission intelligence (admission band, probability range, confidence label, top factors, probability bar).
- **Cutoff_History_Section**: The section of the College_Detail_Page displaying a chart of cutoff percentile over 3 years for the selected branch, category, and CAP round combination.
- **Placement_Section**: The section of the College_Detail_Page displaying average and highest placement package as stat cards.
- **College_Info_Section**: The section of the College_Detail_Page displaying fees, seats, branch, category, and CAP round.
- **Round2_Strategy_Section**: The section of the College_Detail_Page shown conditionally when `round2Opportunity` is true, displaying the historical cutoff delta between CAP Round I and CAP Round II.
- **Cutoff_History_Endpoint**: The new backend REST endpoint `GET /api/colleges/:collegeCode/cutoff-history` that returns year-by-year cutoff percentile data.
- **Cutoff_History_Chart**: A Recharts line or bar chart rendered inside the Cutoff_History_Section.
- **Admission_Band**: A categorical label derived from ML `admission_probability`: "Safe" (≥80%), "Likely" (50–79%), "Moderate" (20–49%), or "Risky" (<20%).
- **Probability_Bar**: A horizontal visual bar showing the student's percentile relative to the P10–P90 cutoff range for the selected college-branch-category combination.
- **Top_Factors**: Up to 3 human-readable strings explaining the key drivers of the ML prediction (e.g. "High branch demand"), sourced from the `top_factors` field of the ML PredictionResult.
- **Confidence_Label**: A human-readable reliability label: "High confidence", "Medium confidence", or "Low confidence (estimated)".
- **round2Opportunity**: A boolean field on the `CollegeRecommendation` object indicating whether the college's cutoff historically drops ≥3 percentile points in CAP Round II relative to CAP Round I.
- **round2Delta**: The average historical difference (in percentile points) between CAP Round I and CAP Round II cutoffs for the selected college-branch-category combination.
- **CollegeRecommendation**: The existing TypeScript interface in `src/services/api.ts` representing a single college result, extended by the `enhanced-results-page` spec with ML and placement fields.
- **CutoffHistoryEntry**: A TypeScript interface `{ year: number; cutoffPercentile: number }` representing one data point in the cutoff history response.
- **Node_Backend**: The TypeScript/Node.js Express backend at `backend-mhtcet/`.
- **Recharts**: The charting library used via the shadcn/ui chart component for rendering the Cutoff_History_Chart.

---

## Requirements

### Requirement 1: "View Details" Navigation Entry Point

**User Story:** As a student, I want a "View Details" button on each college card in the results list, so that I can navigate to a full detail page for any college I am interested in.

#### Acceptance Criteria

1. THE College_Card SHALL render a "View Details" button visible in the collapsed card state without requiring the card to be expanded first.
2. WHEN the student clicks the "View Details" button, THE App SHALL transition the view from Results_Page to College_Detail_Page, passing the selected `CollegeRecommendation` object as navigation state.
3. THE College_Card "View Details" button click event SHALL NOT also trigger the existing card expand/collapse toggle; the two interactions SHALL be independent.
4. THE College_Card "View Details" button SHALL be visually distinct from the card expand toggle, using a labelled button element rather than relying solely on the card click area.
5. WHEN the College_Detail_Page is active, THE Results_Page SHALL be unmounted from the DOM so that its scroll position and filter state are not visible behind the detail view.

---

### Requirement 2: Back Navigation

**User Story:** As a student, I want a "Back to Results" button on the college detail page, so that I can return to my results list without losing my search context.

#### Acceptance Criteria

1. THE College_Detail_Page SHALL render a "Back to Results" button in a fixed or sticky header position so it is accessible without scrolling.
2. WHEN the student clicks "Back to Results", THE App SHALL transition the view back to Results_Page, restoring the same `colleges` array and search parameters that were active before navigating to the detail page.
3. THE App SHALL preserve the `colleges` array, `portalType`, and the original `RecommendationRequest` in state so that returning to Results_Page does not require a new API call.
4. THE College_Detail_Page SHALL also render a "Home" button alongside "Back to Results" that navigates to the HomePage, consistent with the navigation pattern in Results_Page.

---

### Requirement 3: Hero Section

**User Story:** As a student, I want to see the college's identity information prominently at the top of the detail page, so that I can confirm I am viewing the correct college before reading further.

#### Acceptance Criteria

1. THE Hero_Section SHALL display the college name as the primary heading.
2. THE Hero_Section SHALL display the college type (e.g. "Government", "Private Unaided") as a labelled badge or tag.
3. THE Hero_Section SHALL display the location and district as a combined field with a map pin icon.
4. THE Hero_Section SHALL display the college code as a secondary identifier.
5. THE Hero_Section SHALL display the selected branch name prominently, as the detail page is scoped to a specific branch-category-CAP round combination from the search results.
6. WHEN the `collegeType` field is absent or empty, THE Hero_Section SHALL omit the college type badge rather than rendering an empty element.

---

### Requirement 4: "Your Chances" Section

**User Story:** As a student, I want to see my ML-predicted admission chances in detail on the college page, so that I can understand my probability of admission and the factors driving it.

#### Acceptance Criteria

1. WHEN the `CollegeRecommendation` contains an `admissionBand` field, THE Chances_Section SHALL display the Admission_Band label ("Safe", "Likely", "Moderate", or "Risky") as a prominent badge.
2. THE Chances_Section SHALL display the Probability_Bar: a horizontal bar where the full width represents the 0–100 percentile range, the P10–P90 band is highlighted as a shaded region, and the student's own percentile is marked with a distinct indicator (e.g. a vertical line or dot).
3. WHEN `admissionProbabilityP10` and `admissionProbabilityP90` are present, THE Chances_Section SHALL display a probability range label formatted as "P10: {value} – P90: {value}" to show the cutoff bounds.
4. WHEN `confidenceLabel` is present, THE Chances_Section SHALL display it with colour coding: "High confidence" in emerald, "Medium confidence" in amber, and "Low confidence (estimated)" in slate/grey.
5. WHEN `topFactors` is a non-empty array, THE Chances_Section SHALL display up to 3 Top_Factors as individual pill elements with a section heading (e.g. "Key Factors").
6. WHEN `admissionBand` is absent (ML fallback mode), THE Chances_Section SHALL display the legacy `admissionChance` label ("High", "Medium", or "Low") with a "Basic prediction" indicator and SHALL NOT render the Probability_Bar or Top_Factors.
7. THE Chances_Section SHALL apply the same admission band colour palette as the College_Card: emerald for "Safe", blue for "Likely", amber for "Moderate", red for "Risky".

---

### Requirement 5: Cutoff History Section

**User Story:** As a student, I want to see a chart of the college's cutoff percentile over the past 3 years for my selected branch, category, and CAP round, so that I can understand whether the cutoff is trending up, down, or staying stable.

#### Acceptance Criteria

1. WHEN the College_Detail_Page mounts, THE Cutoff_History_Section SHALL fetch cutoff history data from `GET /api/colleges/:collegeCode/cutoff-history?branch=&category=&capRound=` using the `collegeCode`, `branch`, `category`, and `capRound` values from the selected `CollegeRecommendation`.
2. WHEN the Cutoff_History_Endpoint returns a non-empty array of `CutoffHistoryEntry` objects, THE Cutoff_History_Section SHALL render a Cutoff_History_Chart displaying `cutoffPercentile` on the Y-axis and `year` on the X-axis, with data points sorted ascending by year.
3. THE Cutoff_History_Chart SHALL use Recharts (via the shadcn/ui chart component) and SHALL support both line and bar chart rendering; the default SHALL be a line chart with data point markers.
4. WHEN the Cutoff_History_Endpoint returns an empty array, THE Cutoff_History_Section SHALL display a "No historical data available for this combination" message in place of the chart.
5. WHEN the fetch to the Cutoff_History_Endpoint fails (network error or non-200 response), THE Cutoff_History_Section SHALL display an error message and SHALL NOT crash the College_Detail_Page.
6. WHILE the cutoff history fetch is in progress, THE Cutoff_History_Section SHALL display a loading skeleton in place of the chart.
7. THE Cutoff_History_Chart Y-axis SHALL be scaled to the data range with a minimum padding of ±2 percentile points above and below the min/max values, so that small changes are visually distinguishable.

---

### Requirement 6: Placement Section

**User Story:** As a student, I want to see placement statistics for the college on the detail page, so that I can evaluate career outcomes as part of my college selection.

#### Acceptance Criteria

1. WHEN `avgPackage` is non-null in the `CollegeRecommendation`, THE Placement_Section SHALL display it as a stat card labelled "Avg Package".
2. WHEN `highestPackage` is non-null in the `CollegeRecommendation`, THE Placement_Section SHALL display it as a stat card labelled "Highest Package".
3. WHEN both `avgPackage` and `highestPackage` are null, THE Placement_Section SHALL not be rendered; no empty section heading or placeholder SHALL be visible.
4. THE Placement_Section stat cards SHALL use a visually distinct style (e.g. a currency or trophy icon) to differentiate them from the College_Info_Section stat cards.

---

### Requirement 7: College Info Section

**User Story:** As a student, I want to see the key admission details for the selected branch on the detail page, so that I have all the information I need to make a decision in one place.

#### Acceptance Criteria

1. THE College_Info_Section SHALL display the following fields as labelled stat items: fees, total seats, branch name, category, and CAP round.
2. WHEN `fees` is absent or empty, THE College_Info_Section SHALL display "Not available" for that field rather than leaving it blank.
3. WHEN `seats` is zero or absent, THE College_Info_Section SHALL display "Not available" for that field.
4. THE College_Info_Section SHALL render all fields in a responsive grid layout that adapts from a single column on mobile to two or three columns on wider screens.

---

### Requirement 8: Round 2 Strategy Section

**User Story:** As a student, I want to see a Round 2 strategy advisory on the detail page when historical data shows the cutoff typically drops in CAP Round II, so that I can decide whether to wait for Round 2 before accepting an offer.

#### Acceptance Criteria

1. WHEN `round2Opportunity` is `true` in the `CollegeRecommendation`, THE Round2_Strategy_Section SHALL be rendered with a heading such as "Round 2 Strategy".
2. THE Round2_Strategy_Section SHALL display the message: "This college's cutoff typically drops {round2Delta} percentile points in Round 2" where `{round2Delta}` is the historical average delta value.
3. WHEN `round2Opportunity` is `false` or absent, THE Round2_Strategy_Section SHALL not be rendered.
4. THE Round2_Strategy_Section SHALL use a visually distinct accent colour (e.g. teal or cyan) consistent with the Round2_Badge style used in the College_Card.
5. WHEN `round2Delta` is not available in the `CollegeRecommendation` object, THE Round2_Strategy_Section SHALL display the message "This college's cutoff typically drops in Round 2" without a specific delta value, rather than crashing or showing a broken string.

---

### Requirement 9: Cutoff History Backend Endpoint

**User Story:** As a frontend developer, I want a backend endpoint that returns year-by-year cutoff data for a specific college-branch-category-CAP round combination, so that the College_Detail_Page can render the Cutoff_History_Chart without embedding historical data in the recommendations response.

#### Acceptance Criteria

1. THE Cutoff_History_Endpoint SHALL be accessible at `GET /api/colleges/:collegeCode/cutoff-history` and SHALL accept query parameters `branch` (string), `category` (string), and `capRound` (string).
2. WHEN a valid request is received, THE Cutoff_History_Endpoint SHALL return HTTP 200 with a JSON body `{ success: true, data: CutoffHistoryEntry[] }` where each `CutoffHistoryEntry` is `{ year: number, cutoffPercentile: number }` and the array is sorted ascending by `year`.
3. THE Cutoff_History_Endpoint SHALL source data from the existing in-memory college dataset already loaded by the Node_Backend at startup; it SHALL NOT require a new data file or database query.
4. WHEN no records match the given `(collegeCode, branch, category, capRound)` combination, THE Cutoff_History_Endpoint SHALL return HTTP 200 with `{ success: true, data: [] }`.
5. WHEN `branch`, `category`, or `capRound` query parameters are missing, THE Cutoff_History_Endpoint SHALL return HTTP 400 with a descriptive error message listing the missing parameters.
6. WHEN `collegeCode` does not match any college in the in-memory dataset, THE Cutoff_History_Endpoint SHALL return HTTP 200 with `{ success: true, data: [] }` rather than HTTP 404, so the frontend can display the "no data" state gracefully.
7. THE Cutoff_History_Endpoint SHALL deduplicate entries with the same `year` by retaining the entry with the highest `cutoffPercentile`, consistent with the deduplication rule in the Data_Loader.
8. FOR ALL valid `(collegeCode, branch, category, capRound)` combinations present in the in-memory dataset, the array of `CutoffHistoryEntry` objects returned by the endpoint SHALL contain the same `cutoffPercentile` values as the corresponding records in the in-memory dataset (round-trip consistency property).

---

### Requirement 10: State-Based Navigation Integration

**User Story:** As a frontend developer, I want the App component to manage the College_Detail_Page as a new navigation state, so that the detail page integrates cleanly with the existing state-based routing without introducing React Router.

#### Acceptance Criteria

1. THE App SHALL extend its navigation state to include a `'college-detail'` view alongside the existing `'home'`, `'portal'`, and `'results'` views.
2. WHEN the navigation state is `'college-detail'`, THE App SHALL render the College_Detail_Page component and SHALL pass the selected `CollegeRecommendation`, the `colleges` array, and a `onBack` callback as props.
3. THE App `onBack` callback passed to College_Detail_Page SHALL set the navigation state back to `'results'` and SHALL NOT clear the `colleges` array or the original `RecommendationRequest`.
4. THE App SHALL store the selected `CollegeRecommendation` in a dedicated state variable (e.g. `selectedCollege`) that is set when the student clicks "View Details" and cleared when the student navigates away from the detail page.
5. WHEN the navigation state is `'college-detail'`, THE App SHALL NOT render the Results_Page, HomePage, or MhtCetPortal components simultaneously.

---

### Requirement 11: Responsive Layout and Accessibility

**User Story:** As a student on a mobile device, I want the college detail page to be fully usable on small screens, so that I can research colleges on my phone.

#### Acceptance Criteria

1. THE College_Detail_Page SHALL use a single-column layout on screens narrower than 768px and a multi-column layout on screens 768px and wider.
2. THE Cutoff_History_Chart SHALL be responsive: it SHALL resize to fit its container width and SHALL remain legible on screens as narrow as 320px.
3. THE College_Detail_Page sections SHALL be rendered in the following top-to-bottom order on all screen sizes: Hero_Section, Chances_Section, Cutoff_History_Section, Placement_Section, College_Info_Section, Round2_Strategy_Section.
4. THE "Back to Results" button SHALL remain accessible at all scroll positions via a sticky header; it SHALL NOT be hidden behind other content on any supported screen size.
5. ALL interactive elements on the College_Detail_Page (buttons, chart tooltips) SHALL have accessible labels so that screen reader users can identify their purpose.
6. THE College_Detail_Page SHALL maintain visual consistency with the existing dark glassmorphism design system used in Results_Page, using the same Tailwind CSS utility classes, Framer Motion animation patterns, and Radix UI primitives where applicable.

---

### Requirement 12: Loading and Error States

**User Story:** As a student, I want the college detail page to handle slow network conditions and API errors gracefully, so that I am never left looking at a broken or empty page.

#### Acceptance Criteria

1. WHILE the Cutoff_History_Endpoint fetch is in progress, THE College_Detail_Page SHALL display a loading skeleton for the Cutoff_History_Section and SHALL render all other sections immediately using data already available in the `CollegeRecommendation` object.
2. WHEN the Cutoff_History_Endpoint returns a non-200 HTTP status, THE Cutoff_History_Section SHALL display an inline error message (e.g. "Could not load cutoff history") and SHALL provide a retry button that re-triggers the fetch.
3. IF the Cutoff_History_Endpoint fetch has not resolved within 10 seconds, THE Cutoff_History_Section SHALL cancel the request, display a timeout message, and offer a retry button.
4. THE College_Detail_Page SHALL render all sections that depend solely on the `CollegeRecommendation` prop (Hero_Section, Chances_Section, Placement_Section, College_Info_Section, Round2_Strategy_Section) immediately on mount, without waiting for the cutoff history fetch to complete.
5. WHEN any section encounters a rendering error (e.g. unexpected null value), THE College_Detail_Page SHALL isolate the error to that section and continue rendering the remaining sections.
