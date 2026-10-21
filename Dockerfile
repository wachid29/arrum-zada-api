# ====================================================================
# Multi-Stage Dockerfile: Arrum Zada API (PT Pegadaian)
# Optimized for minimal image size, high security (non-root), & fast builds
# ====================================================================

# --------------------------------------------------------------------
# Stage 1: Dependencies Resolution
# --------------------------------------------------------------------
FROM node:20-alpine AS dependencies

WORKDIR /usr/src/app

# Salin manifest dependensi saja untuk memanfaatkan Docker layer caching
COPY package*.json ./

# Install dependensi produksi saja (tanpa devDependencies)
RUN npm ci --omit=dev && npm cache clean --force

# --------------------------------------------------------------------
# Stage 2: Final Production Runner
# --------------------------------------------------------------------
FROM node:20-alpine AS runner

WORKDIR /usr/src/app

# Metadata image
LABEL maintainer="Divisi PASTI - PT Pegadaian"
LABEL description="REST API Arrum Zada Simulasi Emas Haji"

# Environment default untuk mode production
ENV NODE_ENV=production
ENV PORT=3000

# Buat grup dan user non-root untuk keamanan kontainer
# (Node Alpine sudah menyertakan user 'node' dengan UID:GID 1000:1000)
COPY --chown=node:node --from=dependencies /usr/src/app/node_modules ./node_modules
COPY --chown=node:node package*.json ./
COPY --chown=node:node index.js ./
COPY --chown=node:node src/ ./src/
COPY --chown=node:node database/ ./database/

# Jalankan proses sebagai user non-root 'node'
USER node

# Ekspos port aplikasi
EXPOSE 3000

# Health check native Node.js (tanpa perlu curl atau wget)
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 3000) + '/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

# Jalankan server
CMD ["node", "index.js"]
