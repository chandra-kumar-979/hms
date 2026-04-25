# Deployment Guide — Hostel Management System

This guide covers deploying the app to the internet using:

| Component | Platform | Cost |
|-----------|----------|------|
| Backend (FastAPI) | [Render.com](https://render.com) | Free tier |
| Frontend (Angular) | [Vercel](https://vercel.com) | Free tier |

---

## Prerequisites

1. Code pushed to a **GitHub repository**
2. Accounts on [Render](https://render.com) and [Vercel](https://vercel.com) (both support GitHub login)

---

## Step 1 — Push to GitHub

```bash
cd /Users/chandrakumar/Documents/PythonProject

# If you haven't created a GitHub repo yet:
# 1. Go to https://github.com/new
# 2. Create a new repo (e.g. hostel-management-system)
# 3. Then run:

git add .
git commit -m "feat: prepare for deployment"
git remote add origin https://github.com/YOUR_USERNAME/hostel-management-system.git
git push -u origin main
```

---

## Step 2 — Deploy Backend on Render

1. Go to [render.com](https://render.com) → **New** → **Web Service**
2. Connect your GitHub repo
3. Configure:
   - **Root Directory**: `hostel_managment`
   - **Runtime**: Python 3
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add **Environment Variables** (under Settings → Environment):

   | Key | Value |
   |-----|-------|
   | `ENV` | `production` |
   | `JWT_SECRET` | *(click "Generate")*  |
   | `DEV_AUTH_ENABLED` | `true` |
   | `CORS_ORIGINS` | *(fill in after frontend is deployed — see Step 3)* |
   | `DATABASE_URL` | `sqlite:////data/hostel.db` |

5. Add a **Disk** (under Settings → Disks):
   - **Name**: `hostel-db`
   - **Mount Path**: `/data`
   - **Size**: 1 GB (free)

6. Click **Deploy** → wait ~3 minutes
7. Note your backend URL, e.g. `https://hostel-ms-api.onrender.com`

---

## Step 3 — Deploy Frontend on Vercel

### 3a. Update the production API URL

Edit `front_end/hostel_managment_fe/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://hostel-ms-api.onrender.com',  // <-- your Render URL here
};
```

Commit and push this change.

### 3b. Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project**
2. Import your GitHub repo
3. Configure:
   - **Root Directory**: `front_end/hostel_managment_fe`
   - **Build Command**: `npm run build -- --configuration production`
   - **Output Directory**: `dist/hostel_managment_fe/browser`
4. Click **Deploy** → wait ~2 minutes
5. Note your frontend URL, e.g. `https://hostel-ms.vercel.app`

---

## Step 4 — Link Backend and Frontend

Go back to **Render** → your backend service → **Environment** and update:

| Key | Value |
|-----|-------|
| `CORS_ORIGINS` | `https://hostel-ms.vercel.app,http://localhost:4200` |
| `APP_BASE_URL` | `https://hostel-ms.vercel.app` |

Click **Save** → Render will auto-redeploy.

---

## Step 5 — Test It!

Open your Vercel URL in a browser.

### Quick test accounts (dev login):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hostelms.local | admin123 |
| Owner | owner@hostelms.local | owner123 |
| Tenant | tenant@hostelms.local | tenant123 |

---

## Notes

- **Database**: Render's free disk persists data across deploys. If you need to reset, SSH into the service and delete `/data/hostel.db`.
- **Cold starts**: Free Render services spin down after 15 min inactivity. First request may take ~30 seconds to wake up.
- **Upgrade path**: When ready for production, replace SQLite with PostgreSQL (Render offers a free PostgreSQL instance).

---

## Quick Alternative — Test with ngrok (no deployment needed)

If you just want to share your local app temporarily:

```bash
# Install ngrok: https://ngrok.com/download
ngrok http 8000
```

Copy the `https://xxxx.ngrok.io` URL, update `environment.prod.ts`, then run:

```bash
cd front_end/hostel_managment_fe
ng build --configuration production
# serve dist/ with any static server
```
