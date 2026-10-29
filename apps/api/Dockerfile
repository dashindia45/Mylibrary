# ──────────────────────────────────────────────
# MyLibrary API — Production Dockerfile
# ──────────────────────────────────────────────
FROM node:20-alpine AS base
WORKDIR /app

# ─── Install dependencies ───
FROM base AS deps
COPY package.json package-lock.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/api/package.json ./apps/api/
RUN npm ci --workspace=packages/shared --workspace=apps/api --include-workspace-root

# ─── Build shared package ───
FROM deps AS build-shared
COPY packages/shared/ ./packages/shared/
COPY tsconfig.base.json ./
RUN npm run build -w packages/shared

# ─── Build API ───
FROM build-shared AS build-api
COPY apps/api/ ./apps/api/
RUN npx -w apps/api prisma generate
RUN npm run build -w apps/api

# ─── Production image ───
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Copy monorepo structure needed at runtime
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/packages/shared/node_modules ./packages/shared/node_modules
COPY --from=deps /app/apps/api/node_modules ./apps/api/node_modules
COPY --from=build-shared /app/packages/shared/dist ./packages/shared/dist
COPY --from=build-shared /app/packages/shared/package.json ./packages/shared/
COPY --from=build-api /app/apps/api/dist ./apps/api/dist
COPY --from=build-api /app/apps/api/package.json ./apps/api/
COPY --from=build-api /app/apps/api/prisma ./apps/api/prisma
COPY --from=build-api /app/apps/api/tsconfig.json ./apps/api/
COPY tsconfig.base.json ./
COPY package.json ./

# Re-generate Prisma client for the runner architecture
RUN cd apps/api && npx prisma generate

EXPOSE 3000

WORKDIR /app/apps/api
CMD ["node", "dist/index.js"]
