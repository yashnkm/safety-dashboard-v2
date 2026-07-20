# FINAL SETUP STEPS - Clean & Simple

## Current Situation
- ✅ Tunnel created: `safety-backend` (ID: 6accec6f-0830-4493-954f-d61ed212ca62)
- ✅ DNS configured: kpi.protecther.in, api.protecther.in
- ✅ Backend .env updated
- ✅ Frontend .env updated
- ❌ Apps not running properly

---

## STEP 1: Start Backend

```bash
cd "C:\Protecther Safety Dashboard\safety-dashboard-v2"
pm2 start ecosystem.config.js --only safety-backend
pm2 logs safety-backend
```

**Expected:** Backend starts without errors

**Test it works:**
```
http://localhost:5001/api/health
```

Should return: `{"status":"ok",...}`

---

## STEP 2: Start Frontend

```bash
pm2 start ecosystem.config.js --only safety-frontend
pm2 logs safety-frontend
```

**Test it works:**
```
http://localhost:3001
```

Should show: Login page

---

## STEP 3: Verify Both Running

```bash
pm2 status
```

Should show:
- safety-backend (online)
- safety-frontend (online)

---

## STEP 4: Start Tunnel

```bash
cloudflared tunnel --config C:\Users\PC-09\.cloudflared\safety-config.yml run safety-backend
```

**Expected output:**
```
INF Connection registered connIndex=0
INF Connection registered connIndex=1
```

**Leave this window OPEN!**

---

## STEP 5: Test Public URLs

**Backend:**
```
https://api.protecther.in/api/health
```

**Frontend:**
```
https://kpi.protecther.in
```

Both should work!

---

## STEP 6: Install Tunnel as Service (After Testing Works)

**Run as Administrator:**

```bash
sc create cloudflared-safety binPath= "\"C:\Program Files (x86)\cloudflared\cloudflared.exe\" tunnel --config C:\Users\PC-09\.cloudflared\safety-config.yml run safety-backend" start= auto

sc start cloudflared-safety
```

---

## If Something Fails:

### Backend won't start?
```bash
cd backend
npm run build
pm2 restart safety-backend
pm2 logs safety-backend
```

### Frontend won't start?
```bash
cd frontend
npm run build
cd ..
pm2 restart safety-frontend
pm2 logs safety-frontend
```

### Tunnel fails?
```bash
# Check config exists
dir C:\Users\PC-09\.cloudflared\safety-config.yml

# Check credentials exist
dir C:\Users\PC-09\.cloudflared\6accec6f-0830-4493-954f-d61ed212ca62.json
```

---

## Commands to Remember:

```bash
# Check what's running
pm2 status

# View logs
pm2 logs safety-backend
pm2 logs safety-frontend

# Restart everything
pm2 restart all

# Stop tunnel service
sc stop cloudflared-safety

# Start tunnel service
sc start cloudflared-safety
```

---

## Final Result:

Your URLs:
- **Frontend:** https://kpi.protecther.in
- **Backend API:** https://api.protecther.in/api

---

**START WITH STEP 1 NOW!**
