# Requirements Document

## Introduction

This feature adds a college comparison capability to the UniScout MHT-CET platform. Students currently view college cards individually on the ResultsPage and must mentally compare colleges across multiple expanded cards. This feature lets students select 2–3 colleges from the ResultsPage and view them side by side in a dedicated `CollegeComparisonPage`, with rows for all key admission and placement metrics. A "Best Pick" recommendation card at the bottom uses a weighted scoring formula to surface the college that best balances admission probability and placement outcome for the student's specific percentile. Navigation remains state-based, consistent with the rest of the platform.

---

## Glossary

- **Results_Page**: The existing React component `ResultsPage.tsx` that renders the list of college recommendation cards.
- **College_Card**: The existing React component `CollegeCard` inside `ResultsPage.tsx` that renders a single college recommendation.
- **Compare_Checkbox**: A checkbox or toggle button rendered on each College_Card that adds or removes the college from the Comparison_Selection.
- **Comparison_Selection**: The in-memory set of `CollegeRecommendation` objects the student has chosen to compare, with a maximum size of 3.
- **Floating_Compare_Bar**: A fixed-position bar rendered at the bottom of the Results_Page viewport when 1 or more colleges are in the Comparison_Selection, showing the count and a "Compare" action button.
- **College_Comparison_Page**: The new React component `CollegeComparisonPage.tsx` that renders selected colleges side by side in a comparison table.
- **Comparison_Table**: The grid or table layout inside the College_Comparison_Page that displays metric rows for each selected college as columns.
- **Comparison_Row**: A single labelled row in the Comparison_Table representing one metric (e.g. "Avg Package", "Cutoff Percentile").
- **Best_Pick_Card**: A highlighted recommendation card at the bottom of the College_Comparison_Page that identifies the college with the highest Weighted_Score and explains the recommendation.
- **Weighted_Score**: A numeric score computed per college as `(admission_probability × 0.5) + (normalized_avg_package × 0.3) + (normalized_prestige_score × 0.2)`, used to determine the Best_Pick. The weights are configurable and should not be treated as fixed constants.
- **Normalized_Avg_Package**: The college's `avg_package` value divided by the maximum `avg_package` among all colleges in the Comparison_Selection, yielding a value in [0, 1].
- **Normalized_Prestige_Score**: A numeric score in [0, 1] derived from `collegeType`: "Government Autonomous" = 1.0, "Government" = 0.85, "Private Aided" = 0.6, "Private Unaided" = 0.4, and any other type = 0.3.
- **ROI_Score**: A derived metric displayed in the Comparison_Table computed as `avg_package (LPA) ÷ annual_fees (LPA)`, formatted as "X.Xx" (two decimal places).
- **Annual_Fees**: The per-year fee figure derived from the `fees` field of the `CollegeRecommendation`. WHEN `fees` is a total programme cost, THE system SHALL divide by 4 to approximate annual fees.
- **Cutoff_Trend_Indicator**: A directional symbol ("↑", "↓", or "→") derived from the `cutoffTrend` field of the `CollegeRecommendation`.
- **Round2_Badge**: A "Yes" or "No" badge in the Comparison_Table derived from the `round2Opportunity` boolean field of the `CollegeRecommendation`.
- **Comparison_Toast**: A transient notification message shown when the student attempts to add a 4th college to the Comparison_Selection.
- **App**: The root React component `App.tsx` that manages top-level navigation state.
- **CollegeRecommendation**: The existing TypeScript interface in `src/services/api.ts` representing a single college result, extended by the `enhanced-results-page` spec with ML and placement fields.
- **admission_probability**: The numeric admission probability (0–1) from the `CollegeRecommendation` ML fields; WHEN absent (ML fallback), it SHALL be approximated as 0.85 for "High", 0.50 for "Medium", and 0.15 for "Low" using the `admissionChance` field.

---

## Requirements

### Requirement 1: Compare Checkbox on College Cards

**User Story:** As a student, I want a "Compare" checkbox on each college card in the results list, so that I can select the colleges I want to compare side by side.

#### Acceptance Criteria

