# UniScout Deployment Guide (Render)

## Architecture

```
uniscout.in          → Render Static Site  (React/Vite frontend)
api.uniscout.in      → Render Web Service  (Node.js/Express backend)  $7/mo
ml.uniscout.in       → Render Web Service  (Python/FastAPI ML service) $7/mo
```

Data files (CSVs) are committed to the repo — no disk needed.

---

## Prerequisites

- GitHub repo pushed (already done)
- Render account at [render.com](https://render.com)
- Domain purchased (uniscout.in)

---

## Step 1 — Deploy ML Service first

The backend depends on the ML service URL, so deploy this first.

1. Render dashboard → **New → Web Service**
2. Connect your GitHub repo: `Vedant040201/new-uniscout-mht-cet`
3. Settings:
   - **Name:** `uniscout-ml`
   - **Root Directory:** `new-uniscout-mht-cet/ml-service`
   - **Runtime:** Python 3
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** $7/mo (Starter) — keeps it always-on
4. Environment Variables:
   ```
   ML_DATA_DIR=./data
   ML_MODEL_DIR=./models
   TRAINING_ENABLED=false
   DATA_VERSION=2024-25
   ```
5. Click **Deploy**
6. Wait for deploy to finish, then copy the service URL e.g. `https://uniscout-ml.onrender.com`
7. Test: `https://uniscout-ml.onrender.com/health` → should return `{"status":"ok",...}`

---

## Step 2 — Deploy Backend

1. Render dashboard → **New → Web Service**
2. Same repo
3. Settings:
   - **Name:** `uniscout-backend`
   - **Root Directory:** `new-uniscout-mht-cet/backend-mhtcet`
   - **Runtime:** Node
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `node dist/server.js`
   - **Plan:** $7/mo (Starter)
4. Environment Variables:
   ```
   NODE_ENV=production
   PORT=5001
   CORS_ORIGIN=https://uniscout.in
   DATA_DIR=../ml-service/data
   ML_SERVICE_URL=https://uniscout-ml.onrender.com
   RATE_LIMIT_MAX_REQUESTS=200
   ```
5. Click **Deploy**
6. Wait for deploy — backend loads 206k records on startup, takes ~30-60s
7. Test: `https://uniscout-backend.onrender.com/api/health` → should return `{"success":true,"stats":{"totalRecords":206594,...}}`

---

## Step 3 — Deploy Frontend

1. Render dashboard → **New → Static Site**
2. Same repo
3. Settings:
   - **Name:** `uniscout-frontend`
   - **Root Directory:** `new-uniscout-mht-cet`
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
4. Environment Variables:
   ```
   VITE_API_URL=https://uniscout-backend.onrender.com/api
   ```
5. Click **Deploy**
6. Test: visit the Render-provided URL, try the MHT-CET predictor

---

## Step 4 — Connect Custom Domain

### Frontend (uniscout.in)
1. Render → `uniscout-frontend` → Settings → Custom Domains
2. Add `uniscout.in` and `www.uniscout.in`
3. Render gives you a CNAME value — add it in your domain registrar:
   ```
   Type: CNAME
   Name: www
   Value: <render-provided-value>
   ```
   For the apex domain (`uniscout.in`), use an A record or ALIAS record as Render instructs.

### Backend subdomain (api.uniscout.in)
1. Render → `uniscout-backend` → Settings → Custom Domains
2. Add `api.uniscout.in`
3. Add CNAME in registrar:
   ```
   Type: CNAME
   Name: api
   Value: <render-provided-value>
   ```
4. Update backend env var: `CORS_ORIGIN=https://uniscout.in`
5. Update frontend env var: `VITE_API_URL=https://api.uniscout.in/api`
6. Redeploy frontend after updating env var

---

## Step 5 — After Deploy Checklist

- [ ] `https://uniscout.in` loads the homepage
- [ ] `https://api.uniscout.in/api/health` returns `{"success":true,...}`
- [ ] MHT-CET predictor returns college results
- [ ] College detail page loads cutoff history chart
- [ ] Smart Form Filling generates preference list
- [ ] `https://uniscout.in/robots.txt` is accessible
- [ ] `https://uniscout.in/sitemap.xml` is accessible
- [ ] Submit sitemap to [Google Search Console](https://search.google.com/search-console)
- [ ] Submit sitemap to [Bing Webmaster Tools](https://www.bing.com/webmasters)

---

## Adding New Exam Data (JEE, NEET, CAT)

When you have data for a new exam:

1. Add CSV files to `ml-service/data/` following the naming pattern:
   ```
   jee_main_2024.csv
   neet_2024.csv
   cat_2024.csv
   ```
2. `git add ml-service/data/ && git commit -m "data: add JEE 2024 data" && git push`
3. Render auto-deploys — no manual steps needed

---

## Cost Summary

| Service | Plan | Cost |
|---|---|---|
| Frontend (Static Site) | Free | $0/mo |
| Backend (Node.js) | Starter | $7/mo |
| ML Service (Python) | Starter | $7/mo |
| **Total** | | **$14/mo** |

No disk needed — data is in the repo.

---

## Environment Variables Quick Reference

### Frontend (Render Static Site)
| Variable | Value |
|---|---|
| `VITE_API_URL` | `https://api.uniscout.in/api` |

### Backend (Render Web Service)
| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | `5001` |
| `CORS_ORIGIN` | `https://uniscout.in` |
| `DATA_DIR` | `../ml-service/data` |
| `ML_SERVICE_URL` | `https://uniscout-ml.onrender.com` |
| `RATE_LIMIT_MAX_REQUESTS` | `200` |

### ML Service (Render Web Service)
| Variable | Value |
|---|---|
| `ML_DATA_DIR` | `./data` |
| `ML_MODEL_DIR` | `./models` |
| `TRAINING_ENABLED` | `false` |
| `DATA_VERSION` | `2024-25` |

---

## Local Development

Run all three services simultaneously in separate terminals:

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
