# =============================================================================
# AegisAuth Backend - Multi-stage Dockerfile
# =============================================================================
# WHY multi-stage: Keeps final image small (~200MB vs ~800MB).
# Build stage includes devDependencies; production stage only has runtime deps.
# =============================================================================

# ── Build Stage ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npx prisma generate
RUN npm run build

# ── Production Stage ─────────────────────────────────────────────────────────
FROM node:20-alpine AS production

WORKDIR /app

# Security: Run as non-root user
RUN addgroup -g 1001 -S aegisauth && \
    adduser -S aegisauth -u 1001

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

USER aegisauth

EXPOSE 3000

CMD ["node", "dist/main.js"]
