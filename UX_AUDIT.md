# UniScout — UX & Technical Audit
Last updated: 23 August 2026

---

## How This Was Done

This audit cross-references:
1. **Code review** — every major component (MhtCetPortal, ResultsPage, CollegeCard, CollegeDetailPage, CollegeComparisonPage, SmartFormPage, MhtCetSelector, FormFillingService, RecommendationService, Predictor)
2. **Competitor analysis** — NextStep, CET Buddy, Scaler, Mindzspark, PredictCollege, CETLens
3. **Student mental model** — what a student doing MHT CET CAP counselling actually wants step by step

---

## What Students Expect vs What We Have

| Student expectation | What we have | Gap |
|---------------------|--------------|-----|
| Enter percentile, get instant realistic college list | ✅ Works | ML was broken (now fixed), bands were all "Safe" |
| Understand why a college is Safe / Risky | ⚠️ Partial | SHAP factors only show when sample_size > threshold |
| Compare multiple colleges side by side | ✅ Works | No persistent state across sessions |
| See cutoff trend — is this college getting harder? | ✅ Works | Only on detail page, not visible on card |
| Know the fees before applying | ⚠️ Partial | Only 66% colleges have fee data |
| Build a preference list for the DTE portal | ✅ Works | ML band bug in FormFillingService too (same "optimistic override" issue) |
| Copy / download the list for the portal | ✅ Works | — |
| Round 2 strategy — should I freeze or float? | ✅ Works | Only shown for Round I, not clearly explained |
| Navigate back without losing results | ❌ Bug | Results lost on hard refresh (in-memory session state) |
| Use on mobile phone | ⚠️ Partial | Several layout issues on small screens |
| Know if the predictor is reliable / how old is the data | ⚠️ Weak | Data year shown as a small chip, no methodology explanation |

---

## Critical Bugs (Blockers)

### BUG-01 — FormFillingService has the same "all Safe" ML band bug
**File:** `backend-mhtcet/src/services/formFillingService.ts` lines 174–182
**Problem:** Uses the same "take more optimistic" logic that was fixed in recommendationService.ts but NOT in formFillingService.ts. Every Smart Form result will have inflated bands.
**Fix:** Apply same fix — trust ML band directly, fall back to rule-based only when fallback_reason is set.

### BUG-02 — Results lost on page refresh
**File:** `src/App.tsx` (state management)
**Problem:** All college results, lastQuery, and comparisonSelection live in React state. Hitting F5 or sharing a URL wipes everything. User is redirected to homepage with no explanation.
**Fix:** Persist lastQuery + results to sessionStorage (not localStorage — session scoped is fine).

### BUG-03 — CollegeDetailPage breaks when accessed directly via URL
**File:** `src/components/CollegeDetailPage.tsx` line ~360
**Problem:** `colleges.find(c => c.id === id)` returns undefined on direct URL access since colleges array is empty (state not restored). Returns `<Navigate to="/results" />` which then shows empty results.
**Fix:** Same as BUG-02 — restoring from sessionStorage fixes this.

### BUG-04 — Branch search "Artificial Intelligence" doesn't match data
**File:** `backend-mhtcet/src/services/recommendationService.ts` BRANCH_ALIASES
**Problem:** User selects "Artificial Intelligence" from the multiselect but the data has "artificial intelligence and data science" and "artificial intelligence and machine learning". There is no alias for plain "artificial intelligence". Results may be empty or miss colleges.
**Fix:** Add `'artificial intelligence': ['artificial intelligence and data science', 'artificial intelligence and machine learning']` to BRANCH_ALIASES.

### BUG-05 — Admission probability shows 0% even with valid ML response (before fix deploys)
**File:** `ml-service/app/predictor.py` — _build_input_df
**Status:** Fix committed in PR, pending deploy. Once deployed this resolves.

---

## High-Priority UX Issues

### UX-01 — No loading state when backend is cold-starting
**Where:** Every page that calls the API
**Problem:** Render free tier takes 30–60s to wake up. The user sees a spinner with no explanation. Competitors like NextStep show a message like "Server waking up, this takes ~30 seconds on first load."
**Fix:** After 5s of loading, show a soft banner: "Our server is warming up — this takes about 30 seconds on first visit."

