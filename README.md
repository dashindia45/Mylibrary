# MyLibrary — Smart Study Seat Booking Platform

A full-stack library seat booking and management system for physical study libraries in India.

## 🏗️ Architecture

**Monorepo** with npm workspaces:

| Package | Description | Port |
|---------|-------------|------|
| `packages/shared` | Shared types, schemas, constants | — |
| `apps/api` | Express.js REST API + Prisma + PostgreSQL | 3000 |
| `apps/web` | User-facing React app (Vite) | 5173 |
| `apps/admin` | Admin dashboard React app (Vite) | 5174 |

## 🚀 Quick Start

### Prerequisites

- Node.js 20+
- Docker (for PostgreSQL)
- npm 9+

### 1. Clone & Install

```bash
npm install
```

### 2. Environment Setup

```bash
cp .env.example .env
# Edit .env with your values (defaults work for local dev)
```

### 3. Start PostgreSQL

```bash
docker run -d --name mylibrary-postgres \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=mylibrary \
  -p 5432:5432 \
  postgres:16-alpine
```

### 4. Build Shared Package

```bash
npm run build:shared
```

### 5. Database Setup

```bash
# Generate Prisma client
cd apps/api && npx prisma generate

# Push schema to database
npx prisma db push

# Seed with development data
npm run db:seed
```

### 6. Start Development Servers

Open three terminals:

```bash
# Terminal 1 — API server
npm run dev:api

# Terminal 2 — User app
npm run dev:web

# Terminal 3 — Admin app
npm run dev:admin
```

### 7. Access

| App | URL |
|-----|-----|
| User App | http://localhost:5173 |
| Admin Dashboard | http://localhost:5174 |
| API Health | http://localhost:3000/api/v1/health |
| Prisma Studio | `cd apps/api && npx prisma studio` |

### Dev Login

In development mode, OTPs are logged to the API console:
- Admin: use `admin@mylibrary.in`
- Member: use any email or phone number (new account created automatically)

## 📦 Project Structure

```
Mylibrary/
├── packages/shared/         # Shared types, Zod schemas, constants
├── apps/
│   ├── api/                 # Express + Prisma backend
│   │   ├── prisma/          # Schema, migrations, seed
│   │   └── src/
│   │       ├── config/      # Environment config
│   │       ├── middleware/   # Auth, validation, error handling
│   │       ├── routes/      # API route modules
│   │       ├── services/    # Business logic
│   │       └── jobs/        # Background workers
│   ├── web/                 # User React app
│   └── admin/               # Admin React app
└── tests/                   # Test suites
```

## 🔑 Key Features

- ✅ OTP-based passwordless authentication
- ✅ Interactive PVR-style seat map
- ✅ Real-time seat availability
- ✅ Booking with full payment or ₹100 token
- ✅ Monthly membership fee management
- ✅ Admin dashboard with live stats
- ✅ Role-based access control (5 roles)
- ✅ Razorpay payment integration
- ✅ QR check-in
- ✅ Complaint management
- ✅ Notification system
- ✅ Audit logging

## 🧪 Testing

```bash
# Unit & integration tests
npm run test

# E2E tests
npm run test:e2e
```

## 📄 License

Proprietary — All rights reserved.