1. THE College_Card SHALL render a Compare_Checkbox element visible in the collapsed card state without requiring the card to be expanded.
2. WHEN the student clicks the Compare_Checkbox, THE Results_Page SHALL add the corresponding `CollegeRecommendation` to the Comparison_Selection.
3. WHEN the student clicks a checked Compare_Checkbox, THE Results_Page SHALL remove the corresponding `CollegeRecommendation` from the Comparison_Selection.
4. WHEN a college is in the Comparison_Selection, THE Compare_Checkbox SHALL render in a visually checked state (e.g. filled checkbox with a checkmark icon) to confirm the selection.
5. WHEN the Comparison_Selection already contains 3 colleges and the student clicks an unchecked Compare_Checkbox, THE Results_Page SHALL display a Comparison_Toast and SHALL NOT add the college to the Comparison_Selection.
6. THE Compare_Checkbox click event SHALL NOT trigger the existing card expand/collapse toggle; the two interactions SHALL be independent.
7. THE Compare_Checkbox SHALL be visually distinct from the "View Details" button introduced by the `college-detail-page` spec, using a checkbox or toggle affordance rather than a text button.

---

### Requirement 2: Floating Compare Bar

**User Story:** As a student, I want a floating bar at the bottom of the screen showing how many colleges I have selected, so that I can see my selection at a glance and launch the comparison view.

#### Acceptance Criteria

1. WHEN the Comparison_Selection contains 1 or more colleges, THE Results_Page SHALL render the Floating_Compare_Bar fixed to the bottom of the viewport.
2. THE Floating_Compare_Bar SHALL display the label "Compare (N)" where N is the current count of colleges in the Comparison_Selection.
3. THE Floating_Compare_Bar SHALL render a "Compare" action button that is enabled only when the Comparison_Selection contains 2 or 3 colleges.
4. WHEN the Comparison_Selection contains exactly 1 college, THE Floating_Compare_Bar SHALL display a hint such as "Select 1 or 2 more to compare" and the "Compare" button SHALL be visually disabled.
5. WHEN the student clicks the enabled "Compare" button, THE App SHALL transition the view to the College_Comparison_Page, passing the Comparison_Selection as navigation state.
6. THE Floating_Compare_Bar SHALL render a "Clear" button that removes all colleges from the Comparison_Selection and hides the bar.
7. WHEN the Comparison_Selection is empty, THE Floating_Compare_Bar SHALL NOT be rendered in the DOM.
8. THE Floating_Compare_Bar SHALL be rendered above the page scroll content (z-index above cards) and SHALL NOT obscure the last college card when the student scrolls to the bottom of the results list; the Results_Page SHALL add sufficient bottom padding to compensate.

---

### Requirement 3: Maximum Selection Enforcement

**User Story:** As a student, I want to be told when I have reached the 3-college comparison limit, so that I understand why I cannot add more colleges.

#### Acceptance Criteria

1. THE Comparison_Selection SHALL hold a maximum of 3 `CollegeRecommendation` objects at any time.
2. WHEN the student attempts to add a 4th college, THE Results_Page SHALL display a Comparison_Toast with the message "You can compare up to 3 colleges at a time."
3. THE Comparison_Toast SHALL be visible for 3 seconds and then automatically dismiss.
4. WHEN the Comparison_Selection is at capacity (3 colleges), THE Compare_Checkbox on all unselected College_Cards SHALL render in a visually disabled state to signal that no more selections are possible.
5. WHEN the student removes a college from the Comparison_Selection, THE Compare_Checkbox on all previously disabled unselected cards SHALL return to an enabled state.

---

### Requirement 4: Comparison Table Layout

**User Story:** As a student, I want to see my selected colleges displayed side by side in a table, so that I can directly compare their key metrics without switching between cards.

#### Acceptance Criteria

1. THE College_Comparison_Page SHALL render a Comparison_Table with one column per selected college (2 or 3 columns) and one Comparison_Row per metric.
2. THE Comparison_Table SHALL include the following Comparison_Rows in order: College Name + Type, Location / District, Branch, Cutoff Percentile (most recent year), Cutoff Trend, Admission Band + Probability Range, Fees, Seats, Avg Package, Highest Package, ROI Score, Round 2 Opportunity.
3. THE Comparison_Table SHALL render a sticky header row containing each college's name so the student can identify columns while scrolling vertically through the rows.
4. WHEN a metric value is absent or null for a college (e.g. no placement data), THE Comparison_Table SHALL display "—" in that cell rather than leaving it blank or crashing.
5. THE Comparison_Table SHALL be horizontally scrollable on screens narrower than the combined column width, so that no column is clipped or hidden on mobile devices.
6. THE Comparison_Table SHALL highlight the cell with the best value in each quantitative row (highest Avg Package, lowest Cutoff Percentile, highest ROI Score, highest admission probability) using a distinct accent colour, so the student can identify the leading college per metric at a glance.