### UX-02 — Results page shows "Admission Probability: 0%" on cards
**Where:** `CollegeCard.tsx` line ~77
**Problem:** When ML returns `admission_probability = 0` (from the error fallback), the card shows `0%` or falls back to a hardcoded value (`band === 'Safe' ? 90 : ...`). This is misleading — students will think they have 90% chance at a college where the ML failed.
**Fix:** When `admissionProbability` is 0 or undefined AND `admissionBand` came from a fallback, show "—" instead of a fabricated number. Add `admissionProbabilityReliable: boolean` flag from backend.

### UX-03 — No explanation of what Safe / Likely / Moderate / Risky means on the results page
**Where:** ResultsPage, CollegeCard
**Problem:** Competitors all show a tooltip or legend explaining the bands. Students from other exams or first-time users don't know what 80%+ means.
**Fix:** Add a small "?" icon next to the band legend in the filter sidebar that shows a tooltip with the probability ranges.

### UX-04 — Smart Form "Copy List" button is missing on mobile
**Where:** `src/components/PreferenceList.tsx`
**Problem:** The copy-to-clipboard button is either hidden or truncated on small screens. Students need this to paste into the DTE portal on mobile.
**Fix:** Ensure Copy List button is always visible and full-width on mobile.

### UX-05 — No "Back to results" from College Detail if accessed from Smart Form list
**Where:** `CollegeDetailPage.tsx`
**Problem:** The back button always does `navigate(-1)`. If a student came from the Smart Form preference list and navigates to a college detail, the back button correctly returns. But if they open a college detail from a direct link, back goes to the wrong place.
**Fix:** Read the referrer from location.state to decide where back should go. Default to `/results` if no referrer.

### UX-06 — Comparison page Back button goes to homepage, not results
**Where:** `CollegeComparisonPage.tsx` line ~48
**Problem:** Button says "Back to Main Page" and `navigate('/')`. User expects it to go back to the results list.
**Fix:** Change to `navigate(-1)` or `navigate('/results')`.

### UX-07 — College selector page has misleading stats ("95% Accuracy Rate", "50,000+ Students Helped")
**Where:** `MhtCetSelector.tsx` StatBadge components
**Problem:** These are hardcoded marketing numbers with no basis. If a student questions this, trust is broken. Competitors like CETLens explicitly note accuracy limitations.
**Fix:** Either remove these stats or replace with real numbers (386 colleges, 93k records, 4 years of data).

### UX-08 — No error state when recommendation API returns 0 results
**Where:** `ResultsPage.tsx`
**Problem:** If the API call succeeds but returns 0 colleges (e.g., very low percentile + niche branch + small district), the user sees an empty filter panel with no message explaining why.
**Fix:** Show a "No colleges found" message with suggestions: "Try All Maharashtra or selecting a broader branch".

### UX-09 — Mobile: MultiSelect dropdown in MhtCetPortal is hard to use
**Where:** `MhtCetPortal.tsx` MultiSelect component
**Problem:** On mobile, the dropdown opens downward and can go off-screen. The search box inside is hard to focus on small screens. No "Done" button to close the dropdown.
**Fix:** On mobile, use a bottom sheet or full-screen modal instead of a dropdown. Add a "Done" button.

### UX-10 — Cutoff shown as "45.32%ile" — students don't understand percentile vs rank
**Where:** `CollegeCard.tsx`, `CollegeDetailPage.tsx`
**Problem:** MHT CET students often confuse percentile and rank. A 45 percentile student might think the 45.32 cutoff is close when they're actually far below most colleges. No explanation of what this number means.
**Fix:** Add a tooltip: "Closing percentile from last year's CAP Round I. Students below this cutoff have < 50% chance."

---

## Medium-Priority Issues

