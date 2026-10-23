# ── Stage 1: Build Next.js ──
FROM node:20-bookworm-slim AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci || npm install
COPY . .
RUN npm run build

# ── Stage 2: Production ──
FROM node:20-bookworm-slim

# Install system deps: ffmpeg, python3, pip, chromium, deno, and libs for headless browser
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    chromium \
    fonts-liberation \
    libnss3 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxrandr2 \
    libgbm1 \
    libpango-1.0-0 \
    libcairo2 \
    curl \
    ca-certificates \
    xdg-utils \
 && rm -rf /var/lib/apt/lists/*

# Install deno (yt-dlp recommended JS runtime)
RUN curl -fsSL https://deno.land/install.sh | DENO_INSTALL=/usr/local sh

# Install yt-dlp + PO Token plugin via pip (using --break-system-packages since this is a container)
RUN pip3 install --no-cache-dir --break-system-packages -U yt-dlp yt-dlp-getpot-wpc

# Set chromium path for the getpot-wpc plugin (nodriver)
ENV CHROME_BIN=/usr/bin/chromium
ENV CHROMIUM_FLAGS="--no-sandbox --disable-gpu --headless"

WORKDIR /app

# Copy built app from builder stage
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.mjs ./next.config.mjs
COPY --from=builder /app/lib ./lib

# Runtime config
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000

CMD ["npm", "start"]
