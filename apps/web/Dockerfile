# ──────────────────────────────────────────────
# MyLibrary Web — Production Dockerfile
# ──────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ─── Install dependencies ───
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/
RUN npm ci --workspace=packages/shared --workspace=apps/web --include-workspace-root

# ─── Build shared package ───
FROM deps AS build-shared
COPY packages/shared/ ./packages/shared/
COPY tsconfig.base.json ./
RUN npm run build -w packages/shared

# ─── Build web app ───
FROM build-shared AS build-web
COPY apps/web/ ./apps/web/
RUN npm run build -w apps/web

# ─── Serve with Nginx ───
FROM nginx:alpine AS runner
COPY --from=build-web /app/apps/web/dist /usr/share/nginx/html
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
