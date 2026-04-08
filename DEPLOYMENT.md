# UniScout Deployment Guide

## Architecture

```
uniscout.in                              → Render Static Site  (React/Vite frontend) — free
api.uniscout.in                          → Railway             (Node.js backend)      — free tier
YOUR-USERNAME-uniscout-ml.hf.space       → Hugging Face Spaces (Python ML service)   — free
```

---

## Step 1 — Deploy ML Service on Hugging Face Spaces

HF Spaces is perfect for FastAPI — free, no hour limits, no spin-down.

1. Go to [huggingface.co](https://huggingface.co) → New Space
2. Settings:
   - **Space name:** `uniscout-ml`
   - **SDK:** Docker
   - **Visibility:** Public (required for free tier)
3. In the Space, go to **Files** → connect your GitHub repo
   - Or: clone the Space repo locally, copy `ml-service/` contents into it, push
4. The `Dockerfile` and `README.md` are already set up in `ml-service/`
5. HF Spaces will build and deploy automatically
6. Your ML URL will be: `https://YOUR-USERNAME-uniscout-ml.hf.space`
7. Test: `https://YOUR-USERNAME-uniscout-ml.hf.space/health`

**Note:** HF Spaces free tier sleeps after inactivity. First request wakes it up (~30s).

---

## Step 2 — Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select repo: `Vedant040201/new-uniscout-mht-cet`
3. Settings:
   - **Root Directory:** `backend-mhtcet`
   - Railway auto-detects `railway.toml` for build/start commands
4. Add environment variables (Settings → Variables):
   ```
   NODE_ENV=production
   PORT=5001
   CORS_ORIGIN=https://uniscout.in
   DATA_DIR=../ml-service/data
   ML_SERVICE_URL=https://YOUR-USERNAME-uniscout-ml.hf.space
   RATE_LIMIT_MAX_REQUESTS=200
   ```
5. Railway assigns a URL like `https://uniscout-backend.up.railway.app`
6. Test: `https://uniscout-backend.up.railway.app/api/health`

**Custom domain:** Railway → your service → Settings → Custom Domain → add `api.uniscout.in`

---

## Step 3 — Deploy Frontend on Render

1. Render dashboard → **New → Static Site**
2. Connect repo: `Vedant040201/new-uniscout-mht-cet`
3. Settings:
   - **Root Directory:** (leave blank)
   - **Build Command:** `npm install && npm run build`
   - **Publish Directory:** `build`
4. Environment variable:
   ```
   VITE_API_URL=https://api.uniscout.in/api
   ```
   (or use the Railway URL before custom domain is set up)
5. Custom domain: Render → Settings → Custom Domains → add `uniscout.in`

---

## Step 4 — DNS Records

Add in your domain registrar:

| Type | Name | Value |
|------|------|-------|
| CNAME | `www` | `cname.vercel-dns.com` (or Render-provided) |
| A/CNAME | `@` | Render-provided for apex domain |
| CNAME | `api` | your-service.up.railway.app |

---

## After Deploy Checklist

- [ ] `https://YOUR-USERNAME-uniscout-ml.hf.space/health` → `{"status":"ok","model_loaded":true}`
- [ ] `https://api.uniscout.in/api/health` → `{"success":true,"stats":{"totalRecords":...}}`
- [ ] `https://uniscout.in` loads the homepage
- [ ] MHT-CET predictor returns college results with admission bands
- [ ] Submit `https://uniscout.in/sitemap.xml` to Google Search Console

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
| `ML_SERVICE_URL` | `https://YOUR-USERNAME-uniscout-ml.hf.space` |
| `RATE_LIMIT_MAX_REQUESTS` | `200` |

### ML Service (HF Spaces — set in Space Settings → Variables)
| Variable | Value |
|---|---|
| `ML_MODEL_DIR` | `./models` |
| `ML_DATA_DIR` | `./data` |
| `TRAINING_ENABLED` | `false` |

---

## Cost Summary

| Service | Platform | Cost |
|---|---|---|
| Frontend | Render Static Site | Free |
| Backend | Railway | Free ($5 credit/mo) |
| ML Service | Hugging Face Spaces | Free |
| **Total** | | **$0/mo** |

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

Drop CSV files into `ml-service/data/` and push:
```bash
git add ml-service/data/jee_main_2024.csv
git commit -m "data: add JEE Main 2024"
git push
```
Railway auto-redeploys. HF Spaces auto-redeploys if connected to GitHub.
