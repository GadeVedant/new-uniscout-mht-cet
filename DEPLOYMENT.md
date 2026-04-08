# UniScout Deployment Guide

## Architecture

```
uniscout.in          → Vercel  (React/Vite frontend)
api.uniscout.in      → Railway (Node.js/Express backend)
ml.uniscout.in       → Railway (Python/FastAPI ML service)
```

---

## Step 1 — Push to GitHub

Make sure your repo is on GitHub. Railway and Vercel both deploy from git.

```bash
git add .
git commit -m "production ready"
git push origin main
```

---

## Step 2 — Deploy Frontend on Vercel

1. Go to [vercel.com](https://vercel.com) → New Project → Import your GitHub repo
2. Set **Root Directory** to `new-uniscout-mht-cet`
3. Framework: **Vite** (auto-detected)
4. Add environment variable:
   - `VITE_API_URL` = `https://api.uniscout.in/api`
5. Click Deploy

**Connect your domain:**
- Vercel dashboard → your project → Settings → Domains
- Add `uniscout.in` and `www.uniscout.in`
- Vercel gives you DNS records — add them in your domain registrar

---

## Step 3 — Deploy Backend on Railway

1. Go to [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Select your repo, set **Root Directory** to `new-uniscout-mht-cet/backend-mhtcet`
3. Railway auto-detects `railway.toml` and runs `npm run build && npm run start`
4. Add environment variables (Settings → Variables):

```
PORT=5001
NODE_ENV=production
CORS_ORIGIN=https://uniscout.in
DATA_FILE_PATH=./MHTCET_CAP_DATA.xlsx
RATE_LIMIT_MAX_REQUESTS=200
```

5. **Upload your data file:**
   - Railway → your service → Files (or use a Volume)
   - Upload `MHTCET_CAP_DATA.xlsx` to the service root

6. **Connect custom domain:**
   - Railway → your service → Settings → Networking → Custom Domain
   - Add `api.uniscout.in`
   - Add the CNAME record in your domain registrar

---

## Step 4 — Deploy ML Service on Railway

1. Railway → your project → Add Service → GitHub
2. Set **Root Directory** to `new-uniscout-mht-cet/ml-service`
3. Add environment variables:

```
ML_DATA_DIR=./data
ML_MODEL_DIR=./models
ML_SERVICE_PORT=8000
NODE_ENV=production
TRAINING_ENABLED=false
DATA_VERSION=2024-25
```

4. Connect custom domain: `ml.uniscout.in`
5. Update backend env var: `ML_SERVICE_URL=https://ml.uniscout.in`

---

## Step 5 — DNS Records Summary

Add these in your domain registrar (Namecheap / Cloudflare / GoDaddy):

| Type | Name | Value |
|------|------|-------|
| A / CNAME | `@` (uniscout.in) | Vercel-provided |
| CNAME | `www` | `cname.vercel-dns.com` |
| CNAME | `api` | your-backend.railway.app |
| CNAME | `ml` | your-ml-service.railway.app |

> If using Cloudflare: set proxy status to **DNS only** (grey cloud) for `api` and `ml` subdomains initially, until you confirm they work.

---

## Step 6 — After Deploy Checklist

- [ ] `https://uniscout.in` loads the app
- [ ] `https://api.uniscout.in/api/health` returns `{ success: true }`
- [ ] MHT CET predictor returns results
- [ ] `https://uniscout.in/robots.txt` is accessible
- [ ] `https://uniscout.in/sitemap.xml` is accessible
- [ ] Submit sitemap to [Google Search Console](https://search.google.com/search-console)
- [ ] Submit sitemap to [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [ ] Set up [Google Analytics](https://analytics.google.com) — add GA4 script to `index.html`

---

## Environment Variables Quick Reference

### Frontend (Vercel)
| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://api.uniscout.in/api` |

### Backend (Railway)
| Variable | Value |
|----------|-------|
| `PORT` | `5001` |
| `NODE_ENV` | `production` |
| `CORS_ORIGIN` | `https://uniscout.in` |
| `DATA_FILE_PATH` | `./MHTCET_CAP_DATA.xlsx` |
| `PLACEMENT_DATA_PATH` | `./data/placements.csv` |
| `RATE_LIMIT_MAX_REQUESTS` | `200` |

### ML Service (Railway)
| Variable | Value |
|----------|-------|
| `ML_SERVICE_PORT` | `8000` |
| `ML_DATA_DIR` | `./data` |
| `ML_MODEL_DIR` | `./models` |
| `TRAINING_ENABLED` | `false` |
| `DATA_VERSION` | `2024-25` |