### MED-01 — FormFillingService: "dream" tier threshold is too restrictive
**File:** `formFillingService.ts` `assignTier` function
**Problem:** Dream = diff >= -5 (student must be within 5 percentile points of cutoff). For SC/ST categories where cutoffs can be 20–30 points below Open, a student at 60 percentile may see zero dream picks for colleges with 70 percentile Open cutoffs, even though SC cutoff is ~55 and they're actually close.
**Fix:** Use category-adjusted cutoff for tier assignment, not raw cutoff.

### MED-02 — ResultsPage: "Download PDF" opens a new tab instead of downloading
**File:** `ResultsPage.tsx` handleDownloadPDF
**Problem:** `window.open()` with `win.print()` opens a print dialog in a new tab. On mobile this either does nothing or opens a confusing print UI. Students want a PDF file.
**Fix:** Use `html2canvas` + `jspdf` to generate a real PDF download, or use a server-side endpoint.

### MED-03 — No indication that fees data is missing vs "₹0"
**Where:** CollegeCard, CollegeDetailPage
**Problem:** Colleges with no fee data show "N/A". But 34% of colleges have no fee data. Students may assume these are free or filter them out mentally.
**Fix:** Show "Not reported" instead of "N/A" with a tooltip explaining where fee data comes from.

### MED-04 — Cutoff history chart shows only 1 point for new branches
**Where:** `CollegeDetailPage.tsx` CutoffHistorySection
**Problem:** For branches added after 2023, the chart shows a single data point with a message. This is handled, but the message is unclear.
**Fix:** Change message to: "This branch was introduced in 2025. Cutoff trend will build over time."

### MED-05 — Smart Form: "All Maharashtra" toggle and individual district selection can conflict
**Where:** `SmartFormPage.tsx`
**Problem:** If a user selects "All Maharashtra" and then clicks a specific district, the All toggle stays selected. The form can be in an ambiguous state.
**Fix:** Clicking any specific district after "All Maharashtra" is selected should deselect the All toggle and add just that district.

### MED-06 — No college NAAC/NBA accreditation data shown
**Problem:** Competitors (NextStep) show accreditation. Students and parents care deeply about NAAC grade.
**Fix:** Add NAAC grade to college data (can be scraped from AICTE/DTE portal).

### MED-07 — Round 2 Strategy tab only shows generic content, not college-specific
**Where:** `StrategyTab` component
**Problem:** The Round 2 tab on ResultsPage shows strategy content but it's not tied to the specific colleges in the results. Students expect to see "For Jaidev College, if Round 1 cutoff was 45, Round 2 cutoff is historically 42."
**Fix:** Populate the strategy tab with per-college Round 2 data from the `round2Delta` field already in the data.

### MED-08 — PreferenceList PDF doesn't include admission probability or AI band
**Where:** `ResultsPage.tsx` handleDownloadPDF
**Problem:** The PDF shows the admission chance column but it's derived from the local state. If the user prints after ML data is loaded, the PDF should show the AI probability percentage, not just "Safe".
**Fix:** Include `admissionProbability` percent and `admissionBand` in the PDF table row.

---

## Low-Priority / Polish Issues

### LOW-01 — Stats on HomePage are hardcoded and outdated
**Where:** `HomePage.tsx` stats array
**Problem:** Shows "386+ Colleges" and "93K+ Historical Records" which are correct. But "4 Yrs" is getting stale — should dynamically say the actual year range from data.
**Fix:** Fetch stats from `/api/health` and render dynamically.

### LOW-02 — "Sponsored by A.G.O" text looks unprofessional
**Where:** `HomePage.tsx` hero section
**Problem:** The small "Sponsored by A.G.O" text under the UNISCOUT title reads oddly — a sponsor on your own product page is confusing to users.
**Fix:** Replace with "by A.G.O Innovations" or remove from the hero.

### LOW-03 — MhtCetPortal shows Academic Year as 2025 but data goes to 2025-26
**Where:** `MhtCetPortal.tsx`
**Problem:** After removing the year selector, year is hardcoded to 2025. The API call formats it as "2025-26". If students are looking at 2026 admissions, this may be confusing.
**Fix:** Label the results header as "Based on 2025–26 CAP data" not just "2025".

