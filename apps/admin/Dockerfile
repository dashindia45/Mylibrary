# ──────────────────────────────────────────────
# MyLibrary Admin — Production Dockerfile
# ──────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ─── Install dependencies ───
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/admin/package.json ./apps/admin/
RUN npm ci --workspace=packages/shared --workspace=apps/admin --include-workspace-root

# ─── Build shared package ───
FROM deps AS build-shared
COPY packages/shared/ ./packages/shared/
COPY tsconfig.base.json ./
RUN npm run build -w packages/shared

# ─── Build admin app ───
FROM build-shared AS build-admin
COPY apps/admin/ ./apps/admin/
RUN npm run build -w apps/admin

# ─── Serve with Nginx ───
FROM nginx:alpine AS runner
COPY --from=build-admin /app/apps/admin/dist /usr/share/nginx/html
COPY apps/admin/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
