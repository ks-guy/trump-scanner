#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
until docker-compose exec -T db mysqladmin ping -h"localhost" -P"3306" -u"root" -p"${MYSQL_ROOT_PASSWORD}" --silent; do
    sleep 1
done

# Create database if it doesn't exist
echo "Creating database if it doesn't exist..."
docker-compose exec -T db mysql -u"root" -p"${MYSQL_ROOT_PASSWORD}" -e "CREATE DATABASE IF NOT EXISTS ${MYSQL_DATABASE};"

# Run Prisma migrations
echo "Running Prisma migrations..."
docker-compose exec scraper npx prisma migrate deploy

# Import data if backup exists
if [ -f "backups/latest.sql" ]; then
    echo "Importing data from backup..."
    docker-compose exec -T db mysql -u"root" -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < backups/latest.sql
    echo "Data import completed"
else
    echo "No backup file found at backups/latest.sql"
fi

echo "Database initialization completed" 