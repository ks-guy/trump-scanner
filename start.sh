#!/bin/bash
set -e

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "Docker is not installed. Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    rm get-docker.sh
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "Docker Compose is not installed. Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
fi

# Create necessary directories
mkdir -p legal_documents error_logs logs backups

# Copy environment file if it doesn't exist
if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env file from .env.example"
    echo "Please update the .env file with your API keys and passwords"
    exit 1
fi

# Build and start the containers
echo "Building and starting containers..."
docker-compose up -d --build

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 10

# Check if services are running
echo "Checking services..."
docker-compose ps

echo "Setup completed! You can access:"
echo "- Application: http://localhost:3000"
echo "- Prisma Studio: http://localhost:5555"
echo "- Grafana: http://localhost:3001"
echo "- Prometheus: http://localhost:9090"
echo "- Elasticsearch: http://localhost:9200" 