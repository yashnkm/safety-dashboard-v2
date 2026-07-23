# 🚀 Getting Started - Safety Dashboard V2

Welcome! This guide will get you up and running in **under 10 minutes**.

## 📋 Prerequisites

Before you begin, make sure you have:
- ✅ Node.js 18+ installed ([Download](https://nodejs.org))
- ✅ PostgreSQL 15+ installed ([Download](https://www.postgresql.org/download/))
- ✅ Git installed ([Download](https://git-scm.com/downloads))
- ✅ A code editor (VS Code recommended)

## ⚡ Quick Start

### 1️⃣ Clone & Install (2 min)

```bash
# Navigate to project directory
cd "safety-dashboard-v2"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2️⃣ Setup Database (2 min)

```bash
# Create PostgreSQL database
createdb safety_dashboard_v2

# Or using psql:
psql -U postgres
CREATE DATABASE safety_dashboard_v2;
\q
```

### 3️⃣ Configure Environment (1 min)

```bash
# Backend configuration
cd backend
cp .env.example .env

# Edit .env with your database credentials
# Update DATABASE_URL with your PostgreSQL connection string
```

**Backend `.env` example:**
```env
DATABASE_URL="postgresql://postgres:yourpassword@localhost:5432/safety_dashboard_v2?schema=public"
JWT_SECRET="your-super-secret-random-string-here-make-it-long"
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173
PORT=5000
NODE_ENV=development
```

**Frontend `.env` (optional):**
```bash
cd ../frontend
echo "VITE_API_URL=http://localhost:5000/api" > .env
```

### 4️⃣ Initialize Database (2 min)

```bash
cd backend

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed with sample data
npm run prisma:seed
```

### 5️⃣ Create Admin User (2 min)

```bash
# Interactive admin creation
npm run create-admin

# Follow the prompts:
# - Company Name: Your Company
# - Company Code: COMP001
# - Admin Email: admin@company.com
# - Admin Password: admin123
# - Admin Full Name: Admin User
```

### 6️⃣ Start Development Servers (1 min)

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev
```
✅ Backend running at: http://localhost:5000

**Terminal 2 - Frontend:**
```bash
cd frontend
npm run dev
```
✅ Frontend running at: http://localhost:5173

## 🎉 You're Ready!

Visit **http://localhost:5173** and login with:
- **Email:** admin@company.com
- **Password:** admin123

## 📚 What's Next?

### Learn the System
- **Dashboard**: View safety metrics and KPIs
- **Import Data**: Upload Excel files with safety statistics
- **Admin Panel**: Manage users, sites, and permissions
- **Settings**: Configure company-specific thresholds

### Common Tasks

**View Database:**
```bash
cd backend
npm run prisma:studio
```
Opens Prisma Studio at http://localhost:5555

**Add More Users:**
- Login as admin → Go to Admin Panel → Users → Create User

**Add Sites:**
- Login as admin → Go to Admin Panel → Sites → Create Site

**Import Excel Data:**
- Login → Click "Import Data" → Upload Excel file

### Development Tools

**Backend Scripts:**
- `npm run dev` - Start with hot reload
- `npm run build` - Compile TypeScript
- `npm start` - Run production build
- `npm run prisma:studio` - Database GUI
- `npm run create-admin` - Create admin user
- `npm run generate-password <pwd>` - Generate password hash

**Frontend Scripts:**
- `npm run dev` - Start dev server
- `npm run build` - Production build
- `npm run preview` - Preview production build

## 🐛 Troubleshooting

### Database Connection Failed
```bash
# Check PostgreSQL is running
pg_isready

# Verify database exists
psql -U postgres -l | grep safety_dashboard_v2

# Check .env DATABASE_URL is correct
```

### Backend Won't Start
```bash
# Clear and reinstall
rm -rf node_modules package-lock.json
npm install

# Regenerate Prisma Client
npm run prisma:generate
```

### Frontend Can't Connect to API
```bash
# Check backend is running on port 5000
curl http://localhost:5000/api/health

# Verify VITE_API_URL in frontend/.env
# Should be: http://localhost:5000/api
```

### Port Already in Use
```bash
# Backend (port 5000)
lsof -ti:5000 | xargs kill -9

# Frontend (port 5173)
lsof -ti:5173 | xargs kill -9
```

## 📖 Documentation

- **README.md** - Project overview and architecture
- **[deployment/LOCAL_DEPLOYMENT_GUIDE.md](deployment/LOCAL_DEPLOYMENT_GUIDE.md)** - Self-hosted deployment instructions

## 🔐 Security Notes

**Development:**
- Default admin password is `admin123`
- **Change it immediately after first login!**
- JWT_SECRET should be a long random string
- Never commit `.env` files to git

**Production:**
- Use strong passwords (16+ characters)
- Enable HTTPS (handled by the Cloudflare Tunnel)
- Rotate JWT secrets periodically
- Enable rate limiting (already configured)

## 🎯 Key Features Overview

### Multi-Tenancy
- Each company has isolated data
- Multiple sites per company
- Site-specific user access control

### User Roles
- **SUPER_ADMIN**: Full system access, all companies
- **ADMIN**: Full company access, user management
- **MANAGER**: Site-level access (configurable)
- **VIEWER**: Read-only access

### Dashboard
- 32 safety parameters tracked
- Monthly trend analysis
- Visual KPI indicators (gauge charts)
- Excel import/export
- Filterable by site, month, year

### Admin Panel
- User management with role assignment
- Site creation and management
- Company-scoped site assignments
- Access level configuration

## 💡 Tips

1. **Use Prisma Studio** for quick database inspection
2. **Check backend logs** if API calls fail
3. **Browser DevTools** shows frontend errors
4. **Admin panel** has user management, use it to create test accounts
5. **Import Excel** to quickly populate dashboard with data

## 🚀 Ready to Deploy?

See **[deployment/LOCAL_DEPLOYMENT_GUIDE.md](deployment/LOCAL_DEPLOYMENT_GUIDE.md)** for self-hosted deployment instructions.

---

Need help? Check the main **[README.md](./README.md)** for detailed architecture and features.
