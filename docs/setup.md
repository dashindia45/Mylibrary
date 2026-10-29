# Local Development Setup Guide

## Prerequisites

- **Node.js**: v20 or higher
- **Docker & Docker Compose**: For local PostgreSQL and Redis containers
- **Git**

---

## 1. Environment Configuration

Copy the example environment template to `.env` in the root:

```bash
cp .env.example .env
```

Ensure `.env` contains:
```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/mylibrary
JWT_ACCESS_SECRET=your-32-char-minimum-access-secret-here
JWT_REFRESH_SECRET=your-32-char-minimum-refresh-secret-here
NODE_ENV=development
API_PORT=3000
FRONTEND_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
```

Also ensure `apps/api/.env` has a copy of `.env`:
```bash
cp .env apps/api/.env
```

---

## 2. Start PostgreSQL & Redis Containers

Start the background database and cache containers:

```bash
docker compose up -d
```

Verify containers are running:
```bash
docker ps
```
You should see `mylibrary-postgres` on port `5432` and `mylibrary-redis` on port `6379`.

---

## 3. Database Migration & Seeding

Sync the Prisma schema with PostgreSQL and seed initial library data:

```bash
# Push schema to PostgreSQL
npm run db:push -w apps/api

# Seed floors, sections, 73 seats, pricing rules, shifts, and default admin user
npm run db:seed -w apps/api
```

### Default Credentials
- **Admin Email**: `admin@mylibrary.in`
- **Default OTP (Dev)**: `123456`

---

## 4. Run Automated Test Suite

Run the Vitest integration test suite against the live database:

```bash
npm test -w apps/api
```

---

## 5. Running the Application

You can start each application service in separate terminals:

```bash
# Terminal 1: Backend API Server (Port 3000)
npm run dev:api

# Terminal 2: Member Web App (Port 5173)
npm run dev:web

# Terminal 3: Staff & Admin Portal (Port 5174)
npm run dev:admin
```

### URLs
- **API Server & Health Check**: `http://localhost:3000/api/v1/health`
- **Member Web App**: `http://localhost:5173`
- **Staff / Admin Portal**: `http://localhost:5174`
