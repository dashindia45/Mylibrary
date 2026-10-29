# Production Deployment Guide

## Architecture Overview

```
                      ┌─────────────────────────┐
                      │    Reverse Proxy        │
                      │    (Nginx / Caddy)      │
                      │    Port 80 / 443 (SSL)  │
                      └────────────┬────────────┘
                                   │
         ┌─────────────────────────┼─────────────────────────┐
         │                         │                         │
         ▼                         ▼                         ▼
┌─────────────────┐       ┌─────────────────┐       ┌─────────────────┐
│ Member Web App  │       │ Admin Portal    │       │ Express API     │
│ Port 5173 / CDN │       │ Port 5174 / CDN │       │ Port 3000 (PM2) │
└─────────────────┘       └─────────────────┘       └────────┬────────┘
                                                             │
                                   ┌─────────────────────────┼─────────────────────────┐
                                   │                                                   │
                                   ▼                                                   ▼
                        ┌─────────────────────┐                             ┌─────────────────────┐
                        │   PostgreSQL 16     │                             │      Redis 7        │
                        │   Database (5432)   │                             │      Cache (6379)   │
                        └─────────────────────┘                             └─────────────────────┘
```

---

## 1. Environment Variables in Production

Create a secure `.env` file on the production server:

```env
# Database
DATABASE_URL=postgresql://<db_user>:<db_password>@<db_host>:5432/mylibrary?sslmode=require

# Authentication Secrets (Generate 64-character random strings)
JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# Payment Gateway (Razorpay Live Keys)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxxxxx

# App URLs & CORS
NODE_ENV=production
API_PORT=3000
API_URL=https://api.mylibrary.in
FRONTEND_URL=https://app.mylibrary.in
ADMIN_URL=https://admin.mylibrary.in
CORS_ORIGINS=https://app.mylibrary.in,https://admin.mylibrary.in

# Redis
REDIS_URL=redis://localhost:6379
```

---

## 2. Database Migrations

Run Prisma production migrations before starting the application:

```bash
npx prisma migrate deploy --schema=apps/api/prisma/schema.prisma
```

---

## 3. Production Build & Execution

### Build all packages and applications:
```bash
npm run build
```

### Running API with PM2:
```bash
npm install -g pm2
pm2 start apps/api/dist/index.js --name "mylibrary-api" -i max
pm2 save
pm2 startup
```

---

## 4. Reverse Proxy (Nginx Configuration)

```nginx
# API Server
server {
    listen 443 ssl http2;
    server_name api.mylibrary.in;

    ssl_certificate /etc/letsencrypt/live/api.mylibrary.in/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.mylibrary.in/privkey.pem;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Member Web App
server {
    listen 443 ssl http2;
    server_name app.mylibrary.in;

    root /var/www/mylibrary/apps/web/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}

# Staff / Admin Portal
server {
    listen 443 ssl http2;
    server_name admin.mylibrary.in;

    root /var/www/mylibrary/apps/admin/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## 5. Automated Backups

Set up daily PostgreSQL backups via cron:

```bash
# /etc/cron.daily/backup-postgres
pg_dump -U postgres -Fc mylibrary > /var/backups/mylibrary_$(date +\%F).dump
# Retain 14 days
find /var/backups/ -name "mylibrary_*.dump" -mtime +14 -exec rm {} \;
```