### LOW-04 — Comparison page: Back button wording inconsistent
**Where:** `CollegeComparisonPage.tsx`
**Problem:** Says "Back to Main Page" — other back buttons say "Back". Inconsistent language.
**Fix:** Standardize to "Back to Results".

### LOW-05 — No favicon or app manifest for PWA
**Where:** `index.html`
**Problem:** The app has no proper PWA manifest. Students may want to add it to home screen on Android.
**Fix:** Add `manifest.json` with icons and `theme_color`.

### LOW-06 — CollegeDetailPage "Your percentile" derived incorrectly when navigated from Smart Form
**Where:** `CollegeDetailPage.tsx` line ~362
```ts
const studentPercentile = college.cutoffPercentile + college.percentileDifference;
```
**Problem:** This math is correct when navigated from the predictor results (where percentileDifference is set). But when navigated from Smart Form, the percentile difference may be calculated differently.
**Fix:** Store the original student percentile in the college recommendation object directly.

---

## Comparison With Competitors

| Feature | Uniscout | NextStep | CET Buddy | Scaler |
|---------|----------|----------|-----------|--------|
| AI admission probability | ✅ | ✅ | ❌ | ❌ |
| CAP Round 2 strategy | ✅ | ✅ | ❌ | ❌ |
| Smart form filling + PDF | ✅ | ✅ | ❌ | ❌ |
| Cutoff history chart | ✅ | ❌ | ✅ | ✅ |
| College comparison | ✅ | ❌ | ❌ | ✅ |
| Session persistence | ✅ | ✅ | ✅ | ✅ |
| Rank → Percentile converter | ❌ | ✅ | ✅ | ✅ |
| Mobile-optimized dropdowns | ✅ | ✅ | ✅ | ✅ |
| NAAC/Accreditation data | ❌ | ✅ | ❌ | ✅ |
| Methodology transparency | ❌ | ✅ | ✅ | ✅ |

---

## Missing Features Students Will Ask For

1. **Rank → Percentile converter** — almost every competitor has this. Students receive a rank, not percentile, after result.
2. **Save / bookmark colleges** — no user accounts means nothing is saved between sessions.
3. **WhatsApp share** — students share their results with parents and friends. A "Share on WhatsApp" button is expected.
4. **NEET/JEE predictor placeholders** — currently shown as "SOON" but clicking them should show a "Notify me" form so we capture leads.
5. **Multi-year comparison** — "What was the cutoff in 2023 vs 2024 vs 2025?" side-by-side is useful for spotting trends.

---

## Implementation Tasks

Tasks are ordered by priority. P1 = fix before next release. P2 = next sprint. P3 = backlog.

---

### P1 — Critical Fixes (Do Before Any Marketing)

- [x] **TASK-01** Fix FormFillingService ML band logic — same "trust ML directly" fix applied to `recommendationService.ts` must be applied to `formFillingService.ts` line 174–182. Remove the "take most optimistic" override.

- [x] **TASK-02** Session persistence — save `lastQuery` + `colleges` array to `sessionStorage` in App.tsx on every update. Restore on mount. Fixes BUG-02 and BUG-03 simultaneously.
  > Already implemented in App.tsx (`setCollegesAndPersist` / `setLastQueryAndPersist`). Verified.

- [x] **TASK-03** Add "Artificial Intelligence" as a branch alias — add to BRANCH_ALIASES in both `recommendationService.ts` and `formFillingService.ts`:
  ```
  'artificial intelligence': ['artificial intelligence and data science', 'artificial intelligence and machine learning']
  ```

- [x] **TASK-04** Fix Comparison page back button — change `navigate('/')` to `navigate('/results')` in `CollegeComparisonPage.tsx`.

- [x] **TASK-05** Merge and deploy the ML predictor fix PR (`fix/ml-prediction-input-columns`) — already committed, needs merge + Render redeploy.

---

### P2 — High-Impact UX (Next Sprint)

- [x] **TASK-06** Cold-start loading message — in `api.ts`, after 5 seconds of a pending request, show a soft banner: "Server warming up (~30s on first request). Please wait..."