---

### Requirement 5: Comparison Row — Cutoff Percentile and Trend

**User Story:** As a student, I want to see each college's most recent cutoff percentile and trend direction in the comparison table, so that I can assess how competitive each college is and whether it is getting harder or easier to get in.

#### Acceptance Criteria

1. THE Comparison_Row for "Cutoff Percentile" SHALL display the `cutoffPercentile` value from the `CollegeRecommendation` formatted to one decimal place (e.g. "87.3").
2. THE Comparison_Row for "Cutoff Trend" SHALL display the Cutoff_Trend_Indicator symbol: "↑" for "rising", "↓" for "falling", and "→" for "stable", derived from the `cutoffTrend` field.
3. THE Cutoff_Trend_Indicator SHALL be coloured: red/rose for "rising" (harder to get in), emerald/green for "falling" (easier to get in), and neutral grey/blue for "stable", consistent with the College_Card trend indicator styling.
4. WHEN `cutoffTrend` is absent from the `CollegeRecommendation`, THE Comparison_Row SHALL display "—" for the trend cell.

---

### Requirement 6: Comparison Row — Admission Band and Probability

**User Story:** As a student, I want to see the ML admission band and probability range for each college in the comparison table, so that I can compare my chances across all selected colleges in one view.

#### Acceptance Criteria

1. WHEN `admissionBand` is present in the `CollegeRecommendation`, THE Comparison_Row for "Admission Band" SHALL display the band label ("Safe", "Likely", "Moderate", or "Risky") with the same colour palette used in the College_Card.
2. WHEN `admissionProbabilityP10` and `admissionProbabilityP90` are present, THE Comparison_Row SHALL display the probability range formatted as "{P10}–{P90}% chance" alongside the band label.
3. WHEN `admissionBand` is absent (ML fallback mode), THE Comparison_Row SHALL display the `admissionChance` label ("High", "Medium", or "Low") with no probability range.
4. THE Comparison_Table SHALL highlight the cell with the highest `admission_probability` (or highest `admissionChance` rank in fallback mode) in the "Admission Band" row using the best-value accent colour defined in Requirement 4.

---

### Requirement 7: Comparison Row — ROI Score

**User Story:** As a student, I want to see a return-on-investment score for each college in the comparison table, so that I can evaluate which college offers the best career outcome relative to its cost.

#### Acceptance Criteria

1. THE Comparison_Row for "ROI Score" SHALL display the ROI_Score computed as `avg_package (LPA) ÷ annual_fees (LPA)`, formatted to two decimal places (e.g. "2.34").
2. WHEN `avgPackage` is null or `fees` is absent or zero, THE Comparison_Row SHALL display "—" for the ROI Score cell rather than attempting the division.
3. THE Annual_Fees used in the ROI_Score computation SHALL be derived by parsing the numeric value from the `fees` string field; WHEN the `fees` string represents a total programme cost (4-year), THE system SHALL divide by 4 to obtain the annual figure.
4. THE Comparison_Table SHALL highlight the cell with the highest ROI_Score using the best-value accent colour defined in Requirement 4.

---

### Requirement 8: Comparison Row — Round 2 Opportunity

**User Story:** As a student, I want to see whether each college has a Round 2 opportunity in the comparison table, so that I can factor this into my strategy across all compared colleges at once.

#### Acceptance Criteria

1. THE Comparison_Row for "Round 2 Opportunity" SHALL display a "Yes" badge when `round2Opportunity` is `true` and a "No" badge when `round2Opportunity` is `false` or absent.
2. THE "Yes" badge SHALL use a teal or cyan accent colour consistent with the Round2_Badge style used in the College_Card.
3. THE "No" badge SHALL use a neutral grey colour.

---

### Requirement 9: Best Pick Recommendation

**User Story:** As a student, I want a "Best Pick" recommendation at the bottom of the comparison page that tells me which college offers the best balance of admission chance and placement outcome for my percentile, so that I have a clear starting point for my decision.

#### Acceptance Criteria

