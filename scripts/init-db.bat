@echo off
echo Initializing database...

REM Check if .env file exists
if not exist .env (
    echo Error: .env file not found
    exit /b 1
)

REM Wait for MySQL to be ready
echo Waiting for MySQL to be ready...
:wait_loop
docker-compose exec -T db mysqladmin ping -h"localhost" -P"3306" -u"root" -p"%MYSQL_ROOT_PASSWORD%" --silent
if errorlevel 1 (
    timeout /t 1 /nobreak > nul
    goto wait_loop
)

REM Create database if it doesn't exist
echo Creating database if it doesn't exist...
docker-compose exec -T db mysql -u"root" -p"%MYSQL_ROOT_PASSWORD%" -e "CREATE DATABASE IF NOT EXISTS %MYSQL_DATABASE%;"

REM Run Prisma migrations
echo Running Prisma migrations...
docker-compose exec scraper npx prisma migrate deploy

REM Import data if backup exists
if exist "backups\latest.sql" (
    echo Importing data from backup...
    docker-compose exec -T db mysql -u"root" -p"%MYSQL_ROOT_PASSWORD%" "%MYSQL_DATABASE%" < backups\latest.sql
    echo Data import completed
) else (
    echo No backup file found at backups\latest.sql
)

echo Database initialization completed 