# Safety Dashboard V2 - Multi-Tenant Enterprise Edition

> Modern, TypeScript-based safety statistics dashboard with multi-tenancy, authentication, and 18 safety parameters.

[![Tech Stack](https://img.shields.io/badge/React-18-blue)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-blue)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green)](https://nodejs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15+-blue)](https://www.postgresql.org/)

---

## 📋 Quick Navigation

- **[Getting Started](docs/GETTING_STARTED.md)** - Setup instructions
- **[Quick Start Guide](docs/QUICK_START.md)** - Fast setup
- **[Deployment Guide](docs/deployment/)** - Production deployment
- **[API Documentation](#api-endpoints)** - Backend API reference
- **[Development Docs](docs/development/)** - Development notes

---

## 🚀 Tech Stack

### Frontend
- **React 18** + **TypeScript** + **Vite**
- **Tailwind CSS** + **Shadcn UI** (pre-configured)
- **React Router** (navigation)
- **React Query** (data fetching & caching)
- **Zustand** (state management)
- **Recharts** (data visualization)
- **Lucide React** (icons)
- **Axios** (HTTP client)

### Backend
- **Node.js 18+** + **TypeScript**
- **Express.js** (REST API)
- **Prisma ORM** (database)
- **PostgreSQL 15+**
- **JWT** (authentication)
- **Bcrypt** (password hashing)
- **Helmet** + **CORS** (security)

---

## 📁 Project Structure

```
safety-dashboard-v2/
├── backend/                 # Express TypeScript backend
│   ├── src/
│   │   ├── config/         # Configuration
│   │   ├── controllers/    # Route controllers
│   │   ├── middleware/     # Auth, error handling
│   │   ├── routes/         # API routes
│   │   ├── services/       # Business logic
│   │   └── index.ts        # Server entry
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   ├── migrations/     # DB migrations
│   │   └── seed.ts         # Seed data
│   └── scripts/            # Helper scripts
│
├── frontend/                # React TypeScript frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/          # Route pages
│   │   ├── services/       # API services
│   │   ├── store/          # State management
│   │   └── types/          # TypeScript types
│   └── package.json
│
├── docs/                    # Documentation
│   ├── deployment/         # Deployment guides
│   ├── development/        # Dev progress
│   └── implementation/     # Feature docs
│
├── data/                    # Data files
│   ├── reference/          # CSV reference data
│   ├── samples/            # Sample Excel files
│   └── secret              # Database credentials
│
└── scripts/                 # Utility scripts
```

---

## 🔑 Login Credentials

Pre-seeded user accounts for development:

| Role | Email | Password | Access |
|------|-------|----------|--------|
| **Super Admin** | admin@abc.com | Admin@123 | Full Access |
| **Manager** | manager@abc.com | Manager@123 | Site-Specific |
| **Viewer** | viewer@abc.com | Viewer@123 | Read-Only |

**Company**: ABC Manufacturing Corp
**Sites**: Manufacturing Plant 1 (Mumbai), Plant 2 (Delhi), HQ (Bangalore)

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### 1. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Setup environment
cp .env.example .env
# Edit .env with your database credentials

# Run migrations
npm run prisma:migrate

# Seed database (optional)
npm run prisma:seed

# Start server
npm run dev
```

Backend runs on: **http://localhost:5000**

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env (optional)
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start dev server
npm run dev
```

Frontend runs on: **http://localhost:5173**

### 3. Access Application

1. Open browser: http://localhost:5173
2. Login with credentials above
3. Explore the dashboard

---

## 🗄️ Database Configuration

### Local PostgreSQL

Update `backend/.env`:

```env
DATABASE_URL="postgresql://postgres:root@localhost:5432/safety_dashboard_v2?schema=public"
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secure_secret_key
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173
```

### Database Schema (8 Models)

1. **Company** - Multi-tenant company data
2. **Site** - Multiple sites per company
3. **User** - Role-based access (SUPER_ADMIN, ADMIN, MANAGER, VIEWER)
4. **UserSiteAccess** - Site-specific permissions
5. **SafetyMetrics** - 18 safety parameters
6. **CompanySettings** - Configurable weights
7. **AuditLog** - Audit trail
8. **PasswordResetToken** - Password reset

---

## 📊 18 Safety Parameters

### Categories

**Operational (2)**
- Man Days, Safe Work Hours

**Training (3)**
- Safety Induction, Toolbox Talk, Job Specific Training

**Inspection & Compliance (6)**
- Formal Safety Inspection, Non-Compliance Raised/Close, Safety Observation Raised/Close, Work Permit, Safe Work Method Statement

**Preparedness & Audit (2)**
- Emergency Mock Drills, Internal Audit

**Incidents (4)**
- Near Miss, First Aid Injury, Medical Treatment Injury, Lost Time Injury

Each parameter tracks: **Target**, **Actual**, **Score**

---

## 🎯 Key Features

### ✅ Implemented

- [x] JWT authentication & authorization
- [x] Role-based access control (4 roles)
- [x] Site-level access restrictions
- [x] Multi-tenant data isolation
- [x] Interactive dashboard with charts
- [x] Excel import functionality
- [x] Admin panel (user/site management)
- [x] Configurable scoring weights
- [x] Audit logging system
- [x] Monthly trend visualization
- [x] KPI cards & gauge charts

### 🚧 Future Enhancements

- [ ] PDF report generation
- [ ] Email notifications
- [ ] Advanced analytics & predictions
- [ ] Mobile app (React Native)
- [ ] Real-time notifications
- [ ] Multi-format data export

---

## 🔌 API Endpoints

### Authentication
```
POST   /api/auth/login      - User login
POST   /api/auth/logout     - User logout
GET    /api/auth/me         - Get current user
POST   /api/auth/refresh    - Refresh token
```

### Dashboard
```
GET    /api/dashboard/metrics    - Get safety metrics
GET    /api/dashboard/sites      - Get accessible sites
POST   /api/dashboard/import     - Import Excel (ADMIN only)
```

### Admin
```
GET    /api/admin/users          - List users
POST   /api/admin/users          - Create user
PUT    /api/admin/users/:id      - Update user
DELETE /api/admin/users/:id      - Delete user
GET    /api/admin/sites          - List sites
POST   /api/admin/sites          - Create site
GET    /api/admin/settings       - Get company settings
PUT    /api/admin/settings       - Update settings
```

---

## 🛠️ Available Scripts

### Backend
```bash
npm run dev                  # Start dev server
npm run build                # Compile TypeScript
npm start                    # Run production
npm run prisma:generate      # Generate Prisma Client
npm run prisma:migrate       # Run migrations
npm run prisma:seed          # Seed database
npm run prisma:studio        # Open Prisma Studio
npm run create-admin         # Create admin user
npm run generate-password    # Generate password hash
```

### Frontend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview build
npm run lint         # Run ESLint
```

---

## 🔐 Security Features

- **JWT Authentication** - Secure token-based auth
- **Password Hashing** - Bcrypt with 10 rounds
- **Role-Based Access** - 4-tier permission system
- **Rate Limiting** - 10,000 requests per 15 minutes
- **CORS Protection** - Configurable origin whitelist
- **Helmet.js** - Security headers
- **Input Validation** - Request validation

---

## 🚀 Deployment

This application is ready for **100% FREE hosting**!

### Hosting Stack (Free Tiers)
- **Frontend**: Vercel (Unlimited)
- **Backend**: Render.com (750 hours/month)
- **Database**: Supabase (500MB) or Vercel Postgres (256MB)

**Total Cost: $0/month** ✅

### Deployment Guides
- **[Quick Deploy](docs/deployment/QUICK_DEPLOY.md)** - 5-minute setup
- **[Comprehensive Guide](docs/deployment/DEPLOYMENT_GUIDE.md)** - Detailed instructions
- **[Deployment Checklist](docs/deployment/DEPLOYMENT_CHECKLIST.md)** - Pre-deployment verification

---

## 📚 Documentation

### Getting Started
- [Getting Started Guide](docs/GETTING_STARTED.md)
- [Quick Start](docs/QUICK_START.md)

### Deployment
- [Quick Deploy Guide](docs/deployment/QUICK_DEPLOY.md)
- [Deployment Guide](docs/deployment/DEPLOYMENT_GUIDE.md)
- [Deployment Checklist](docs/deployment/DEPLOYMENT_CHECKLIST.md)

### Development
- [Development Progress](docs/development/PROGRESS.md)

### Implementation Details
- [Dynamic KPI Stats](docs/implementation/DYNAMIC_KPI_STATS_FIX.md)
- [Enhanced UI](docs/implementation/ENHANCED_UI_IMPLEMENTATION.md)
- [Hybrid Dashboard](docs/implementation/HYBRID_DASHBOARD_UPDATE.md)
- [Weighted Scoring](docs/implementation/WEIGHTED_SCORING_IMPLEMENTATION.md)

---

## 📂 Data Files

### Reference Data
Located in `data/reference/`:
- `Data.csv` - Sample monthly safety metrics
- `Dashboard.csv`, `Analysis.csv`, `Meter.csv` - Dashboard configuration
- `Instruction.csv` - User instructions
- `Untitled.xlsx` - Excel template

### Sample Data
Located in `data/samples/`:
- Sample Excel files for testing import functionality

### Database Credentials
Located in `data/secret` - Cloud PostgreSQL credentials

---

## 🔧 Helper Scripts

### Create Admin User
```bash
cd backend
npm run create-admin
```
Interactive script to create company and super admin user.

### Generate Password Hash
```bash
cd backend
npm run generate-password <password>
```
Generates bcrypt hash for manual user creation.

### Generate Sample Excel
```bash
cd scripts
node generate-sample-excel.js
```
Creates sample Excel file for testing imports.

---

## 🐛 Troubleshooting

### Backend Won't Start
1. Check PostgreSQL is running
2. Verify `.env` database URL
3. Run migrations: `npm run prisma:migrate`
4. Check port 5000 is not in use

### Frontend Can't Connect
1. Verify backend is running on port 5000
2. Check CORS settings in backend `.env`
3. Ensure `VITE_API_URL` in frontend `.env`

### Login Fails
1. Verify database is seeded
2. Check credentials in `prisma/seed.ts`
3. Ensure JWT_SECRET is set

---

## 🤝 Contributing

This is a private enterprise project. Contact the team lead for contribution guidelines.

---

## 📄 License

Proprietary - All Rights Reserved

---

## 📞 Support

For issues or questions:
- Check documentation in `docs/`
- Review implementation notes in `docs/implementation/`
- Refer to development progress in `docs/development/`

---

**Last Updated**: 2025-11-04
**Version**: 2.0.0
**Status**: Production Ready ✅
