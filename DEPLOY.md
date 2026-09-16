# Deploying & Operating the Safety Dashboard

Practical runbook for the live system. Written after a day where several
"successful" deploys silently didn't happen — the verification steps below
exist because trusting the tooling's output was wrong.

---

## The system at a glance

| Piece | Where | Port |
|---|---|---|
| Backend API | `backend/dist/index.js`, PM2 app `safety-backend` | 5001 |
| Frontend | `frontend/dist`, PM2 app `safety-frontend` | 3001 |
| Cloudflare tunnel | PM2 app `safety-tunnel` + Windows service `cloudflared-safety` | — |
| Database | Prisma Postgres (`pooled.db.prisma.io`), Protecther-owned account | — |

Public: `kpi.protecther.in` → :3001 · `api.protecther.in` → :5001
(routing in `~/.cloudflared/safety-config.yml`)

The HRMS (`hrms-*` PM2 apps, ports 8000/8001) shares this machine. **`pm2 kill`
stops that too.**

---

## Deploying a code change

```bat
cd "C:\Protecther Safety Dashboard\safety-dashboard-v2\backend"
npx tsc --noEmit
npx vitest run
npm run build
```
Frontend changes: `cd ..\frontend && npm run build` (no restart needed — it is
served from disk).

Then restart the backend:

```bat
pm2 stop safety-backend
pm2 start safety-backend
```

### Two rules that cost hours to learn

**1. Use an ADMIN Command Prompt, not PowerShell.**
PowerShell's execution policy blocks `pm2.ps1`:
`pm2 : File ...\pm2.ps1 cannot be loaded because running scripts is disabled`.
If you must use PowerShell, call the `.cmd` directly:
`& "C:\Users\PC-09\AppData\Roaming\npm\pm2.cmd" stop safety-backend`

**2. `pm2 restart` does NOT work here. Use `stop` then `start`.**
`pm2 restart safety-backend` prints `Applying action restartProcessId ... ✓` and
shows a healthy process table — while spawning no new worker and continuing to
serve the old build. `stop` + `start` has worked every time.

---

## Verifying a deploy actually landed

**Do not trust:** the PM2 output, the process table, or a 200 from
`/api/health` — a stale process answers all three happily.

**Do check** one of these:

```powershell
# a) a worker started AFTER the build
(Get-Item "backend\dist\index.js").LastWriteTime
Get-CimInstance Win32_Process -Filter "Name='node.exe'" |
  Where-Object { $_.CommandLine -notlike '*Daemon.js*' } |
  Sort-Object CreationDate | Select-Object -Last 3 ProcessId,CreationDate

# b) the app logged a new startup banner
Get-Content "$env:USERPROFILE\.pm2\logs\safety-backend-out-3.log" -Tail 5
```

**Best of all: check behaviour.** Call something only the new build does. A
string that only exists in the new code is proof; a timestamp is an inference.

> The PID listening on 5001 is the PM2 **cluster master**. It does not change
> across restarts, so it is useless as a deploy signal.

---

## Database migrations

`prisma generate` fails with `EPERM ... query_engine-windows.dll.node` while the
backend is running — it holds the DLL open. So:

```bat
pm2 stop safety-backend
cd "C:\Protecther Safety Dashboard\safety-dashboard-v2\backend"
npx prisma migrate dev --name <short_name>
npm run build
npx vitest run
pm2 start safety-backend
```

Batch multiple schema changes into one window; each costs a stop/start.

---

## After a reboot

Windows **auto-login is OFF**, so nothing starts until someone logs in:

1. Machine boots — `cloudflared` services start automatically (tunnel is up).
2. **The site returns 502 until you log into Windows.** This is expected.
3. On login, PM2 resurrects all apps from its saved list.

If apps do not come back, from an **admin Command Prompt**:
```bat
pm2 kill
pm2 resurrect
```
(`kill` stops the HRMS too; `resurrect` restores everything.)

After changing which apps run: `pm2 save` — otherwise a reboot restores the old
set.

Enabling auto-login (`netplwiz`, or Sysinternals Autologon run as admin) removes
this manual step and makes the 2 AM backup run on time.

---

## Backups

Scheduled task **"Protecther DB Backup"**, daily 02:00, writes to
`C:\Protecther Safety Dashboard\db-backups\`:

- `.sql` — full `pg_dump`, the restore path
- `.json` — portable per-table export

14-day retention, pruned automatically. Log:
`db-backup-tool\backup.log`. Run on demand:
```bat
node "C:\Protecther Safety Dashboard\db-backup-tool\backup_db.js"
```

Restore into an empty database:
```bat
"C:\Program Files\PostgreSQL\17\bin\psql.exe" "<DATABASE_URL>" -f <backup>.sql
```

> The pooled connection has an empty `search_path`, so in `psql` you must write
> `public.users`, not `users`. Prisma is unaffected.

**These files contain bcrypt password hashes — never commit or upload them.**

---

## Monitoring

- **Admin → Errors** — unexpected failures (5xx and crashes), kept 90 days.
  Empty is the healthy state. Check weekly.
- **Admin → Activity** — every API request, kept 14 days.
- Uptime monitor points at `https://api.protecther.in/api/health` — the right
  target, because the frontend can return 200 while the backend is dead.

---

## Secrets

`backend/.env` holds `DATABASE_URL`, `JWT_SECRET`, `EMAIL_*`. It is gitignored —
**keep it that way.** A `DATABASE_URL` was once committed to a public repo and
sat there for ten months; the fix was migrating the database and wiping the old
one, because a leaked credential cannot be un-published.

Before committing, check you are not adding a secret:
```bat
git diff --staged
```

Rotating `JWT_SECRET` signs everybody out immediately — occasionally useful, but
know that it is a blunt instrument.