- [x] **TASK-07** Admission probability "0%" guard — in `CollegeCard.tsx`, if `admissionProbability === 0` and there's no reliable ML result, show "—" instead of a fake percentage. Add a `fallback_reason` check.

- [x] **TASK-08** Band legend tooltip — add a small "?" icon to the Admission Chance filter section in ResultsPage sidebar with a tooltip explaining: Safe = >80%, Likely = 50–80%, Moderate = 20–50%, Risky = <20%.

- [x] **TASK-09** Empty results message improvement — when 0 colleges are found, show actionable suggestions: "No colleges found. Try: (1) Select All Maharashtra, (2) Choose a broader branch, (3) Increase your percentile range."

- [x] **TASK-10** Mobile MultiSelect — wrap MultiSelect in a bottom sheet on mobile (screens < 640px). Add a "Done" button to close it. Fixes UX-09.

- [x] **TASK-11** Fix "Back to Results" from comparison — already overlaps with TASK-04. Also fix `CollegeDetailPage.tsx` back button to use location.state.from if available.

- [x] **TASK-12** Replace hardcoded MhtCetSelector stats with real data — fetch from `/api/health` endpoint and display actual record counts instead of "50,000+ Students Helped" and "95% Accuracy Rate".

- [x] **TASK-13** Fix Smart Form "All Maharashtra" + specific district conflict — in `SmartFormPage.tsx`, when a specific district is clicked after ALL is selected, deselect ALL and add just that district.

---

### P3 — Backlog

- [ ] **TASK-14** Rank → Percentile converter — add a small utility tool: input a rank (CRL), output approximate percentile. Formula: `percentile = (1 - rank / total_candidates) * 100`. Total candidates (~4.5L) can be hardcoded.

- [ ] **TASK-15** "Notify me" on SOON portals — replace the Coming Soon page with a form that captures email/phone for JEE/NEET. Saves to Google Sheets via Apps Script (already used for feedback).

- [ ] **TASK-16** WhatsApp share button — on ResultsPage and PreferenceList, add a share button that generates a text summary and opens `wa.me` with a pre-filled message.

- [ ] **TASK-17** NAAC grade data — scrape or manually add NAAC grade for the 107 colleges on the sitemap. Display in CollegeInfoSection and CollegeCard expanded view.

- [ ] **TASK-18** "Not reported" instead of "N/A" for fees — update CollegeCard and CollegeDetailPage to show "Not reported" with a tooltip for missing fee data.

- [ ] **TASK-19** Real PDF download — replace the `window.open + print` hack with a proper PDF using `jspdf` + `html2canvas` or a server-side endpoint. On mobile the current approach doesn't work.

- [ ] **TASK-20** Add PWA manifest — create `public/manifest.json` with app name, icons, and theme color. Add `<link rel="manifest">` to index.html.

- [ ] **TASK-21** Round 2 strategy tab — populate with per-college data from `round2Delta` and historical R1→R2 drops instead of generic content.

- [ ] **TASK-22** Multi-year cutoff comparison — on CollegeDetailPage, add a toggle to show cutoffs for all 3 rounds across all 4 years in a single view.

- [ ] **TASK-23** Methodology / transparency page — add a short "How it works" page explaining the LightGBM model, training data, MAE (4.29 percentile points), and known limitations. Link from the results page. Builds trust.

- [ ] **TASK-24** Fix "Sponsored by A.G.O" in hero — change to "by A.G.O Innovations" or move to the footer only.

- [ ] **TASK-25** Category-adjusted dream tier in FormFillingService — use the already-computed category discount to adjust the threshold for dream picks (currently fixed at -5 regardless of category).

---

## Summary

**✅ Completed (TASK-01 through 13):** All P1 blockers and all P2 high-impact UX items are done.
**Next up:** TASK-14 through 25 (P3 backlog — rank converter, WhatsApp share, NAAC data, PDF download, PWA manifest, etc.)

The core product is now in a shippable state. ML bands are correct, session persists across refreshes, mobile dropdowns work properly, and all navigation flows have reliable back buttons. The main remaining gaps before serious marketing: Rank→Percentile converter (TASK-14) and a methodology transparency page (TASK-23).
