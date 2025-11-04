# Safety Dashboard V2 - Multi-Tenant Enterprise Edition

Modern, TypeScript-based safety statistics dashboard with multi-tenancy, authentication, and 18 safety parameters.

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

## 📁 Project Structure

```
safety-dashboard-v2/
├── frontend/                    # React TypeScript frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── ui/             # Shadcn UI components
│   │   │   ├── layout/         # Layout components
│   │   │   ├── auth/           # Auth components
│   │   │   ├── dashboard/      # Dashboard components
│   │   │   └── ...
│   │   ├── pages/              # Route pages
│   │   ├── services/           # API services
│   │   ├── store/              # Zustand stores
│   │   ├── hooks/              # Custom hooks
│   │   ├── types/              # TypeScript types
│   │   └── lib/                # Utilities
│   └── package.json
│
└── backend/                     # Express TypeScript backend
    ├── src/
    │   ├── config/             # Configuration
    │   ├── middleware/         # Express middleware
    │   ├── controllers/        # Route controllers
    │   ├── services/           # Business logic
    │   ├── routes/             # API routes
    │   ├── models/             # TypeScript types
    │   └── utils/              # Utilities
    ├── prisma/
    │   ├── schema.prisma       # Database schema
    │   ├── migrations/         # Database migrations
    │   └── seed.ts             # Seed data
    └── package.json
```

## 🗄️ Database Schema

### Core Models:
- **Company** - Multi-tenant company data
- **Site** - Multiple sites per company
- **User** - Role-based users (SUPER_ADMIN, ADMIN, MANAGER, VIEWER)
- **UserSiteAccess** - Site-specific access control
- **SafetyMetrics** - 18 safety parameters (Target/Actual/Score)
- **CompanySettings** - Configurable weights & thresholds
- **AuditLog** - Audit trail for all changes
- **PasswordResetToken** - Password reset functionality

### 18 Safety Parameters:
1. Man Days (Target, Actual, Score)
2. Safe Work Hours (Target, Actual, Score)
3. Safety Induction (Target, Actual, Score)
4. Toolbox Talk (Target, Actual, Score)
5. Job Specific Training (Target, Actual, Score)
6. Formal Safety Inspection (Target, Actual, Score)
7. Non-Compliance Raised (Target, Actual, Score)
8. Non-Compliance Close (Target, Actual, Score)
9. Safety Observation Raised (Target, Actual, Score)
10. Safety Observation Close (Target, Actual, Score)
11. Work Permit Issued (Target, Actual, Score)
12. Safe Work Method Statement (Target, Actual, Score)
13. Emergency Mock Drills (Target, Actual, Score)
14. Internal Audit (Target, Actual, Score)
15. Near Miss Report (Target, Actual, Score)
16. First Aid Injury (Target, Actual, Score)
17. Medical Treatment Injury (Target, Actual, Score)
18. Lost Time Injury (Target, Actual, Score)

## 🛠️ Setup Instructions

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### 1. Database Setup

```bash
# Create PostgreSQL database
createdb safety_dashboard_v2

# Or using psql
psql -U postgres
CREATE DATABASE safety_dashboard_v2;
\q
```

### 2. Backend Setup

```bash
cd backend

# Install dependencies
npm install

# Create .env file
cp .env.example .env

# Update .env with your database credentials
DATABASE_URL="postgresql://username:password@localhost:5432/safety_dashboard_v2?schema=public"
JWT_SECRET="your_secure_random_string"

# Generate Prisma Client
npm run prisma:generate

# Run database migrations
npm run prisma:migrate

# (Optional) Seed database with sample data
npm run prisma:seed

# Start development server
npm run dev
```

Backend will run on: http://localhost:5000

### 3. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Create .env file (optional)
echo "VITE_API_URL=http://localhost:5000/api" > .env

