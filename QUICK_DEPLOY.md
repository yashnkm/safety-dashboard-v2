# ⚡ Quick Deploy (5 Minutes)

The fastest way to get your app live!

## 🎯 TL;DR

1. **Database** → Create free PostgreSQL on Supabase
2. **Backend** → Deploy to Render.com (auto from GitHub)
3. **Frontend** → Deploy to Vercel (one click)

---

## 📝 Prerequisites

- GitHub account
- Vercel account (sign up with GitHub)
- Render.com account (sign up with GitHub)
- Supabase account (sign up with GitHub)

---

## 🚀 Deploy in 3 Steps

### Step 1: Database (2 min)

1. Go to https://supabase.com
2. Click "New project"
3. Name: `safety-dashboard`
4. Password: (generate strong password)
5. Region: Choose closest
6. Wait 2 minutes for setup
7. **Copy** this connection string:
   - Settings → Database → Connection string (URI)
   - Example: `postgresql://postgres:[YOUR-PASSWORD]@db.xxx.supabase.co:5432/postgres`

---

### Step 2: Backend API (2 min)

1. **Push to GitHub** (if not done):
   ```bash
   cd "safety-dashboard-v2"
   git init
   git add .
   git commit -m "Ready for deployment"
   gh repo create safety-dashboard-v2 --private --source=. --push
   ```

2. Go to https://render.com
3. Click "New +" → "Web Service"
4. Connect GitHub → Select `safety-dashboard-v2`
5. **Settings**:
   - Name: `safety-dashboard-api`
   - Root Directory: `backend`
   - Build Command: `npm install && npx prisma generate && npm run build`
   - Start Command: `npm start`
   - **Free plan**

6. **Environment Variables** (click "Add Environment Variable"):
   ```
   DATABASE_URL = <paste-from-step-1>
   NODE_ENV = production
   JWT_SECRET = <any-long-random-string>
   JWT_EXPIRY = 7d
   CORS_ORIGIN = https://your-app.vercel.app
   PORT = 5000
   ```

7. Click "Create Web Service"
8. Wait 5 minutes for first build
9. **Copy your API URL**: `https://safety-dashboard-api.onrender.com`

10. **Run migrations** (after deploy):
    - Click "Shell" tab in Render
    - Run: `npx prisma migrate deploy`

---

### Step 3: Frontend (1 min)

1. Go to https://vercel.com
2. Click "Add New..." → "Project"
3. Import `safety-dashboard-v2` from GitHub
4. **Leave all defaults**, just add environment variable:
   - Name: `VITE_API_URL`
   - Value: `https://safety-dashboard-api.onrender.com/api`
5. Click "Deploy"
6. Wait 2 minutes
7. **Copy Vercel URL**: `https://your-app.vercel.app`

8. **Update CORS**:
   - Go back to Render
   - Update `CORS_ORIGIN` env var to your Vercel URL
   - Save (auto-redeploys)

---

## ✅ Done!

Visit `https://your-app.vercel.app` 🎉

---

## 🔑 Create First Admin

1. Go to Supabase SQL Editor
2. Run this (replace values):

```sql
-- Create company
INSERT INTO "Company" ("id", "companyName", "companyCode", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'My Company',
  'COMP001',
  true,
  NOW(),
  NOW()
) RETURNING id;

-- Copy the ID from above, then create user
-- Password: "admin123" (change after first login!)
INSERT INTO "User" ("id", "email", "passwordHash", "fullName", "role", "companyId", "accessLevel", "isActive", "createdAt", "updatedAt")
VALUES (
  gen_random_uuid(),
  'admin@company.com',
  '$2b$10$YourHashedPasswordHere',
  'Admin User',
  'SUPER_ADMIN',
  '<company-id-from-above>',
  'ALL_SITES',
  true,
  NOW(),
  NOW()
);
```

3. Login with `admin@company.com` / `admin123`

---

## 🆘 Issues?

**Can't login?**
- Check backend logs in Render
- Verify DATABASE_URL is correct
- Make sure migrations ran

**Blank page?**
- Check browser console
- Verify VITE_API_URL in Vercel
- Check CORS_ORIGIN in Render

**Database error?**
- Confirm connection string format
- Check Supabase is running
- Verify migrations: `npx prisma migrate deploy`

---

## 💰 Cost: $0/month

All free tiers:
- ✅ Supabase: 500MB DB
- ✅ Render: 750 hours/month
- ✅ Vercel: Unlimited

**Upgrade later if needed!**
