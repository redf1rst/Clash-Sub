# syntax=docker/dockerfile:1

FROM node:22.15-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

FROM node:22.15-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production \
    HOST=0.0.0.0 \
    PORT=8787 \
    DATA_DIR=/data \
    TRUST_PROXY=true

COPY --from=deps /app/node_modules ./node_modules
COPY package.json ./
COPY src ./src
COPY public ./public
COPY server ./server

RUN mkdir -p /data && chown -R node:node /app /data

USER node

EXPOSE 8787

VOLUME ["/data"]

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 8787) + '/healthz').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "server/index.js"]
