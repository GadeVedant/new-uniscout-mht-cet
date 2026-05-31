# UniScout SEO Status
Last updated: 31 May 2026

---

## ✅ COMPLETED

### Domain & Hosting
- [x] Domain purchased: `uniscout.co.in`
- [x] Connected to Render static site
- [x] Canonical domain set to `www.uniscout.co.in` (Render serves www as primary, non-www redirects to www)
- [x] CORS updated on backend to `https://www.uniscout.co.in`
- [x] All codebase references updated from `uniscout.in` → `www.uniscout.co.in`

### SPA Routing Fix
- [x] **31 May 2026** — Fixed 404 on direct URL access (e.g. `/mht-cet`, `/smart-form`)
  - Root cause: Render static sites do not process `_redirects` (Netlify-only format)
  - Fix applied: Build command updated to `npm install && npm run build && cp build/index.html build/404.html`
  - Render serves `404.html` for unmatched routes, React Router handles client-side routing
  - **Note:** HTTP response code is 404 (not 200) for these routes — this is a known Render limitation

### Google Search Console
- [x] Property added: `https://www.uniscout.co.in` (URL prefix type)
- [x] Sitemap submitted: `https://www.uniscout.co.in/sitemap.xml`
- [x] Sitemap processed successfully — 113 pages discovered (107 college pages + 6 static)
- [x] Both sub-sitemaps showing Status: Success
  - `sitemap-static.xml` — 6 URLs
  - `sitemap-colleges.xml` — 107 URLs

### Sitemap & robots.txt
- [x] `sitemap.xml` — sitemap index pointing to both sub-sitemaps
- [x] `sitemap-static.xml` — 6 key pages with correct priorities
- [x] `sitemap-colleges.xml` — 107 college pages
- [x] `robots.txt` — correct allow/disallow rules, sitemap URL updated

### On-Page SEO — Titles & Meta Descriptions
- [x] Homepage (`/`) — "MHT CET College Predictor 2025" as primary keyword
- [x] MHT CET page (`/mht-cet`) — year + specifics in title
- [x] Smart Form page (`/smart-form`) — "CAP Form Filling 2025"
- [x] College detail pages — dynamic title with college name, branch, cutoff, year
- [x] College detail canonical URL set per page (`/college/:id`)
- [x] `index.html` static title updated for pre-JS crawling
- [x] OG tags updated in `index.html`

### Structured Data
- [x] `WebSite` schema with `SearchAction` — in `index.html`
- [x] `WebApplication` schema — in `index.html`
- [x] `ItemList` schema (exam predictors) — in `index.html`
- [x] `FAQPage` schema — on homepage
- [x] `WebPage` + `HowTo` + `FAQPage` schemas — on `/mht-cet`
- [x] `WebPage` + `FAQPage` schemas — on `/smart-form`
- [x] `CollegeOrUniversity` + `EducationalOrganization` + `BreadcrumbList` — on all college detail pages
- [x] Dynamic `FAQPage` schema per college (cutoff, fees, seats, placement, probability)

### Performance SEO
- [x] **31 May 2026** — Bundle split from 891KB → 192KB main chunk
  - `vendor-react`: 180KB (React core)
  - `vendor-charts`: 393KB (Recharts — lazy loaded, only on college detail)
  - `vendor-motion`: 89KB (Framer Motion)
  - `vendor-radix`: 24KB (Radix UI)
  - `vendor-icons`: 17KB (Lucide)
- [x] **31 May 2026** — Lazy loading for all routes (reduces unused JS on homepage)
- [x] **31 May 2026** — Heading order fixed (h1 → h2, no skipped levels)
- [x] **31 May 2026** — OG image created and optimized (62KB JPEG, 1200×630)
- [x] PageSpeed Insights scores: Performance 92, Accessibility 98, Best Practices 100, SEO 100

### Content SEO
- [x] Dynamic FAQ accordion on every college detail page (5 questions per college)
- [x] `SimilarColleges` internal linking already in place on college detail pages

### Search Engines
- [x] Google Search Console — property verified, sitemap submitted, 113 pages discovered
- [x] Bing Webmaster Tools — property added, sitemap submitted

---

## ⚠️ KNOWN ISSUES

### SPA Routes Return HTTP 404
- **Issue:** Direct navigation to `/mht-cet`, `/smart-form`, `/college/:id` etc. returns HTTP 404 status code
- **Impact:** Google Search Console URL Inspection shows "Page cannot be indexed: Not found (404)" for these routes
- **Root cause:** Render static sites have no server-side rewrite capability without a paid plan or custom server
- **Current workaround:** `404.html` trick — page loads correctly in browser, React Router handles routing
- **Google's actual behavior:** Googlebot does execute JavaScript and can index SPA content despite 404 status, but it's not guaranteed
- **Proper fix options:**
  1. Upgrade to Render paid plan (enables rewrite rules in dashboard)
  2. Migrate frontend to a Node.js web service on Render (can serve 200 for all routes)
  3. Use Cloudflare Pages (free, supports `_redirects` natively)
  4. Add Cloudflare as a proxy with a Page Rule to rewrite to `/index.html`
- **Status:** Deferred — monitoring indexing over next 2-4 weeks

### Search Console Indexing Rejection
- **31 May 2026, ~00:12 IST** — URL Inspection for `https://www.uniscout.co.in/mht-cet` rejected with "Page cannot be indexed: Not found (404)"
- **Affected pages:** `/mht-cet`, `/smart-form`, `/jee-college-predictor`, all `/college/:id` pages
- **Only page returning 200:** `https://www.uniscout.co.in/` (homepage)
- **Action taken:** Requested indexing for homepage only
- **Next check:** Re-test in Search Console after 1-2 weeks to see if Googlebot indexed via JS rendering

---

## 🔲 REMAINING — On-Page SEO

- [ ] JEE/NEET/CAT landing page titles and descriptions audit (when pages are built out)

## 🔲 REMAINING — Performance SEO

- [ ] Re-run PageSpeed Insights after lazy loading deploy to confirm improvement

## 🔲 REMAINING — Content SEO

- [ ] Blog/guide content (future — "MHT CET CAP Round 2 strategy 2025" etc.)

## 🔲 REMAINING — Monitoring

- [ ] Check Search Console Pages report ~14 June 2026 for indexed count
- [ ] Set up Search Console email alerts for coverage issues

---

## Infrastructure Reference

| Service | URL | Platform |
|---------|-----|----------|
| Frontend | `www.uniscout.co.in` | Render Static Site |
| Backend API | `uniscout-backend.onrender.com` | Render Web Service |
| ML Service | `uniscout-ml-226x.onrender.com` | Render Web Service |
| Feedback | Google Apps Script | Google Sheets |

**Render build command:**
```
npm install && npm run build && cp build/index.html build/404.html
```
