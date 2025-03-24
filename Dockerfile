FROM node:20-slim

# Install Chrome dependencies and Puppeteer requirements
RUN apt-get update && apt-get install -y \
    chromium \
    fonts-ipafont-gothic \
    fonts-wqy-zenhei \
    fonts-thai-tlwg \
    fonts-kacst \
    fonts-freefont-ttf \
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
RUN mkdir -p documents/legal/pdfs error_logs

# Generate Prisma client
RUN npx prisma generate

# Run Prisma migrations
RUN npx prisma migrate deploy

# Expose port for Prisma Studio
EXPOSE 5555

# Start command
CMD ["npm", "run", "scrape:legal"] 