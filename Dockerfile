# syntax=docker/dockerfile:1

###############################################################################
# Multi-stage build for the Ladekarten activation app.
#
# Build:
#   docker build \
#     --build-arg XANO_IMAGE_HOST=xytd-zif2-cfgb.f2.xano.io \
#     -t landingpages:latest .
#
# XANO_IMAGE_HOST must be supplied HERE, not only at runtime: with
# output: 'standalone' Next serialises the images config at build time, and
# next/image rejects any host that was not whitelisted then.
###############################################################################

FROM node:20-alpine AS base
# sharp (used for image optimisation) needs glibc compatibility on Alpine.
RUN apk add --no-cache libc6-compat

# --- dependencies -----------------------------------------------------------
FROM base AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# --- build ------------------------------------------------------------------
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG XANO_IMAGE_HOST
ARG XANO_BASE_URL
ENV XANO_IMAGE_HOST=$XANO_IMAGE_HOST
ENV XANO_BASE_URL=$XANO_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# --- runtime ----------------------------------------------------------------
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs

# public/ holds the e-mobilio logo, the ENV PDF and the fallback partner assets.
COPY --from=builder /app/public ./public

# The standalone output already contains the server and only the node_modules it needs.
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

# Azure injects PORT; default to 3000 for local runs.
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000

CMD ["node", "server.js"]
