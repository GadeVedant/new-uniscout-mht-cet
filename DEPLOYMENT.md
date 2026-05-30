# UniScout Deployment Guide

## Architecture

```
uniscout.co.in         → Render Static Site  (React/Vite frontend)  — free
api.uniscout.co.in     → Render Web Service  (Node.js backend)       — free / $7/mo
ml.uniscout.co.in      → Render Web Service  (Python ML service)     — free / $7/mo
```

---

## Step 1 — ML Service on Render (Docker)

1. Render dashboard → **New → Web Service**
2. Connect repo: `Vedant040201/new-uniscout-mht-cet`
3. Settings:
   - **Root Directory:** `ml-service`
   - **Runtime:** Docker
   - **Dockerfile Path:** `./Dockerfile`
   - **Plan:** Free (spins down after 15min) or $7/mo (always-on)
4. Environment variables:
   ```
   ML_MODEL_DIR=./models
   ML_DATA_DIR=./data
   TRAINING_ENABLED=false
   ML_LOG_LEVEL=INFO
   ```
5. Deploy — model loads from `./models/` on startup (~20s)
6. Test: `https://uniscout-ml.onrender.com/health`
   - Should return: `{ "model_loaded": true, "status": "ok" }`

**Custom domain (optional):** Render → Settings → Custom Domains → add `ml.uniscout.co.in`

> **Note:** On the free plan, the service spins down after 15 min of inactivity.
> The backend already has a 1.5s ML timeout and graceful fallback, so cold starts
> won't break anything — predictions just use historical data until ML warms up.

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
   ML_SERVICE_URL=https://uniscout-ml.onrender.com
   CORS_ORIGIN=https://uniscout.co.in
   RATE_LIMIT_MAX_REQUESTS=200
   ```
   > Replace `uniscout-ml.onrender.com` with your actual ML service URL from Step 1.
5. Deploy — loads ~80k records from `./data/` on startup (~30s)
6. Test: `https://uniscout-backend.onrender.com/api/health`

**Custom domain:** Render → Settings → Custom Domains → add `api.uniscout.co.in`

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
   VITE_API_URL=https://api.uniscout.co.in/api
   ```
5. Custom domain: add `uniscout.co.in` and `www.uniscout.co.in`

---

## DNS Records

| Type  | Name  | Value                          |
|-------|-------|--------------------------------|
| CNAME | `@`   | Render-provided (frontend)     |
| CNAME | `www` | Render-provided (frontend)     |
| CNAME | `api` | `uniscout-backend.onrender.com`|
| CNAME | `ml`  | `uniscout-ml.onrender.com`     |

---

## After Deploy Checklist

- [ ] `https://uniscout-ml.onrender.com/health` → `model_loaded: true` ✅
- [ ] `https://uniscout-backend.onrender.com/api/health` → `success: true, totalRecords: ~80000`
- [ ] `https://uniscout.co.in` loads homepage
- [ ] MHT-CET predictor returns results with admission bands
- [ ] College detail page shows cutoff history chart
- [ ] Smart Form Filling generates preference list (no "AI unavailable" note)
- [ ] `https://uniscout.co.in/robots.txt` accessible
- [ ] `https://uniscout.co.in/sitemap.xml` accessible

---

## SEO & Analytics Setup

- [ ] **Google Search Console** — [search.google.com/search-console](https://search.google.com/search-console)
  1. Add property → enter `https://uniscout.co.in`
  2. Verify ownership (HTML tag or DNS TXT record)
  3. Sitemaps → submit `https://uniscout.co.in/sitemap.xml`

- [ ] **Bing Webmaster Tools** — [bing.com/webmasters](https://www.bing.com/webmasters)
  1. Add site → `https://uniscout.co.in`
  2. Submit sitemap: `https://uniscout.co.in/sitemap.xml`

- [ ] **Google Analytics (GA4)** — [analytics.google.com](https://analytics.google.com)
  1. Create GA4 property for `uniscout.co.in`
  2. Copy the `gtag.js` snippet and add it to `index.html` before `</head>`

- [ ] **Rich Results Test** — [search.google.com/test/rich-results](https://search.google.com/test/rich-results)
  - Test `https://uniscout.co.in/` → should detect FAQPage schema
  - Test `https://uniscout.co.in/jee-college-predictor` → should detect WebPage schema

- [ ] **PageSpeed Insights** — [pagespeed.web.dev](https://pagespeed.web.dev)
  - Check Core Web Vitals for `https://uniscout.co.in`
  - Target: LCP < 2.5s, CLS < 0.1, INP < 200ms

- [ ] Update `CORS_ORIGIN` on backend to `https://uniscout.co.in`
- [ ] Update `VITE_API_URL` on frontend to `https://api.uniscout.co.in/api`

---

## Environment Variables Reference

### Frontend (Render Static Site)
| Variable       | Value                          |
|----------------|--------------------------------|
| `VITE_API_URL` | `https://api.uniscout.co.in/api`  |

### Backend (Render Web Service)
| Variable                  | Value                                  |
|---------------------------|----------------------------------------|
| `NODE_ENV`                | `production`                           |
| `DATA_DIR`                | `./data`                               |
| `ML_SERVICE_URL`          | `https://uniscout-ml.onrender.com`     |
| `CORS_ORIGIN`             | `https://uniscout.co.in`                  |
| `RATE_LIMIT_MAX_REQUESTS` | `200`                                  |

### ML Service (Render Web Service — Docker)
| Variable           | Value      |
|--------------------|------------|
| `ML_MODEL_DIR`     | `./models` |
| `ML_DATA_DIR`      | `./data`   |
| `TRAINING_ENABLED` | `false`    |
| `ML_LOG_LEVEL`     | `INFO`     |

---

## Local Development

**Terminal 1 — ML Service**
```bash
cd new-uniscout-mht-cet/ml-service
python main.py
```
Wait for: `Model loaded on startup`

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
git add ml-service/data/new_data.csv backend-mhtcet/data/new_data.csv
git commit -m "data: add new CAP data"
git push
```
Render auto-redeploys both backend and ML service.
