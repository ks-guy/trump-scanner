FROM node:20-slim

# Install required system dependencies
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-symbola \
    fonts-noto \
    fonts-freefont-ttf \
    python3 \
    make \
    g++ \
    sqlite3 \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies with legacy peer deps flag
RUN npm install --legacy-peer-deps && \
    npm install -g prisma

# Copy source code
COPY . .

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    NODE_ENV=development

# Create directories for data persistence
RUN mkdir -p /app/documents /app/data /app/error_logs /app/backups /app/prisma

# Set volume mount points
VOLUME ["/app/documents", "/app/data", "/app/error_logs", "/app/backups", "/app/prisma"]

# Generate Prisma client
RUN npx prisma generate

# Start the app
CMD ["npm", "start"] 