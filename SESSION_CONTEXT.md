# Protecther Safety Dashboard - Session Context

**Date:** 2026-04-12
**Session Summary:** Fixed deployment URLs and configured auto-start

---

## Project Overview

**Protecther Safety Dashboard V2** - Enterprise-grade safety metrics management dashboard for manufacturing organizations.

### Tech Stack
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS 4, Shadcn UI
- **Backend:** Express 5, TypeScript, Prisma ORM, PostgreSQL
- **Deployment:** Cloudflare Tunnel, PM2, nginx

---

## Live URLs

| URL | Purpose |
|-----|---------|
| https://kpi.protecther.in | Frontend Dashboard |
| https://api.protecther.in/api | Backend API |
| http://localhost:3001 | Local Frontend |
| http://localhost:5001 | Local Backend API |

---

## Cloudflare DNS Records (protecther.in)

| Type | Name | Target |
|------|------|--------|
| CNAME | kpi | 6accec6f-0830-4493-954f-d61ed212ca62.cfargotunnel.com |
| CNAME | api | 6accec6f-0830-4493-954f-d61ed212ca62.cfargotunnel.com |

---

## Cloudflare Tunnels

| Tunnel Name | Tunnel ID | Config File |
|-------------|-----------|-------------|
| safety-backend | 6accec6f-0830-4493-954f-d61ed212ca62 | C:\Users\PC-09\.cloudflared\safety-config.yml |
| protecther-tunnel | f99a2285-27d8-47be-aae1-e939518404c7 | C:\Users\PC-09\.cloudflared\config.yml |

### Safety Tunnel Config (safety-config.yml)
```yaml
tunnel: 6accec6f-0830-4493-954f-d61ed212ca62
credentials-file: C:\Users\PC-09\.cloudflared\6accec6f-0830-4493-954f-d61ed212ca62.json

ingress:
  - hostname: kpi.protecther.in
    service: http://localhost:3001
  - hostname: api.protecther.in
    service: http://localhost:5001
  - service: http_status:404
```

---

## PM2 Processes

| Name | Description | Port |
|------|-------------|------|
| safety-backend | Express API server | 5001 |
| safety-frontend | Static file server (serve) | 3001 |
| safety-tunnel | Cloudflare Tunnel | - |

### PM2 Commands
```bash
pm2 list              # Check status
pm2 logs              # View all logs
pm2 logs safety-backend   # View specific logs
pm2 restart all       # Restart all
pm2 save              # Save current state
pm2 resurrect         # Restore saved state
```

---

## Auto-Start Configuration

### On Windows Boot
- **nginx** starts via: `C:\Users\PC-09\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\start-nginx.bat`

### On User Login
- **PM2 processes** start via: `C:\Users\PC-09\AppData\Roaming\Microsoft\Windows\Start Menu\Programs\Startup\Safety Dashboard.lnk`
- This runs: `C:\Protecther Safety Dashboard\safety-dashboard-v2\start-dashboard.bat`
- Which executes: `pm2 resurrect`

---

## Key File Locations

| File | Path |
|------|------|
| Backend Code | C:\Protecther Safety Dashboard\safety-dashboard-v2\backend\ |
| Frontend Code | C:\Protecther Safety Dashboard\safety-dashboard-v2\frontend\ |
| Backend .env | C:\Protecther Safety Dashboard\safety-dashboard-v2\backend\.env |
| Frontend .env | C:\Protecther Safety Dashboard\safety-dashboard-v2\frontend\.env |
| PM2 Ecosystem | C:\Protecther Safety Dashboard\safety-dashboard-v2\ecosystem.config.js |
| Start Script | C:\Protecther Safety Dashboard\safety-dashboard-v2\start-dashboard.bat |
| Tunnel Script | C:\Protecther Safety Dashboard\safety-dashboard-v2\start-tunnel.js |
| nginx Config | C:\nginx\conf\nginx.conf |
| Safety Tunnel Config | C:\Users\PC-09\.cloudflared\safety-config.yml |

---

## Database

- **Type:** PostgreSQL
- **Connection:** Defined in backend\.env (DATABASE_URL)
- **ORM:** Prisma

---

## Demo Accounts

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@abc.com | Admin@123 |
| Manager | manager@abc.com | Manager@123 |
| Viewer | viewer@abc.com | Viewer@123 |

---

## Troubleshooting

### Site not accessible
1. Check PM2: `pm2 list`
2. Check tunnel logs: `pm2 logs safety-tunnel`
3. Verify DNS: `nslookup kpi.protecther.in 8.8.8.8`
4. Flush DNS: Run as admin `ipconfig /flushdns`

### Restart all services
```bash
pm2 restart all
pm2 save
```

### Check service health
```bash
curl https://kpi.protecther.in
curl https://api.protecther.in/api/health
```

---

## Session Changes Made (2026-04-12)

1. Added Cloudflare DNS CNAME records for kpi and api subdomains
2. Started backend and frontend services
3. Configured PM2 with safety-backend, safety-frontend, safety-tunnel
4. Updated cloudflared safety-config.yml (port 5173 -> 3001)
5. Created start-tunnel.js for PM2 tunnel management
6. Updated start-dashboard.bat to use PM2 resurrect
7. Added nginx to Windows startup folder
8. Saved PM2 process list for auto-restore

---

## Public IP
182.156.128.3 (as of session date)
