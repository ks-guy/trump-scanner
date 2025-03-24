#!/bin/bash

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Creating .env file from .env.example..."
    cp .env.example .env
    echo "Please update the .env file with your API keys and configuration"
    exit 1
fi

# Create necessary directories
echo "Creating necessary directories..."
mkdir -p documents/legal/pdfs error_logs logs \
    monitoring/prometheus monitoring/grafana/provisioning \
    monitoring/alertmanager monitoring/logstash/config \
    monitoring/logstash/pipeline monitoring/filebeat

# Build and start the containers
echo "Building and starting containers..."
docker-compose up -d --build

# Wait for services to be ready
echo "Waiting for services to be ready..."
sleep 30

# Check if services are running
echo "Checking service status..."
docker-compose ps

# Print access information
echo "
Application is now running! You can access:

Prisma Studio: http://localhost:5555
Grafana: http://localhost:3001 (admin/admin123)
Kibana: http://localhost:5601
Prometheus: http://localhost:9090
Alertmanager: http://localhost:9093

To view logs:
docker-compose logs -f

To stop the application:
docker-compose down

To restart the application:
docker-compose restart
" 