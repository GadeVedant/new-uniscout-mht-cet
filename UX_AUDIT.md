# UniScout — UX & Technical Audit
Last updated: 24 August 2026

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
| Enter percentile, get instant realistic college list | ✅ Works | — |
| Understand why a college is Safe / Risky | ⚠️ Partial | SHAP factors only show when sample_size > threshold |
| Compare multiple colleges side by side | ✅ Works | — |
| See cutoff trend — is this college getting harder? | ✅ Works | Now shows all 3 CAP rounds with tab switcher |
| Know the fees before applying | ⚠️ Partial | Only 66% colleges have fee data; shows "Not reported" |
| Build a preference list for the DTE portal | ✅ Works | — |
| Copy / download the list for the portal | ✅ Works | WhatsApp share also added |
| Round 2 strategy — should I freeze or float? | ✅ Works | Per-college data via round2Delta |
| Navigate back without losing results | ✅ Fixed | sessionStorage persistence |
| Use on mobile phone | ✅ Fixed | Bottom sheet dropdowns, full-width buttons |
| Know if the predictor is reliable / how old is the data | ✅ Fixed | /how-it-works methodology page |
| Convert rank to percentile | ✅ Fixed | Inline converter in MhtCetPortal |

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
**Problem:** ~~User selects "Artificial Intelligence" from the multiselect but the data has "artificial intelligence and data science" and "artificial intelligence and machine learning". There is no alias for plain "artificial intelligence". Results may be empty or miss colleges.~~
**Status: ✅ Fixed (August 2026)** — Removed the over-broad `'artificial intelligence'` catch-all key from `BRANCH_ALIASES` in both `recommendationService.ts` and `formFillingService.ts`. This key was causing AiDS ↔ AiML cross-matching (each other's colleges appearing in wrong results). AiDS and AiML now have their own independent alias lists.

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
✅ **Fixed (TASK-25)** — `assignTier` now uses `CATEGORY_DREAM_WINDOW`: SC/ST get ±12, OBC/NT ±7, Open/EWS/TFWS ±5.

### MED-02 — ResultsPage: "Download PDF" opens a new tab instead of downloading
✅ **Fixed (TASK-19)** — Both ResultsPage and PreferenceList now use blob URL + `window.open` with a mobile fallback direct-download link. No `document.write`.

### MED-03 — No indication that fees data is missing vs "₹0"
✅ **Fixed (TASK-18)** — CollegeCard and CollegeDetailPage show "Not reported" with a tooltip for missing fee data.

### MED-04 — Cutoff history chart shows only 1 point for new branches
✅ **Fixed** — Single-point message now reads: "This branch was introduced in {year}. Cutoff trend will build over time."

### MED-05 — Smart Form: "All Maharashtra" toggle and individual district selection can conflict
✅ **Fixed (TASK-13)** — Clicking a specific district after All is selected deselects All and adds just that district.

### MED-06 — No college NAAC/NBA accreditation data shown
⏳ **Deferred (TASK-17)** — Requires manual data collection from AICTE/DTE portal.

### MED-07 — Round 2 Strategy tab only shows generic content, not college-specific
✅ **Fixed (TASK-21)** — StrategyTab fetches per-college round2Delta from the live API; round2Probability computed per college.

### MED-08 — PreferenceList PDF doesn't include admission probability or AI band
✅ **Fixed (TASK-19)** — PDF now includes `admissionBand` and `admissionProbability` (shown as "Win %") columns.

---

## Low-Priority / Polish Issues

### LOW-01 — Stats on HomePage are hardcoded and outdated
✅ **Fixed** — `HomePage` now hydrates stats from `/api/health` on mount. Falls back to hardcoded defaults if the API is cold.

### LOW-02 — "Sponsored by A.G.O" text looks unprofessional
✅ **Fixed (TASK-24)** — Changed to "An initiative by A.G.O Innovations" directly below the UNISCOUT title.

### LOW-03 — MhtCetPortal shows Academic Year as 2025 but data goes to 2025-26
✅ **Fixed** — ResultsPage year chip now reads "CAP 2025–26" instead of just "2025-26".

### LOW-04 — Comparison page: Back button wording inconsistent
✅ **Fixed (TASK-04/TASK-11)** — Standardized to "Back to Results".

### LOW-05 — No favicon or app manifest for PWA
✅ **Fixed (TASK-20)** — `public/manifest.json` added with app name, icons, theme color.

### LOW-06 — CollegeDetailPage "Your percentile" derived incorrectly when navigated from Smart Form
✅ **Verified correct** — Both `recommendationService` and `formFillingService` set `percentileDifference = studentPercentile − cutoffPercentile`, so `cutoffPercentile + percentileDifference` correctly recovers the student percentile in all navigation paths.

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
| Rank → Percentile converter | ✅ | ✅ | ✅ | ✅ |
| Mobile-optimized dropdowns | ✅ | ✅ | ✅ | ✅ |
| NAAC/Accreditation data | ❌ | ✅ | ❌ | ✅ |
| Methodology transparency | ✅ | ✅ | ✅ | ✅ |

---

## Missing Features Students Will Ask For

1. ~~**Rank → Percentile converter**~~ — ✅ Done (TASK-14)
2. **Save / bookmark colleges** — no user accounts means nothing is saved between sessions.
3. ~~**WhatsApp share**~~ — ✅ Done (TASK-16)
4. ~~**NEET/JEE predictor placeholders**~~ — ✅ Done (TASK-15, Notify Me form on Coming Soon pages)
5. ~~**Multi-year comparison**~~ — ✅ Done (TASK-22, Round I/II/III tab switcher)

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

- [x] **TASK-14** Rank → Percentile converter — add a small utility tool: input a rank (CRL), output approximate percentile. Formula: `percentile = (1 - rank / total_candidates) * 100`. Total candidates (~4.5L) can be hardcoded.

- [x] **TASK-15** "Notify me" on SOON portals — replace the Coming Soon page with a form that captures email/phone for JEE/NEET. Saves to Google Sheets via Apps Script (already used for feedback).

- [x] **TASK-16** WhatsApp share button — on ResultsPage and PreferenceList, add a share button that generates a text summary and opens `wa.me` with a pre-filled message.

- [ ] **TASK-17** NAAC grade data — scrape or manually add NAAC grade for the 107 colleges on the sitemap. Display in CollegeInfoSection and CollegeCard expanded view.

- [x] **TASK-18** "Not reported" instead of "N/A" for fees — update CollegeCard and CollegeDetailPage to show "Not reported" with a tooltip for missing fee data.

- [x] **TASK-19** Real PDF download — replace the `window.open + print` hack with a proper PDF using `jspdf` + `html2canvas` or a server-side endpoint. On mobile the current approach doesn't work.
  > Both PreferenceList and ResultsPage now use blob URL + `window.open` (desktop) with mobile fallback direct download. No `document.write`.

- [x] **TASK-20** Add PWA manifest — create `public/manifest.json` with app name, icons, and theme color. Add `<link rel="manifest">` to index.html.

- [x] **TASK-21** Round 2 strategy tab — populate with per-college data from `round2Delta` and historical R1→R2 drops instead of generic content.

- [x] **TASK-22** Multi-year cutoff comparison — on CollegeDetailPage, added Round I / II / III tabs to `CutoffHistorySection`. Each tab lazy-fetches its own cutoff history on first click.

- [x] **TASK-23** Methodology / transparency page — added `/how-it-works` route with `MethodologyPage` component explaining LightGBM model, training data, MAE (4.3 pts), band definitions, data sources, and limitations. Linked from ResultsPage header, Navbar, and footer.

- [x] **TASK-24** Fix "Sponsored by A.G.O" in hero — changed to "An initiative by A.G.O Innovations".

- [x] **TASK-25** Category-adjusted dream tier in FormFillingService — use the already-computed category discount to adjust the threshold for dream picks (currently fixed at -5 regardless of category).

---

## Bug-Fix Session — August 2026

The following bugs were identified via full code audit and fixed in this session. All builds verified clean (exit 0) after each batch of fixes.

### District / Location Filtering (High)
- **`recommendationService.ts`** — `matchesLoc` used `field.includes(term)` as a last-resort fallback, causing short district names (e.g. "Nashik") to match unrelated location strings. Replaced with `matchesLocTerm` using strict word-boundary matching (exact, prefix, suffix, interior-word only).
- **`recommendationService.ts`** — Category supplemental (Open-category fallback for reserved categories) queried the whole-state dataset with no location filter. Now applies the same `matchesLocTerm` district check.
- **`formFillingService.ts`** — Same `field.includes(d)` over-matching bug in the district filter. Fixed with the same word-boundary helper.
- **`recommendationService.ts` sort step** — `aInLoc`/`bInLoc` priority sort also used `.includes(l)`. Fixed to use `matchesLocTerm`.

### Branch Matching (High)
- **Both `recommendationService.ts` and `formFillingService.ts`** — The `'artificial intelligence'` catch-all key in `BRANCH_ALIASES` mapped to both AiDS and AiML aliases, causing cross-matching. Key removed; each branch now has its own independent alias list.

### Cutoff Trends & Round 2 Strategy (High)
- **`cutoffTrendService.ts`** — Used `getAllColleges()` (deduped to one year) instead of `getAllYearsData()`. Cutoff trend was always `'stable'` and `round2Opportunity` always `false`.
- **`strategyService.ts`** — All four methods (`computeHistoricalAvgDelta`, `computeCategoryAvgDelta`, `computeRound2Opportunities`, `computeMissedColleges`) used `getAllColleges()`. All Round 2 strategy outputs were always empty/default.
- **`strategyService.ts`** — Historical delta computation only included years where cutoff dropped (`r1 > r2`), skewing averages upward. Now includes all paired years for an unbiased mean.

### Results Page (High/Medium)
- **Fees sort** — `parseFloat("₹1,20,000")` returns `NaN`; sort order was undefined. Now strips non-numeric chars before parsing.
- **Stats double-count** — `stats.b3` used `'Medium'` (same as `b2`) when ML unavailable, double-counting Medium colleges. Fixed to use `'Low'` for `b3` in non-ML mode.
- **PDF print** — `URL.revokeObjectURL` was called immediately after `win.print()`, causing blank print dialogs in Firefox/Safari. Now revoked 1 s after print.
- **"All Maharashtra" selection** — `onChange` handler in `MhtCetPortal.tsx` could silently drop the `ALL` selection on subsequent MultiSelect interactions. Fixed with explicit branch conditions.

### Strategy Controller (Medium)
- **`strategyController.ts`** — `colleges` array from request body accepted without validation; malformed items (null, missing fields) caused unhandled TypeErrors (500 instead of 400). Now filters items against a minimum shape check.

### Smart Form Filling (High/Medium)
- **GOPENS category fallback** — When no reserved-category data exists, the service silently returned Open cutoffs to SC/ST/OBC users. Now sets `categoryFallback: true` in the response; controller propagates `category_fallback` in metadata.
- **Budget filter unit mismatch** — Fees stored as decimal LPA values (e.g. `1.5`) were divided by 100,000 again, making them pass any budget. Added a sanity check for values < 100.
- **Input validation** — `budget` (must be ≥ 0) and `priorityMode` (must be `'college'` or `'branch'`) were not validated. Added guards in `formFillingController.ts`.
- **Currency icon** — `DollarSign` replaced with `IndianRupee` on the budget field.
- **Silent retry delay** — Empty-result retry waited 6 s with no feedback. Added `isRetrying` state and a "retrying…" banner.
- **Round I disclosure** — No visible note that the preference list is optimised for Round I. Added info banner above the submit section.

### College Comparison (High/Medium)
- **`onBack`/`onHome` props** — Declared in the interface but destructuring ignored them; parent navigation was silently broken. Fixed; Back button now calls `onBack` prop with `navigate('/results')` fallback.
- **`computeBestPick([])`** — Called before the empty-state guard; could crash on empty input. Moved after the `hasCols` check.

### Strategy Tab (High)
- **AbortController not wired** — `controller.signal` was created but never passed to `fetch`. The 10 s timeout showed a UI error but the HTTP request continued running. Fixed by adding `signal?: AbortSignal` to `api.getRound2Strategy` and threading it through.

### College Card (Medium)
- **`admissionProbability === 0` hidden** — The `> 0` guard treated a legitimate near-zero ML prediction (e.g. 1% rounded to 0) as "no ML data", hiding the probability bar. Changed to `!= null`.

**What was shipped in previous session (TASK-14 to TASK-25):**
- TASK-14: Rank → Percentile converter inline in MhtCetPortal (collapsible helper)
- TASK-15: Notify Me email capture on all Coming Soon portal pages
- TASK-16: WhatsApp share buttons on ResultsPage and PreferenceList floating bar
- TASK-18: "Not reported" with tooltip for missing fee data (CollegeCard + CollegeDetailPage)
- TASK-19: Blob-based PDF download with mobile fallback in both ResultsPage and PreferenceList
- TASK-20: PWA manifest.json with icons and theme color
- TASK-21: Round 2 strategy tab populated via live API data (per-college round2Delta)
- TASK-22: Multi-round cutoff comparison tabs (I/II/III) in CollegeDetailPage — lazy-fetched per tab
- TASK-23: `/how-it-works` methodology page — LightGBM pipeline, band definitions, data sources, limitations, FAQ. Linked from Navbar, ResultsPage header, and footer.
- TASK-24: "An initiative by A.G.O Innovations" in hero (not "Sponsored by A.G.O")
- TASK-25: Category-adjusted dream tier window in FormFillingService (SC/ST get wider window)
