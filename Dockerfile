# syntax=docker/dockerfile:1
#
# Production image for Google Cloud Run (or any container host).
#   deps     installs exactly what package-lock.json pins
#   build    compiles the self-contained Next.js server (output: "standalone")
#   runtime  a small image with only that server, run as an unprivileged user
#
#   docker build --build-arg NEXT_PUBLIC_SITE_URL=https://festivo.example -t festivo .
#   docker run -p 8080:8080 -e GEMINI_API_KEY=... festivo
#
# Without GEMINI_API_KEY the app runs in demo mode. Secrets are passed at run
# time and never baked into a layer.

ARG NODE_VERSION=24-alpine

FROM node:${NODE_VERSION} AS deps
WORKDIR /app
RUN apk add --no-cache libc6-compat
COPY package.json package-lock.json ./
# HUSKY=0: there are no git hooks to install inside an image.
RUN HUSKY=0 npm ci --no-audit --no-fund

FROM node:${NODE_VERSION} AS build
WORKDIR /app
# Read at build time: https:// turns on HSTS and upgrade-insecure-requests.
ARG NEXT_PUBLIC_SITE_URL=http://localhost:8080
ENV NEXT_PUBLIC_SITE_URL=${NEXT_PUBLIC_SITE_URL} \
    NEXT_OUTPUT=standalone \
    NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:${NODE_VERSION} AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=8080 \
    HOSTNAME=0.0.0.0
RUN addgroup --system --gid 1001 nodejs \
 && adduser --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=build --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=build --chown=nextjs:nodejs /app/public ./public
USER nextjs
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s \
  CMD wget --quiet --spider http://127.0.0.1:8080/ || exit 1
CMD ["node", "server.js"]
