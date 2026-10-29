# syntax=docker/dockerfile:1
FROM node:24-bookworm-slim AS dependencies
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

FROM node:24-bookworm-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-bookworm-slim AS runner
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 PORT=3000 HOSTNAME=0.0.0.0 DATABASE_PATH=/app/data/teamflow.sqlite
RUN groupadd --system --gid 1001 teamflow && useradd --system --uid 1001 --gid teamflow teamflow && mkdir -p /app/data && chown teamflow:teamflow /app/data
COPY --from=build --chown=teamflow:teamflow /app/.next/standalone ./
COPY --from=build --chown=teamflow:teamflow /app/.next/static ./.next/static
COPY --from=build --chown=teamflow:teamflow /app/public ./public
COPY --chown=teamflow:teamflow scripts/backup.mjs ./scripts/backup.mjs
USER teamflow
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s CMD node -e "fetch('http://127.0.0.1:3000/api/work').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
