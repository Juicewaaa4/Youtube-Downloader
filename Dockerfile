# Use official Node.js 20 Debian Bookworm slim image
FROM node:20-bookworm-slim

# Install system dependencies: ffmpeg, python3, curl, ca-certificates
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    python3 \
    curl \
    ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Install the latest standalone yt-dlp binary
RUN curl -L https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp -o /usr/local/bin/yt-dlp \
 && chmod a+rx /usr/local/bin/yt-dlp

# Set working directory
WORKDIR /app

# Copy package dependency definitions
COPY package*.json ./

# Install npm dependencies
RUN npm ci || npm install

# Copy source code
COPY . .

# Build the Next.js application
RUN npm run build

# Configure runtime environment variables
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

EXPOSE 3000

# Start Next.js in production mode
CMD ["npm", "start"]
