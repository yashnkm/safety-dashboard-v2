# Auto-Start Setup Guide

## Overview

This guide sets up all 3 services to start automatically on Windows boot:
1. **Backend** (PM2) - Port 5001
2. **Frontend** (PM2) - Port 3001
3. **Cloudflare Tunnel** (Windows Service)

---

## STEP 1: Setup PM2 Auto-Start

### Install PM2 Windows Startup

```bash
npm install -g pm2-windows-startup
pm2-startup install
```

### Start Both Backend & Frontend

```bash
cd "C:\Protecther Safety Dashboard\safety-dashboard-v2"

# Stop any existing instances
pm2 delete all

# Start both services
pm2 start ecosystem.config.js

# Check status
pm2 status
```

You should see:
- safety-backend (online)
- safety-frontend (online)

### Save PM2 Configuration

```bash
pm2 save
```

**This saves the current PM2 apps to auto-start on boot!** ✅

---

## STEP 2: Install Cloudflare Tunnel as Windows Service

### Run the Install Script (as Administrator)

1. **Right-click** on `install-tunnel-service.bat`
2. Select **"Run as Administrator"**
3. Confirm installation

### Verify Service is Running

```bash
sc query cloudflared-safety
```

Should show: `STATE: RUNNING`

---

## STEP 3: Test Auto-Start

### Restart Your Computer

```bash
shutdown /r /t 0
```

### After Restart, Verify Everything Started

```bash
# Check PM2 apps
pm2 status

# Check tunnel service
sc query cloudflared-safety

# Check PostgreSQL
Get-Service postgresql*
```

### Test the URLs

1. **Backend:** http://localhost:5001/api/health
2. **Frontend:** http://localhost:3001
3. **Public Frontend:** https://kpi.protecther.in
4. **Public Backend:** https://api.protecther.in/api/health

All should work! ✅

---

## Management Commands

### PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs
pm2 logs safety-backend
pm2 logs safety-frontend

# Restart
pm2 restart all
pm2 restart safety-backend
pm2 restart safety-frontend

# Stop
pm2 stop all

# Delete
pm2 delete all
```

### Tunnel Service Commands

```bash
# Check status
sc query cloudflared-safety

# Stop
sc stop cloudflared-safety

# Start
sc start cloudflared-safety

# Restart
sc stop cloudflared-safety && sc start cloudflared-safety

# Remove service
sc delete cloudflared-safety
```

### PostgreSQL Commands

```bash
# Check status
Get-Service postgresql*

# Start
Start-Service postgresql-x64-15

# Stop
Stop-Service postgresql-x64-15

# Restart
Restart-Service postgresql-x64-15
```

---

## Troubleshooting

### Backend Won't Start

```bash
# Check logs
pm2 logs safety-backend

# Rebuild
cd backend
npm run build
cd ..
pm2 restart safety-backend
```

### Frontend Won't Start

```bash
# Check logs
pm2 logs safety-frontend

# Rebuild
cd frontend
npm run build
cd ..
pm2 restart safety-frontend
```

### Tunnel Not Working

```bash
# Check service status
sc query cloudflared-safety

# View tunnel info
cloudflared tunnel info safety-backend

# Restart service
sc stop cloudflared-safety
sc start cloudflared-safety
```

### PostgreSQL Not Running

```bash
# Start PostgreSQL
Start-Service postgresql-x64-15

# Set to auto-start
Set-Service -Name postgresql-x64-15 -StartupType Automatic
```

---

## Quick Start (After Setup)

Everything should start automatically on boot. If you need to manually start:

```bash
# 1. Ensure PostgreSQL is running
Get-Service postgresql*

# 2. Start PM2 apps
pm2 resurrect

# 3. Start tunnel service
sc start cloudflared-safety

# 4. Check everything
pm2 status
sc query cloudflared-safety
```

---

## Complete Stop (Shutdown Everything)

```bash
# Stop PM2 apps
pm2 stop all

# Stop tunnel
sc stop cloudflared-safety

# Stop PostgreSQL (optional)
Stop-Service postgresql-x64-15
```

---

## URLs Reference

### Local Access
- Backend API: http://localhost:5001/api
- Frontend: http://localhost:3001
- Database: localhost:5432

### Public Access
- Frontend: https://kpi.protecther.in
- Backend API: https://api.protecther.in/api

### Admin Tools
- Prisma Studio: `npx prisma studio` (http://localhost:5555)
- PM2 Monitor: `pm2 monit`

---

## System Requirements

- **RAM**: At least 4GB (8GB recommended)
- **Disk**: At least 10GB free space
- **Internet**: Stable connection with minimum 5 Mbps upload
- **Power**: UPS recommended for 24/7 uptime

---

## Backup & Recovery

### Database Backup

Create `backup-db.bat`:

```batch
@echo off
set BACKUP_DIR=C:\Backups\SafetyDashboard
set PGPASSWORD=root
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -U postgres -F c -b -v -f "%BACKUP_DIR%\safety_db_%TIMESTAMP%.backup" safety_dashboard_v2

echo Backup completed!
```

Schedule with Windows Task Scheduler (daily at 2 AM).

### Configuration Backup

Keep copies of:
- `backend/.env`
- `frontend/.env`
- `ecosystem.config.js`
- `C:\Users\PC-09\.cloudflared\safety-config.yml`

---

**All set! Your Safety Dashboard will now run 24/7!** 🎉
