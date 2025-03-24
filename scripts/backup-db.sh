#!/bin/bash

# Load environment variables
if [ -f .env ]; then
    source .env
else
    echo "Error: .env file not found"
    exit 1
fi

# Create backups directory if it doesn't exist
mkdir -p backups

# Create timestamp for backup file
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="backups/backup_${TIMESTAMP}.sql"

# Create backup
echo "Creating database backup..."
docker-compose exec -T db mysqldump -u"root" -p"${MYSQL_ROOT_PASSWORD}" "${MYSQL_DATABASE}" > "${BACKUP_FILE}"

# Create symlink to latest backup
rm -f backups/latest.sql
ln -s "${BACKUP_FILE}" backups/latest.sql

echo "Backup created at ${BACKUP_FILE}" 