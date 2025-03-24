FROM node:20-slim

# Install Chrome dependencies and Puppeteer requirements
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
    curl \
    wget \
    gnupg \
    --no-install-recommends \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables for Puppeteer
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p \
    documents/legal/pdfs \
    error_logs \
    logs \
    monitoring/prometheus \
    monitoring/grafana/provisioning \
    monitoring/alertmanager \
    monitoring/logstash/config \
    monitoring/logstash/pipeline \
    monitoring/filebeat

# Generate Prisma client
RUN npx prisma generate

# Run Prisma migrations
RUN npx prisma migrate deploy

# Expose ports
EXPOSE 5555 3000 9090 3001 9093 5044 5000 9600 5601

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/health || exit 1

# Start command
CMD ["npm", "run", "scrape:legal"] 