#!/bin/bash
set -e

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Wait for MySQL to be ready
until mysqladmin ping -h"localhost" -u"root" -p"$MYSQL_ROOT_PASSWORD" --silent; do
    echo "Waiting for MySQL to be ready..."
    sleep 1
done

# Create database if it doesn't exist
mysql -u"root" -p"$MYSQL_ROOT_PASSWORD" << EOF
CREATE DATABASE IF NOT EXISTS trump_scanner;
EOF

# Create user if it doesn't exist and grant privileges
mysql -u"root" -p"$MYSQL_ROOT_PASSWORD" << EOF
CREATE USER IF NOT EXISTS 'trump_scanner'@'%' IDENTIFIED BY 'trump_scanner_password';
GRANT ALL PRIVILEGES ON trump_scanner.* TO 'trump_scanner'@'%';
FLUSH PRIVILEGES;
EOF

# Run Prisma migrations
cd /app
npx prisma migrate deploy

# Import data if backup exists
if [ -f "backups/latest.sql" ]; then
    echo "Importing data from backup..."
    docker-compose exec -T db mysql -u"root" -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" < backups/latest.sql
    echo "Data import completed"
else
    echo "No backup file found at backups/latest.sql"
fi

echo "Database initialization completed!" 