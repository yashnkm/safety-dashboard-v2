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
- [x] Role-based access control
- [x] Audit logging system
- [x] Company settings with configurable weights

### 🚧 To Be Implemented:
- [ ] Authentication system (JWT + bcrypt)
- [ ] Login/Register pages
- [ ] Dashboard UI (matching current design)
- [ ] Data entry forms
- [ ] Excel import/export
- [ ] PDF report generation
- [ ] Email notifications
- [ ] Score calculation service

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
npm run dev                # Start dev server with nodemon
npm run build              # Compile TypeScript
npm start                  # Run compiled JavaScript
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run database migrations
npm run prisma:seed        # Seed database
npm run prisma:studio      # Open Prisma Studio
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

## 📚 Next Steps

1. **Complete Authentication** - Implement JWT auth, login/register
2. **Build Dashboard UI** - Create dashboard matching current design
3. **Data Entry Forms** - Forms for 18 safety parameters
4. **Calculation Service** - Auto-calculate scores based on weights
5. **Excel Features** - Import/export functionality
6. **Reports** - PDF report generation
7. **Testing** - Unit & integration tests
8. **Deployment** - Deploy to production

## 🤝 Contributing

This is a private enterprise project. Contact the team lead for contribution guidelines.

## 📄 License

Proprietary - All Rights Reserved
