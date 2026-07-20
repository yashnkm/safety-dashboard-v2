# Local Deployment Guide (Windows 24/7 Server)

## Overview

This guide will help you deploy the Safety Dashboard application on your Windows machine running 24/7 as a self-hosted server with local PostgreSQL database.

**Architecture:**
- **Frontend**: React + Vite (served via `serve` or nginx)
- **Backend**: Express + TypeScript + Prisma (managed by PM2)
- **Database**: PostgreSQL (local installation)
- **Public Access**: Cloudflare Tunnel (recommended) or alternatives

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Step 1: Install PostgreSQL](#step-1-install-postgresql-locally)
3. [Step 2: Create Database](#step-2-create-database)
4. [Step 3: Configure Backend](#step-3-configure-backend)
5. [Step 4: Set Up Database Schema](#step-4-set-up-database-schema)
6. [Step 5: Create Admin User](#step-5-create-admin-user)
7. [Step 6: Build Frontend](#step-6-build-frontend)
8. [Step 7: Set Up 24/7 Server with PM2](#step-7-set-up-247-server-with-pm2)
9. [Step 8: Serve Frontend](#step-8-serve-frontend)
10. [Step 9: Local Network Access](#step-9-local-network-access)
11. [Step 10: Public Internet Access](#step-10-public-internet-access)
12. [Security Considerations](#security-considerations)
13. [Maintenance & Backups](#maintenance--backups)
14. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- Windows 10/11 (64-bit)
- Node.js 18+ (check with `node --version`)
- npm 9+ (check with `npm --version`)
- Administrator access for installations
- Stable internet connection
- At least 4GB RAM and 10GB free disk space

---

## Step 1: Install PostgreSQL Locally

### Option A: PostgreSQL Official Installer (Recommended)

1. Download from: https://www.postgresql.org/download/windows/
2. Run installer (postgresql-15.x-windows-x64.exe)
3. Installation settings:
   - **Installation Directory**: Default (`C:\Program Files\PostgreSQL\15`)
   - **Data Directory**: Default
   - **Port**: `5432` (default)
   - **Password**: Choose a **strong password** for `postgres` user (WRITE IT DOWN!)
   - **Locale**: Default
4. Components to install:
   - ✅ PostgreSQL Server
   - ✅ pgAdmin 4 (GUI tool)
   - ✅ Command Line Tools
   - ❌ Stack Builder (optional)

### Option B: Using Chocolatey

```bash
# If you have Chocolatey installed
choco install postgresql
```

### Verify Installation

```bash
# Open PowerShell or Command Prompt
psql --version
# Should display: psql (PostgreSQL) 15.x

# Check service is running
Get-Service -Name postgresql*
# Status should be "Running"
```

---

## Step 2: Create Database

### Using pgAdmin (GUI Method)

1. Open **pgAdmin 4** (installed with PostgreSQL)
2. Connect to local server:
   - Host: `localhost`
   - Port: `5432`
   - Username: `postgres`
   - Password: (the password you set during installation)
3. Right-click **Databases** → **Create** → **Database**
4. Settings:
   - **Database name**: `safety_dashboard_v2`
   - **Owner**: `postgres`
   - Click **Save**

### Using Command Line (CLI Method)

```bash
# Open Command Prompt or PowerShell
# Connect to PostgreSQL
psql -U postgres

# Enter your postgres password when prompted

# Create database
CREATE DATABASE safety_dashboard_v2;

# (Optional) Create dedicated user
CREATE USER safety_admin WITH PASSWORD 'your_strong_password_here';
GRANT ALL PRIVILEGES ON DATABASE safety_dashboard_v2 TO safety_admin;

# List databases to verify
\l

# Exit psql
\q
```

---

## Step 3: Configure Backend

### Create Backend Environment File

Create a new file `backend/.env` with the following content:

```env
# ========================================
# DATABASE CONFIGURATION
# ========================================
# Local PostgreSQL Connection
DATABASE_URL="postgresql://postgres:YOUR_PASSWORD@localhost:5432/safety_dashboard_v2?schema=public"

# If you created a custom user:
# DATABASE_URL="postgresql://safety_admin:YOUR_PASSWORD@localhost:5432/safety_dashboard_v2?schema=public"

# ========================================
# SERVER CONFIGURATION
# ========================================
PORT=5000
NODE_ENV=production

# ========================================
# SECURITY
# ========================================
# Generate this using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET="REPLACE_WITH_GENERATED_SECRET"
JWT_EXPIRY=7d

# ========================================
# CORS CONFIGURATION
# ========================================
# For local access only
CORS_ORIGIN=http://localhost:3000

# For local network access (update with your local IP)
# CORS_ORIGIN=http://192.168.1.100:3000

# For public access with Cloudflare Tunnel
# CORS_ORIGIN=https://your-tunnel-name.trycloudflare.com

# ========================================
# EMAIL CONFIGURATION (Optional)
# ========================================
# Required only for password reset functionality
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your_email@gmail.com
# EMAIL_PASS=your_app_password
```

### Generate JWT Secret

Open PowerShell and run:

```powershell
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Copy the output and replace `REPLACE_WITH_GENERATED_SECRET` in your `.env` file.

### Important Notes

- Replace `YOUR_PASSWORD` with your actual PostgreSQL password
- Never commit `.env` file to git (it's already in `.gitignore`)
- Keep JWT_SECRET secure and random

---

## Step 4: Set Up Database Schema

```bash
# Navigate to backend directory
cd backend

# Install dependencies
npm install

# Generate Prisma Client
npx prisma generate

# Run migrations (creates all tables)
npx prisma migrate deploy

# Verify database structure (opens web UI)
npx prisma studio
# Opens browser at http://localhost:5555
# You should see 8 tables: Company, Site, User, SafetyMetrics, etc.
```

### Expected Tables

After migration, you should have these 8 tables:
1. `Company` - Multi-tenant company data
2. `Site` - Sites belonging to companies
3. `User` - User accounts with roles
4. `UserSiteAccess` - User-site permissions
5. `SafetyMetrics` - Safety data (32 parameters)
6. `CompanySettings` - Configurable weights and targets
7. `AuditLog` - Audit trail
8. `PasswordResetToken` - Password reset tokens

---

## Step 5: Create Admin User

### Using Interactive Script (Recommended)

```bash
cd backend

# Run admin creation script
npm run create-admin

# Follow the prompts:
# Email: admin@yourcompany.com
# Password: (enter a strong password)
# Confirm Password: (re-enter password)
# Full Name: Admin User
```

### Verify User Creation

```bash
# Open Prisma Studio
npx prisma studio

# Navigate to "User" table
# You should see your admin user with role: SUPER_ADMIN
```

### ⚠️ IMPORTANT: Do NOT Use Seed Script in Production

The seed script (`npm run seed`) creates users with **hardcoded passwords** like "Admin@123". This is only for development/testing!

For production, always use `npm run create-admin`.

---

## Step 6: Build Frontend

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Create/update .env file for production
echo VITE_API_URL=http://localhost:5000/api > .env

# For local network access (update with your IP):
# echo VITE_API_URL=http://192.168.1.100:5000/api > .env

# For public access with Cloudflare:
# echo VITE_API_URL=https://api-tunnel-name.trycloudflare.com/api > .env

# Build for production
npm run build

# This creates 'frontend/dist' folder with optimized static files
```

### Verify Build

Check that `frontend/dist` directory contains:
- `index.html`
- `assets/` folder with JS and CSS files
- Other static assets

---

## Step 7: Set Up 24/7 Server with PM2

PM2 is a production process manager that keeps your Node.js apps running forever, automatically restarts on crashes, and starts on system boot.

### Install PM2 Globally

```bash
npm install -g pm2
npm install -g pm2-windows-startup
```

### Configure PM2 for Windows Startup

```bash
# This allows PM2 to start automatically when Windows boots
pm2-startup install
```

### Create PM2 Ecosystem File

Create `ecosystem.config.js` in the **root directory** of the project:

```javascript
module.exports = {
  apps: [
    {
      name: 'safety-backend',
      cwd: './backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      },
      error_file: './logs/backend-error.log',
      out_file: './logs/backend-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
    }
  ]
};
```

### Build and Start Backend

```bash
# Build backend TypeScript to JavaScript
cd backend
npm run build

# Start backend with PM2 (from root directory)
cd ..
pm2 start ecosystem.config.js

# Save PM2 process list (auto-start on boot)
pm2 save

# View status
pm2 status

# View logs
pm2 logs safety-backend

# Stop all apps
pm2 stop all

# Restart all apps
pm2 restart all

# Delete from PM2
pm2 delete safety-backend
```

### PM2 Useful Commands

```bash
# List all processes
pm2 list

# Monitor processes in real-time
pm2 monit

# View logs
pm2 logs
pm2 logs safety-backend --lines 100

# Restart on code changes (after rebuild)
pm2 restart safety-backend

# Stop process
pm2 stop safety-backend

# Delete process
pm2 delete safety-backend

# Clear logs
pm2 flush
```

---

## Step 8: Serve Frontend

You have two options to serve the built frontend:

### Option A: Using `serve` (Simple, Recommended)

```bash
# Install serve globally
npm install -g serve

# Start frontend server on port 3000
serve -s frontend/dist -l 3000

# To run in background, press Ctrl+C and add to PM2
```

#### Add Frontend to PM2 (Optional)

Update `ecosystem.config.js` to include frontend:

```javascript
module.exports = {
  apps: [
    {
      name: 'safety-backend',
      cwd: './backend',
      script: 'dist/index.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production'
      }
    },
    {
      name: 'safety-frontend',
      script: 'serve',
      args: '-s frontend/dist -l 3000',
      instances: 1,
      autorestart: true,
      watch: false
    }
  ]
};
```

Then restart PM2:

```bash
pm2 restart ecosystem.config.js
pm2 save
```

### Option B: Using nginx (Advanced)

#### Install nginx for Windows

```bash
# Using Chocolatey
choco install nginx

# Or download from: http://nginx.org/en/download.html
```

#### Configure nginx

Edit `C:\tools\nginx\conf\nginx.conf` (or your nginx installation path):

```nginx
http {
    server {
        listen 80;
        server_name localhost;

        # Frontend - Serve static files
        location / {
            root "C:/Protecther Safety Dashboard/safety-dashboard-v2/frontend/dist";
            try_files $uri $uri/ /index.html;
            index index.html;
        }

        # Backend - Reverse proxy to Express
        location /api {
            proxy_pass http://localhost:5000;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            proxy_cache_bypass $http_upgrade;
        }
    }
}
```

#### Start nginx

```bash
# Start nginx
nginx

# Reload configuration
nginx -s reload

# Stop nginx
nginx -s stop

# Test configuration
nginx -t
```

---

## Step 9: Local Network Access

### Access on Same Machine

Your application is now running at:
- **Frontend**: http://localhost:3000 (or http://localhost:80 with nginx)
- **Backend API**: http://localhost:5000/api
- **Database**: localhost:5432
- **Prisma Studio**: http://localhost:5555 (when running `npx prisma studio`)

### Access from Other Devices on Local Network

#### 1. Find Your Local IP Address

```bash
# PowerShell
ipconfig

# Look for "IPv4 Address" under your active network adapter
# Example: 192.168.1.100
```

#### 2. Update Backend CORS

Edit `backend/.env`:

```env
CORS_ORIGIN=http://192.168.1.100:3000
```

Restart backend:

```bash
pm2 restart safety-backend
```

#### 3. Update Frontend API URL

Edit `frontend/.env`:

```env
VITE_API_URL=http://192.168.1.100:5000/api
```

Rebuild frontend:

```bash
cd frontend
npm run build
```

Restart frontend (if using PM2):

```bash
pm2 restart safety-frontend
```

#### 4. Configure Windows Firewall

Allow incoming connections on required ports:

```bash
# Run PowerShell as Administrator

# Allow backend (port 5000)
netsh advfirewall firewall add rule name="Safety Dashboard Backend" dir=in action=allow protocol=TCP localport=5000

# Allow frontend (port 3000)
netsh advfirewall firewall add rule name="Safety Dashboard Frontend" dir=in action=allow protocol=TCP localport=3000

# If using nginx (port 80)
netsh advfirewall firewall add rule name="Nginx HTTP" dir=in action=allow protocol=TCP localport=80
```

#### 5. Access from Other Devices

From any device on the same network:
- Frontend: http://192.168.1.100:3000
- Backend: http://192.168.1.100:5000

---

## Step 10: Public Internet Access

Choose one of the following options to make your application accessible from the internet:

---

### Option A: Cloudflare Tunnel (RECOMMENDED)

**Best option**: Free, secure, no port forwarding, automatic HTTPS, hides your home IP.

#### Step 1: Install Cloudflare Tunnel

```bash
# Download from: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/installation/

# Or using winget (Windows Package Manager)
winget install --id Cloudflare.cloudflared
```

#### Step 2: Authenticate with Cloudflare

```bash
# Login (opens browser for authentication)
cloudflared tunnel login

# This requires a free Cloudflare account
# Select the domain you want to use (or create a free subdomain)
```

#### Step 3: Create Tunnel

```bash
# Create a named tunnel
cloudflared tunnel create safety-dashboard

# This will output:
# - Tunnel ID (save this!)
# - Credentials file location
```

#### Step 4: Configure Tunnel

Create config file at: `C:\Users\YourUsername\.cloudflared\config.yml`

```yaml
tunnel: YOUR_TUNNEL_ID_HERE
credentials-file: C:\Users\YourUsername\.cloudflared\YOUR_TUNNEL_ID.json

ingress:
  # Frontend
  - hostname: safety-dashboard.yourdomain.com
    service: http://localhost:3000

  # Backend API
  - hostname: api-safety.yourdomain.com
    service: http://localhost:5000

  # Catch-all rule (required)
  - service: http_status:404
```

Replace:
- `YOUR_TUNNEL_ID_HERE` with the tunnel ID from step 3
- `yourdomain.com` with your actual domain (or use `trycloudflare.com` for free subdomain)

#### Step 5: Create DNS Records

```bash
# Add DNS records pointing to your tunnel
cloudflared tunnel route dns safety-dashboard safety-dashboard.yourdomain.com
cloudflared tunnel route dns safety-dashboard api-safety.yourdomain.com
```

Or manually add CNAME records in Cloudflare dashboard:
- `safety-dashboard.yourdomain.com` → `YOUR_TUNNEL_ID.cfargotunnel.com`
- `api-safety.yourdomain.com` → `YOUR_TUNNEL_ID.cfargotunnel.com`

#### Step 6: Update Application Configuration

**Backend** (`backend/.env`):
```env
CORS_ORIGIN=https://safety-dashboard.yourdomain.com
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=https://api-safety.yourdomain.com/api
```

Rebuild and restart:
```bash
cd frontend
npm run build
cd ../backend
pm2 restart safety-backend
pm2 restart safety-frontend
```

#### Step 7: Run Tunnel

```bash
# Test run
cloudflared tunnel run safety-dashboard

# If working, install as Windows service for 24/7 operation
cloudflared service install
cloudflared service start
```

#### Step 8: Access Your Application

Visit: `https://safety-dashboard.yourdomain.com`

**Benefits:**
- ✅ Free SSL/HTTPS automatically
- ✅ No port forwarding needed
- ✅ Hides your home IP address
- ✅ DDoS protection included
- ✅ Works behind any firewall/NAT
- ✅ Automatic reconnection if internet drops

---

### Option B: Dynamic DNS + Port Forwarding

**Warning**: This exposes your home IP address and requires router configuration.

#### Step 1: Sign Up for Dynamic DNS

Free providers:
- **No-IP**: https://www.noip.com/
- **DuckDNS**: https://www.duckdns.org/
- **FreeDNS**: https://freedns.afraid.org/

You'll get a hostname like: `safety-dashboard.ddns.net`

#### Step 2: Configure Router Port Forwarding

Access your router's admin panel (usually http://192.168.1.1 or http://192.168.0.1):

1. Find "Port Forwarding" or "Virtual Server" settings
2. Add rules:
   - **External Port 80** → Internal IP `192.168.1.100` Port `3000` (Frontend)
   - **External Port 5000** → Internal IP `192.168.1.100` Port `5000` (Backend)

#### Step 3: Configure Windows Firewall

```bash
# Run as Administrator
netsh advfirewall firewall add rule name="Safety Frontend Public" dir=in action=allow protocol=TCP localport=3000
netsh advfirewall firewall add rule name="Safety Backend Public" dir=in action=allow protocol=TCP localport=5000
```

#### Step 4: Update Application

**Backend** (`backend/.env`):
```env
CORS_ORIGIN=http://safety-dashboard.ddns.net
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=http://safety-dashboard.ddns.net:5000/api
```

#### Step 5: Access

Visit: `http://safety-dashboard.ddns.net`

**Downsides:**
- ❌ Exposes your home IP address
- ❌ No HTTPS (unless you configure Let's Encrypt)
- ❌ Security risk if misconfigured
- ❌ Requires router access

---

### Option C: ngrok (Easy but Limited)

**Quick testing only** - free tier has significant limitations.

#### Install ngrok

```bash
# Using Chocolatey
choco install ngrok

# Or download from: https://ngrok.com/download
```

#### Sign Up and Configure

1. Create free account at https://ngrok.com/
2. Get your auth token
3. Configure ngrok:

```bash
ngrok config add-authtoken YOUR_AUTH_TOKEN
```

#### Start Tunnels

```bash
# Terminal 1 - Frontend
ngrok http 3000

# Terminal 2 - Backend
ngrok http 5000
```

You'll get URLs like:
- Frontend: `https://abc123.ngrok.io`
- Backend: `https://def456.ngrok.io`

#### Update Configuration

**Backend** (`backend/.env`):
```env
CORS_ORIGIN=https://abc123.ngrok.io
```

**Frontend** (`frontend/.env`):
```env
VITE_API_URL=https://def456.ngrok.io/api
```

**Free Tier Limitations:**
- ❌ Random URLs change on each restart (unless paid plan)
- ❌ 40 connections per minute limit
- ❌ Session expires (need to manually restart)
- ❌ Not suitable for 24/7 production use

---

## Security Considerations

### 1. Strong Passwords

- Use strong password for PostgreSQL `postgres` user
- Use strong password for admin user
- Use random 32+ character JWT_SECRET
- Never use default/seed passwords in production

### 2. Firewall Configuration

```bash
# Only allow necessary ports
# For local network only:
netsh advfirewall firewall add rule name="Safety Backend" dir=in action=allow protocol=TCP localport=5000 remoteip=localsubnet

# For public access with Cloudflare Tunnel:
# No firewall rules needed! Cloudflare Tunnel creates outbound connection only
```

### 3. Rate Limiting

Already configured in backend (`backend/src/index.ts`):
- 10,000 requests per 15 minutes per IP
- Adjust if needed in code

### 4. HTTPS/SSL

- **With Cloudflare Tunnel**: Automatic HTTPS ✅
- **With port forwarding**: Use Let's Encrypt + Certbot
- **Local network only**: Not required

### 5. Database Security

```bash
# Ensure PostgreSQL only listens on localhost
# Edit: C:\Program Files\PostgreSQL\15\data\postgresql.conf
listen_addresses = 'localhost'

# Restart PostgreSQL service
Restart-Service postgresql-x64-15
```

### 6. Regular Updates

```bash
# Update dependencies monthly
cd backend
npm update
npm audit fix

cd frontend
npm update
npm audit fix
```

---

## Maintenance & Backups

### Automatic Database Backups

Create `backup-db.bat` in project root:

```batch
@echo off
REM Backup Safety Dashboard Database
set BACKUP_DIR=C:\Backups\SafetyDashboard
set PGPASSWORD=YOUR_POSTGRES_PASSWORD
set TIMESTAMP=%date:~-4,4%%date:~-10,2%%date:~-7,2%_%time:~0,2%%time:~3,2%
set TIMESTAMP=%TIMESTAMP: =0%

if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

"C:\Program Files\PostgreSQL\15\bin\pg_dump.exe" -U postgres -F c -b -v -f "%BACKUP_DIR%\safety_dashboard_%TIMESTAMP%.backup" safety_dashboard_v2

echo Backup completed: %BACKUP_DIR%\safety_dashboard_%TIMESTAMP%.backup
```

### Schedule Backup with Task Scheduler

1. Open **Task Scheduler** (Windows + R → `taskschd.msc`)
2. Create Basic Task:
   - Name: "Safety Dashboard Backup"
   - Trigger: Daily at 2:00 AM
   - Action: Start a program
   - Program: `C:\Protecther Safety Dashboard\safety-dashboard-v2\backup-db.bat`
3. Save and test

### Restore Database

```bash
# Stop backend
pm2 stop safety-backend

# Restore from backup
"C:\Program Files\PostgreSQL\15\bin\pg_restore.exe" -U postgres -d safety_dashboard_v2 -c "C:\Backups\SafetyDashboard\safety_dashboard_20250113_0200.backup"

# Start backend
pm2 start safety-backend
```

### Log Rotation

PM2 automatically manages logs, but you can configure rotation:

```bash
# Install PM2 log rotate module
pm2 install pm2-logrotate

# Configure (keep 7 days of logs)
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7
pm2 set pm2-logrotate:compress true
```

### Monitor Disk Space

```bash
# Check disk usage
Get-PSDrive C | Select-Object Used,Free

# Check database size
psql -U postgres -d safety_dashboard_v2 -c "SELECT pg_size_pretty(pg_database_size('safety_dashboard_v2'));"
```

---

## Troubleshooting

### Backend Not Starting

```bash
# Check PM2 logs
pm2 logs safety-backend

# Common issues:
# 1. Database connection failed
#    - Verify PostgreSQL is running: Get-Service postgresql*
#    - Check DATABASE_URL in backend/.env
#    - Test connection: psql -U postgres -d safety_dashboard_v2

# 2. Port already in use
#    - Check what's using port 5000: netstat -ano | findstr :5000
#    - Change PORT in backend/.env

# 3. Prisma client not generated
cd backend
npx prisma generate
pm2 restart safety-backend
```

### Frontend Not Loading

```bash
# Check if serve is running
pm2 logs safety-frontend

# Rebuild frontend
cd frontend
npm run build

# Check dist folder exists
dir dist

# Restart serve
pm2 restart safety-frontend
```

### Database Connection Issues

```bash
# Test PostgreSQL connection
psql -U postgres -d safety_dashboard_v2

# If "psql: error: connection to server failed":
# 1. Check PostgreSQL service
Get-Service postgresql*

# 2. Start if stopped
Start-Service postgresql-x64-15

# 3. Check PostgreSQL logs
# Located in: C:\Program Files\PostgreSQL\15\data\log\
```

### CORS Errors

```bash
# Update CORS_ORIGIN in backend/.env to match frontend URL
# Examples:
# Local: http://localhost:3000
# Network: http://192.168.1.100:3000
# Cloudflare: https://safety-dashboard.yourdomain.com

# Restart backend
pm2 restart safety-backend
```

### Can't Access from Other Devices

```bash
# 1. Check Windows Firewall rules
netsh advfirewall firewall show rule name=all | findstr "Safety"

# 2. Add rules if missing (run as Administrator)
netsh advfirewall firewall add rule name="Safety Backend" dir=in action=allow protocol=TCP localport=5000
netsh advfirewall firewall add rule name="Safety Frontend" dir=in action=allow protocol=TCP localport=3000

# 3. Verify local IP
ipconfig

# 4. Test from other device
# Use: http://YOUR_LOCAL_IP:3000
```

### PM2 Not Starting on Boot

```bash
# Reinstall PM2 startup
pm2 unstartup
pm2-startup install

# Save current process list
pm2 save

# Test restart
pm2 resurrect
```

### High Memory Usage

```bash
# Check memory usage
pm2 monit

# Restart to free memory
pm2 restart all

# Increase max memory restart limit in ecosystem.config.js
max_memory_restart: '2G'
```

---

## Performance Optimization

### Database Optimization

```sql
-- Run in psql
-- Analyze and optimize tables
VACUUM ANALYZE;

-- Check table sizes
SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;
```

### Enable Database Query Logging (Development Only)

Edit `backend/.env`:
```env
# Add for debugging slow queries
DATABASE_URL="postgresql://postgres:password@localhost:5432/safety_dashboard_v2?schema=public&connection_limit=5"
```

### Frontend Build Optimization

Already optimized in Vite config, but you can:
- Enable compression in nginx
- Use CDN for static assets
- Implement service worker for offline support

---

## Useful Commands Reference

### PostgreSQL

```bash
# Start service
Start-Service postgresql-x64-15

# Stop service
Stop-Service postgresql-x64-15

# Connect to database
psql -U postgres -d safety_dashboard_v2

# List databases
psql -U postgres -c "\l"

# Backup
pg_dump -U postgres safety_dashboard_v2 > backup.sql

# Restore
psql -U postgres -d safety_dashboard_v2 < backup.sql
```

### PM2

```bash
# Start
pm2 start ecosystem.config.js

# Stop
pm2 stop all

# Restart
pm2 restart all

# Delete
pm2 delete all

# Logs
pm2 logs
pm2 logs safety-backend --lines 100

# Monitor
pm2 monit

# Save configuration
pm2 save

# Resurrect saved processes
pm2 resurrect
```

### Build & Deploy

```bash
# Full rebuild and deploy
cd backend
npm run build
cd ../frontend
npm run build
cd ..
pm2 restart all
```

---

## Additional Resources

- **PostgreSQL Documentation**: https://www.postgresql.org/docs/
- **PM2 Documentation**: https://pm2.keymetrics.io/docs/
- **Prisma Documentation**: https://www.prisma.io/docs/
- **Cloudflare Tunnel Docs**: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/
- **Vite Documentation**: https://vitejs.dev/

---

## Support

For issues specific to this application:
1. Check logs: `pm2 logs`
2. Review Prisma Studio: `npx prisma studio`
3. Check PostgreSQL logs: `C:\Program Files\PostgreSQL\15\data\log\`
4. Verify environment variables in `backend/.env` and `frontend/.env`

---

## Checklist: Quick Deployment Summary

- [ ] PostgreSQL installed and running
- [ ] Database `safety_dashboard_v2` created
- [ ] `backend/.env` configured with DATABASE_URL and JWT_SECRET
- [ ] Migrations run: `npx prisma migrate deploy`
- [ ] Admin user created: `npm run create-admin`
- [ ] Frontend built: `cd frontend && npm run build`
- [ ] PM2 installed and configured
- [ ] Backend running with PM2: `pm2 start ecosystem.config.js`
- [ ] Frontend served (via `serve` or nginx)
- [ ] Firewall rules configured
- [ ] Application accessible at http://localhost:3000
- [ ] (Optional) Cloudflare Tunnel configured for public access
- [ ] (Optional) Backup script scheduled
- [ ] PM2 saved for auto-start: `pm2 save`

---

**Congratulations!** Your Safety Dashboard is now running 24/7 on your local machine!

Access at:
- **Local**: http://localhost:3000
- **Network**: http://YOUR_LOCAL_IP:3000
- **Public** (if configured): https://your-cloudflare-domain.com