# Start development server
npm run dev
```

Frontend will run on: http://localhost:5173

## 🔑 Authentication & Authorization

### User Roles:
- **SUPER_ADMIN** - Full system access, manage companies
- **ADMIN** - Company-wide access, manage users & sites
- **MANAGER** - Site-level access (configurable)
- **VIEWER** - Read-only access

### Access Levels:
- **ALL_SITES** - Access to all company sites
- **SPECIFIC_SITES** - Access to assigned sites only

## 📊 Key Features

### ✅ Implemented:
- [x] TypeScript frontend & backend
- [x] Tailwind CSS + Shadcn UI setup
- [x] Prisma ORM with multi-tenant schema
- [x] 18 safety parameters model
- [x] **Role-based access control (RBAC)**
- [x] **Site-level access restrictions**
- [x] **JWT authentication system**
- [x] **Login page with secure auth**
- [x] **Interactive dashboard with charts**
- [x] **Gauge charts, bar charts, trend analysis**
- [x] **Excel import functionality**
- [x] **Multi-tenant data isolation**
- [x] **Admin panel for user/site management**
- [x] **Company-scoped site assignments**
- [x] **Audit logging system**
- [x] **Company settings with configurable weights**
- [x] **Monthly trend visualization**

### 🚧 Future Enhancements:
- [ ] PDF report generation
- [ ] Email notifications
- [ ] Advanced analytics & predictions
- [ ] Mobile app (React Native)
- [ ] Real-time notifications
- [ ] Data export to multiple formats

## 🎨 UI Design

UI will match the current dashboard structure:
- Header with site/date filters
- KPI cards at top
- Sections for Training, Compliance, Emergency & Audits, Incidents
- Similar color scheme and layout

## 📝 Available Scripts

### Frontend
```bash
npm run dev          # Start dev server
npm run build        # Build for production
npm run preview      # Preview production build
```

### Backend
```bash
npm run dev                  # Start dev server with nodemon
npm run build                # Compile TypeScript
npm start                    # Run compiled JavaScript
npm run prisma:generate      # Generate Prisma Client
npm run prisma:migrate       # Run database migrations
npm run prisma:seed          # Seed database
npm run prisma:studio        # Open Prisma Studio
npm run create-admin         # Interactive admin user creation
npm run generate-password    # Generate bcrypt password hash
```

## 🔐 Environment Variables

### Backend (.env)
```env
DATABASE_URL=postgresql://...
PORT=5000
NODE_ENV=development
JWT_SECRET=your_secret
JWT_EXPIRY=7d
CORS_ORIGIN=http://localhost:5173
```

### Frontend (.env)
```env
VITE_API_URL=http://localhost:5000/api
```

## 🚀 Deployment

This application is ready for production deployment on **100% free hosting**!

### Quick Deploy (5 minutes)
See **[QUICK_DEPLOY.md](./QUICK_DEPLOY.md)** for the fastest deployment path.

### Comprehensive Guide
See **[DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md)** for detailed step-by-step instructions.

### Deployment Checklist
See **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** for pre-deployment verification.

### Hosting Stack (All Free Tiers)
- **Frontend**: Vercel (Unlimited)
- **Backend**: Render.com (750 hours/month)
- **Database**: Supabase (500MB) or Vercel Postgres (256MB)

**Total Cost: $0/month** ✅

## 🔧 Helper Scripts

### Create Super Admin User
```bash
cd backend
npm run create-admin
```
Interactive script to create your first company and super admin user.

### Generate Password Hash
```bash
cd backend
npm run generate-password <password>
```
Generates a bcrypt hash for manual user creation.

## 📚 Additional Features

### Multi-Tenancy
- **Company Isolation**: Each company's data is completely isolated
- **Site Management**: Unlimited sites per company
- **User Access Control**: Fine-grained site-level permissions

### Security
- **JWT Authentication**: Secure token-based auth
- **Password Hashing**: Bcrypt with 10 rounds
- **Role-Based Access**: 4-tier permission system
- **Rate Limiting**: DDoS protection (10,000 req/15min)
- **CORS Protection**: Configurable origin whitelist
- **Helmet.js**: Security headers

### Dashboard Features
- **KPI Summary Cards**: Key metrics at a glance
- **Gauge Charts**: Visual performance indicators
- **Monthly Trends**: Area charts with statistics
- **Parameter Details**: 18 safety metrics with bar charts
- **Filtering**: By site, month, and year
- **Auto-refresh**: After Excel import

## 🤝 Contributing

This is a private enterprise project. Contact the team lead for contribution guidelines.

## 📄 License

Proprietary - All Rights Reserved
