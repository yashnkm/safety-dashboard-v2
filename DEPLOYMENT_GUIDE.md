# 🚀 Deployment Guide - Safety Dashboard V2

This guide will walk you through deploying your full-stack Safety Dashboard application to production.

## 📋 Overview

Your app has 3 components that need to be deployed:
1. **Frontend** (React + Vite) → Vercel
2. **Backend** (Express + TypeScript) → Render.com
3. **Database** (PostgreSQL) → Vercel Postgres / Supabase

---

## 🗄️ Step 1: Deploy Database (PostgreSQL)

### Option A: Vercel Postgres (Recommended)

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Storage" tab
3. Click "Create Database" → Select "Postgres"
4. Name it `safety-dashboard-db`
5. Select region (choose closest to your users)
6. Click "Create"
7. Copy the **DATABASE_URL** (format: `postgres://...`)

### Option B: Supabase (Free Alternative)

1. Go to [Supabase](https://supabase.com)
2. Create new project: `safety-dashboard`
3. Wait for database to initialize
4. Go to Settings → Database
5. Copy **Connection string** (URI format)

---

## 🔧 Step 2: Deploy Backend (Express API)

### Using Render.com (Free Tier)

1. **Create Render Account**
   - Go to [Render.com](https://render.com)
   - Sign up with GitHub

2. **Push Code to GitHub**
   ```bash
   cd "safety-dashboard-v2"
   git init
   git add .
   git commit -m "Initial commit for deployment"
   git branch -M main
   git remote add origin <your-github-repo-url>
   git push -u origin main
   ```

3. **Create Web Service on Render**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select the `safety-dashboard-v2` repo
   - Configure:
     - **Name**: `safety-dashboard-api`
     - **Region**: Choose closest to you
     - **Branch**: `main`
     - **Root Directory**: `backend`
     - **Runtime**: `Node`
     - **Build Command**: `npm install && npx prisma generate && npm run build`
     - **Start Command**: `npm start`
     - **Plan**: Free

4. **Add Environment Variables** (in Render dashboard)
   ```
   DATABASE_URL=<your-database-url-from-step-1>
   NODE_ENV=production
   JWT_SECRET=<generate-a-long-random-string>
   JWT_EXPIRY=7d
   CORS_ORIGIN=https://your-frontend-url.vercel.app
   PORT=5000
   ```

5. **Important**: Add build script to `backend/package.json`:
   ```json
   "scripts": {
     "start": "node dist/index.js",
     "build": "tsc",
     "dev": "ts-node-dev --respawn --transpile-only src/index.ts"
   }
   ```

6. **Run Database Migrations**
   - After first deploy, go to Render Shell
   - Run: `npx prisma migrate deploy`
   - Run: `npx prisma db seed` (if you have seed data)

7. **Copy Backend URL**
   - Example: `https://safety-dashboard-api.onrender.com`

---

## 🎨 Step 3: Deploy Frontend (React)

### Using Vercel

1. **Install Vercel CLI** (optional, or use web UI)
   ```bash
   npm install -g vercel
   ```

2. **Option A: Deploy via Web UI**
   - Go to [Vercel Dashboard](https://vercel.com)
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Framework Preset: **Vite**
   - Root Directory: Leave as is
   - Build Command: Will auto-detect from `vercel.json`
   - Click "Deploy"

3. **Option B: Deploy via CLI**
   ```bash
   cd "safety-dashboard-v2"
   vercel
   # Follow prompts, select the project
   ```

4. **Configure Environment Variables** (Vercel Dashboard)
   - Go to Project Settings → Environment Variables
   - Add:
     ```
     VITE_API_URL=https://safety-dashboard-api.onrender.com/api
     ```
   - Redeploy after adding

5. **Update CORS in Backend**
   - Go back to Render
   - Update `CORS_ORIGIN` env variable:
     ```
     CORS_ORIGIN=https://your-app.vercel.app
     ```
   - Render will auto-redeploy

---

## ✅ Step 4: Verify Deployment

1. **Test Backend API**
   ```bash
   curl https://safety-dashboard-api.onrender.com/api/health
   ```
   Should return: `{"status":"ok"}`

2. **Test Frontend**
   - Visit: `https://your-app.vercel.app`
   - Try logging in
   - Check if data loads

3. **Check Database Connection**
   - Login to your app
   - Import some data
   - Verify it appears in dashboard

---

## 🔐 Step 5: Create Super Admin

After deployment, create your first admin user:

1. **Option A: Interactive Script (Recommended)**
   - Go to Render dashboard → Your service → Shell tab
   - Run:
     ```bash
     npm run create-admin
     ```
   - Follow the interactive prompts to create company and admin user
   - Script will automatically hash password and create both records

2. **Option B: Generate Hash + SQL**
   - Generate password hash locally:
     ```bash
     cd backend
     npm run generate-password YourSecurePassword123
     ```
   - Copy the hash output
   - Use Vercel Postgres dashboard or Supabase SQL Editor
   - Run:
     ```sql
     -- First, create a company
     INSERT INTO "Company" ("companyName", "companyCode", "isActive")
     VALUES ('Your Company', 'COMP001', true)
     RETURNING id;

     -- Then create super admin (replace hash and company id)
     INSERT INTO "User" ("email", "passwordHash", "fullName", "role", "companyId", "accessLevel", "isActive")
     VALUES (
       'admin@yourcompany.com',
       '<paste-hash-from-generate-password>',
       'Super Admin',
       'SUPER_ADMIN',
       '<company-id-from-above>',
       'ALL_SITES',
       true
     );
     ```

3. **Option C: Use Prisma Studio**
   ```bash
   cd backend
   npx prisma studio
   ```
   - Manually create company and user (requires password hash from Option B)

---

## 🎉 You're Live!

Your app should now be accessible at:
- **Frontend**: `https://your-app.vercel.app`
- **Backend**: `https://safety-dashboard-api.onrender.com`
- **Database**: Vercel Postgres / Supabase

---

## 🐛 Troubleshooting

### Frontend shows "Network Error"
- Check `VITE_API_URL` environment variable
- Verify backend is running
- Check CORS settings

### Backend won't start
- Check Render logs
- Verify `DATABASE_URL` is correct
- Ensure migrations ran: `npx prisma migrate deploy`

### Database connection failed
- Check DATABASE_URL format
- Verify database is running
- Check IP whitelist (Supabase)

### 500 errors
- Check Render logs: Dashboard → Logs
- Look for errors in backend console

---

## 💰 Cost Estimate

- **Vercel Frontend**: FREE (Hobby Plan)
- **Render Backend**: FREE (with 750 hrs/month)
- **Vercel Postgres**: FREE (Up to 256MB) or $20/month
- **Supabase DB**: FREE (Up to 500MB)

**Total**: $0 - $20/month

---

## 🔄 Future Deployments

After initial setup, just push to GitHub:

```bash
git add .
git commit -m "Your changes"
git push origin main
```

Both Vercel and Render will auto-deploy! 🚀
