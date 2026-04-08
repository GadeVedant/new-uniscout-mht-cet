# UniScout Deployment Guide

## Architecture

```
uniscout.in     → Render Static Site  (React/Vite frontend)  — free
api.uniscout.in → Render Web Service  (Node.js backend)       — free / $7/mo
                  Railway             (Python ML service)     — $5 credit/mo
```

ML service URL: `https://uniscout-ml-production.up.railway.app`

---

## Step 1 — ML Service (Railway) ✅ Already deployed

URL: `https://uniscout-ml-production.up.railway.app/health`

If you need to redeploy:
- Railway → project → ML service → Root Directory: `ml-service`
- Uses `Dockerfile` (includes `libgomp1` for LightGBM)
- Env vars: `ML_MODEL_DIR=./models`, `ML_DATA_DIR=./data`, `TRAINING_ENABLED=false`

---

## Step 2 — Backend on Render

1. Render dashboard → **New → Web Service**
2. Connect repo: `Vedant040201/new-uniscout-mht-cet`
3. Settings:
   - **Root Directory:** `backend-mhtcet`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node --max-old-space-size=450 dist/server.js`
   - **Plan:** Free (spins down after 15min) or $7/mo (always-on)
4. Environment variables:
   ```
   NODE_ENV=production
   DATA_DIR=./data
   ML_SERVICE_URL=https://uniscout-ml-production.up.railway.app
   CORS_ORIGIN=https://uniscout.in
   RATE_LIMIT_MAX_REQUESTS=200
   ```
5. Deploy — loads ~80k records from `./data/` on startup (~30s)
6. Test: `https://uniscout-backend.onrender.com/api/health`

**Custom domain:** Render → Settings → Custom Domains → add `api.uniscout.in`

---

## Step 3 — Frontend on Render (Static Site)

1. Render dashboard → **New → Static Site**
2. Same repo
3. Settings:
   - **Root Directory:** (leave blank)
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
4. Environment variable:
   ```
   VITE_API_URL=https://api.uniscout.in/api
   ```
5. Custom domain: add `uniscout.in` and `www.uniscout.in`

---

## DNS Records

| Type | Name | Value |
|------|------|-------|
| A/CNAME | `@` | Render-provided |
| CNAME | `www` | Render-provided |
| CNAME | `api` | `uniscout-backend.onrender.com` |

---

## After Deploy Checklist

- [ ] `https://uniscout-ml-production.up.railway.app/health` → `model_loaded: true` ✅
- [ ] `https://uniscout-backend.onrender.com/api/health` → `success: true, totalRecords: ~80000`
- [ ] `https://uniscout-frontend.onrender.com` loads homepage
- [ ] MHT-CET predictor returns results with admission bands
- [ ] College detail page shows cutoff history chart
- [ ] Smart Form Filling generates preference list
- [ ] `https://uniscout-frontend.onrender.com/robots.txt` accessible
- [ ] `https://uniscout-frontend.onrender.com/sitemap.xml` accessible

## SEO & Analytics Setup

- [ ] **Google Search Console** — [search.google.com/search-console](https://search.google.com/search-console)
  1. Add property → enter `https://uniscout.in`
  2. Verify ownership (HTML tag or DNS TXT record)
  3. Sitemaps → submit `https://uniscout.in/sitemap.xml`

- [ ] **Bing Webmaster Tools** — [bing.com/webmasters](https://www.bing.com/webmasters)
  1. Add site → `https://uniscout.in`
  2. Submit sitemap: `https://uniscout.in/sitemap.xml`

- [ ] **Google Analytics (GA4)** — [analytics.google.com](https://analytics.google.com)
  1. Create GA4 property for `uniscout.in`
  2. Copy the `gtag.js` snippet and add it to `index.html` before `</head>`

- [ ] **Rich Results Test** — [search.google.com/test/rich-results](https://search.google.com/test/rich-results)
  - Test `https://uniscout.in/` → should detect FAQPage schema
  - Test `https://uniscout.in/jee-college-predictor` → should detect WebPage schema

- [ ] **PageSpeed Insights** — [pagespeed.web.dev](https://pagespeed.web.dev)
  - Check Core Web Vitals for `https://uniscout.in`
  - Target: LCP < 2.5s, CLS < 0.1, INP < 200ms

- [ ] **Connect custom domain** (`uniscout.in`) to Render frontend
- [ ] Update `CORS_ORIGIN` on backend to `https://uniscout.in`
- [ ] Update `VITE_API_URL` on frontend to `https://api.uniscout.in/api`

---

## Environment Variables Reference

### Frontend (Render Static Site)
| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://api.uniscout.in/api` |

### Backend (Render Web Service)
| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `DATA_DIR` | `./data` |
| `ML_SERVICE_URL` | `https://uniscout-ml-production.up.railway.app` |
| `CORS_ORIGIN` | `https://uniscout.in` |
| `RATE_LIMIT_MAX_REQUESTS` | `200` |
| `LOAD_ALL_YEARS` | `true` (optional — loads 2022-25, uses more RAM) |

### ML Service (Railway)
| Variable | Value |
|---|---|
| `ML_MODEL_DIR` | `./models` |
| `ML_DATA_DIR` | `./data` |
| `TRAINING_ENABLED` | `false` |

---

## Local Development

**Terminal 1 — ML Service**
```bash
cd new-uniscout-mht-cet/ml-service
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```

**Terminal 2 — Backend**
```bash
cd new-uniscout-mht-cet/backend-mhtcet
node dist/server.js
```
Wait for: `✅ MHT-CET backend running on port 5001`

**Terminal 3 — Frontend**
```bash
cd new-uniscout-mht-cet
npm run dev
```
Open: `http://localhost:3000`

---

## Adding New Exam Data

```bash
git add ml-service/data/jee_main_2024.csv
git commit -m "data: add JEE Main 2024"
git push
```
Render auto-redeploys backend. Railway auto-redeploys ML service.