1. THE College_Comparison_Page SHALL render a Best_Pick_Card below the Comparison_Table.
2. THE Best_Pick_Card SHALL identify the college with the highest Weighted_Score as the recommended college, where Weighted_Score = `(admission_probability × 0.5) + (Normalized_Avg_Package × 0.3) + (Normalized_Prestige_Score × 0.2)`.
3. THE Best_Pick_Card SHALL display the message: "Based on your percentile and these colleges, [College Name] offers the best balance of admission chance and placement outcome." followed by a one-line explanation of the dominant reasons (e.g. "Highest admission probability" or "Best placement + safer admission chance"). The raw Weighted_Score number SHALL NOT be shown to students.
4. WHEN `admission_probability` is not available (ML fallback), THE system SHALL substitute the approximated value: 0.85 for "High", 0.50 for "Medium", 0.15 for "Low".
5. WHEN `avgPackage` is null for all colleges in the Comparison_Selection, THE Weighted_Score SHALL be computed using only the admission probability and prestige score components, re-weighted as `(admission_probability × 0.7) + (Normalized_Prestige_Score × 0.3)`.
6. WHEN `avgPackage` is null for some but not all colleges, THE Normalized_Avg_Package for colleges with null `avgPackage` SHALL be treated as 0 in the Weighted_Score formula.
7. WHEN two or more colleges share the highest Weighted_Score (within a tolerance of 0.001), THE Best_Pick_Card SHALL display the tied college names and the message "These colleges are equally matched — consider your preferred location or branch."
8. THE Best_Pick_Card SHALL use a visually prominent style (e.g. a gradient border or highlighted background) that distinguishes it from the Comparison_Table above it.

---

### Requirement 10: Back Navigation and State Preservation

**User Story:** As a student, I want a "Back to Results" button on the comparison page, so that I can return to my results list with my comparison selection intact.

#### Acceptance Criteria

1. THE College_Comparison_Page SHALL render a "Back to Results" button in a fixed or sticky header position so it is accessible without scrolling.
2. WHEN the student clicks "Back to Results", THE App SHALL transition the view back to Results_Page and SHALL preserve the Comparison_Selection so the student's checkboxes remain checked.
3. THE App SHALL preserve the `colleges` array, `portalType`, and the original `RecommendationRequest` in state so that returning to Results_Page does not require a new API call.
4. THE College_Comparison_Page SHALL also render a "Home" button alongside "Back to Results" that navigates to the HomePage and clears the Comparison_Selection, consistent with the navigation pattern in Results_Page and College_Detail_Page.
5. WHEN the student navigates Home from the College_Comparison_Page, THE Comparison_Selection SHALL be cleared.

---

### Requirement 11: State-Based Navigation Integration

**User Story:** As a frontend developer, I want the App component to manage the College_Comparison_Page as a new navigation state, so that the comparison page integrates cleanly with the existing state-based routing without introducing React Router.

#### Acceptance Criteria

1. THE App SHALL extend its navigation state to include a `'college-comparison'` view alongside the existing `'home'`, `'portal'`, `'results'`, and `'college-detail'` views.
2. WHEN the navigation state is `'college-comparison'`, THE App SHALL render the College_Comparison_Page component and SHALL pass the Comparison_Selection array and `onBack` callback as props.
3. THE App `onBack` callback passed to College_Comparison_Page SHALL set the navigation state back to `'results'` and SHALL NOT clear the `colleges` array, the original `RecommendationRequest`, or the Comparison_Selection.
4. THE App SHALL store the Comparison_Selection in a dedicated state variable (e.g. `comparisonSelection`) that persists across navigation between `'results'` and `'college-comparison'` views.
5. WHEN the navigation state is `'college-comparison'`, THE App SHALL NOT render the Results_Page, HomePage, MhtCetPortal, or College_Detail_Page components simultaneously.

---

### Requirement 12: Responsive Layout and Visual Consistency

**User Story:** As a student on a mobile device, I want the comparison page to be usable on small screens, so that I can compare colleges on my phone.

#### Acceptance Criteria

1. THE College_Comparison_Page SHALL use a horizontally scrollable Comparison_Table on screens narrower than the combined column width, with the metric label column pinned (sticky) on the left so it remains visible while the student scrolls horizontally.
2. THE Floating_Compare_Bar SHALL be rendered above the bottom navigation safe area on mobile devices and SHALL NOT be obscured by browser chrome.
3. THE College_Comparison_Page SHALL maintain visual consistency with the existing dark glassmorphism design system: same Tailwind CSS utility classes, Framer Motion animation patterns, and backdrop-blur card styles used in Results_Page and College_Detail_Page.
4. THE Best_Pick_Card SHALL be fully visible without horizontal scrolling on all screen sizes, including screens as narrow as 320px.
5. ALL interactive elements on the College_Comparison_Page (buttons, checkboxes, badges) SHALL have accessible labels so that screen reader users can identify their purpose.
