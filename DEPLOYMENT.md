# UniScout Deployment Guide

## Architecture

```
uniscout.in          → Render Static Site  (React/Vite frontend)   — free
api.uniscout.in      → Railway             (Node.js backend)        — free tier
ml.uniscout.in       → Railway             (Python ML service)      — free tier
```

Both backend services are in the same Railway project, same GitHub repo, different root directories.

---

## Step 1 — Deploy ML Service on Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select repo: `Vedant040201/new-uniscout-mht-cet`
3. Settings:
   - **Service name:** `uniscout-ml`
   - **Root Directory:** `ml-service`
   - Railway auto-reads `railway.toml` — no manual build/start commands needed
4. Add environment variables (Settings → Variables):
   ```
   ML_MODEL_DIR=./models
   ML_DATA_DIR=./data
   TRAINING_ENABLED=false
   DATA_VERSION=2024-25
   ```
5. Deploy and wait for build to finish
6. Copy the service URL e.g. `https://uniscout-ml.up.railway.app`
7. Test: `https://uniscout-ml.up.railway.app/health` → `{"status":"ok","model_loaded":true,...}`

---

## Step 2 — Deploy Backend on Railway

Add a second service to the same Railway project:

1. Railway → your project → **New Service → GitHub Repo**
2. Same repo: `Vedant040201/new-uniscout-mht-cet`
3. Settings:
   - **Service name:** `uniscout-backend`
   - **Root Directory:** `backend-mhtcet`
   - Railway auto-reads `railway.toml`
4. Add environment variables:
   ```
   NODE_ENV=production
   PORT=5001
   CORS_ORIGIN=https://uniscout.in
   DATA_DIR=../ml-service/data
   ML_SERVICE_URL=https://uniscout-ml.up.railway.app   RATE_LIMIT_MAX_REQUESTS=200
   ```
5. Deploy — backend loads ~80k records on startup (2024-25 data only in production)
6. Test: `https://uniscout-backend.up.railway.app/api/health`

**Custom domain:** Railway → backend service → Settings → Custom Domain → add `api.uniscout.in`

---

## Step 3 — Deploy Frontend on Render

1. Render dashboard → **New → Static Site** (must be Static Site, not Web Service)
2. Connect repo: `Vedant040201/new-uniscout-mht-cet`
3. Settings:
   - **Root Directory:** (leave blank)
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
   - **Start Command:** (leave blank — Static Sites don't need one)
4. Environment variable:
   ```
   VITE_API_URL=https://api.uniscout.in/api
   ```
5. Custom domain: Render → Settings → Custom Domains → add `uniscout.in` and `www.uniscout.in`

---

## Step 4 — DNS Records

Add in your domain registrar:

| Type | Name | Value |
|------|------|-------|
| A/CNAME | `@` (uniscout.in) | Render-provided |
| CNAME | `www` | Render-provided |
| CNAME | `api` | `uniscout-backend.up.railway.app` |

---

## After Deploy Checklist

- [ ] `https://uniscout-ml.up.railway.app/health` → `{"status":"ok","model_loaded":true}`
- [ ] `https://api.uniscout.in/api/health` → `{"success":true,"stats":{"totalRecords":...}}`
- [ ] `https://uniscout.in` loads the homepage
- [ ] MHT-CET predictor returns college results with admission bands
- [ ] College detail page shows cutoff history chart
- [ ] Smart Form Filling generates preference list
- [ ] `https://uniscout.in/robots.txt` accessible
- [ ] `https://uniscout.in/sitemap.xml` accessible
- [ ] Submit sitemap to [Google Search Console](https://search.google.com/search-console)
- [ ] Submit sitemap to [Bing Webmaster Tools](https://www.bing.com/webmasters)

---

## Environment Variables Reference

### Frontend (Render Static Site)
| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://api.uniscout.in/api` |

### Backend (Railway)
| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5001` |
| `CORS_ORIGIN` | `https://uniscout.in` |
| `DATA_DIR` | `../ml-service/data` |
| `ML_SERVICE_URL` | `https://uniscout-ml.up.railway.app` |
| `RATE_LIMIT_MAX_REQUESTS` | `200` |
| `LOAD_ALL_YEARS` | `true` (optional — loads all years, uses more RAM) |

### ML Service (Railway)
| Variable | Value |
|---|---|
| `ML_MODEL_DIR` | `./models` |
| `ML_DATA_DIR` | `./data` |
| `TRAINING_ENABLED` | `false` |
| `DATA_VERSION` | `2024-25` |

---

## Cost Summary

| Service | Platform | Cost |
|---|---|---|
| Frontend | Render Static Site | Free |
| Backend | Railway free tier | Free ($5 credit/mo) |
| ML Service | Railway free tier | Free (shared credit) |
| **Total** | | **~$0/mo** |

---

## Adding New Exam Data

Drop CSV files into `ml-service/data/` and push:
```bash
git add ml-service/data/jee_main_2024.csv
git commit -m "data: add JEE Main 2024"
git push
```
Railway auto-redeploys both services.

---

## Local Development

**Terminal 1 — ML Service**
```bash
cd new-uniscout-mht-cet/ml-service
python -m uvicorn main:app --host 0.0.0.0 --port 8000
```
Wait for: `Application startup complete.`

**Terminal 2 — Backend** (takes ~30s to load data)
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
