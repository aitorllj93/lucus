# syntax=docker/dockerfile:1

# ============================================
# Base stage - Node.js with pnpm
# ============================================
FROM node:22-alpine AS base
RUN corepack enable && corepack prepare pnpm@10.31.0 --activate
WORKDIR /app

# ============================================
# Dependencies stage - Install all dependencies
# ============================================
FROM base AS deps

# Copy pnpm configuration
COPY pnpm-lock.yaml package.json ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# ============================================
# Builder stage - Build the application
# ============================================
FROM base AS builder

COPY --from=deps /app ./

# Copy source code
COPY src ./src
COPY .env.schema ./
COPY tsconfig.json ./

# Build the CDN
RUN pnpm build

# ============================================
# Runner stage - Production image
# ============================================
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

# Create non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 cdn

# Copy deployed application (includes node_modules with all deps and dist)
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.env.schema ./.env.schema

# Create storage directory
RUN mkdir -p /data/storage && chown -R cdn:nodejs /data/storage && \
    chown -R cdn:nodejs /app

ENV STORAGE_PATH=/data/storage

USER cdn

EXPOSE 42070

CMD ["node", "dist/index.js"]

