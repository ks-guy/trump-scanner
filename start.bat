@echo off
echo Starting Trump Scanner...

REM Check if .env file exists
if not exist .env (
    echo Creating .env file from .env.example...
    copy .env.example .env
    echo Please update the .env file with your API keys and configuration
    exit /b 1
)

REM Create necessary directories
echo Creating necessary directories...
mkdir documents\legal\pdfs 2>nul
mkdir error_logs 2>nul
mkdir logs 2>nul
mkdir monitoring\prometheus 2>nul
mkdir monitoring\grafana\provisioning 2>nul
mkdir monitoring\alertmanager 2>nul
mkdir monitoring\logstash\config 2>nul
mkdir monitoring\logstash\pipeline 2>nul
mkdir monitoring\filebeat 2>nul
mkdir backups 2>nul

REM Build and start the containers
echo Building and starting containers...
docker-compose up -d --build

REM Wait for services to be ready
echo Waiting for services to be ready...
timeout /t 30 /nobreak

REM Initialize database
echo Initializing database...
call scripts\init-db.bat

REM Check if services are running
echo Checking service status...
docker-compose ps

REM Print access information
echo.
echo Application is now running! You can access:
echo.
echo Prisma Studio: http://localhost:5555
echo Grafana: http://localhost:3001 (admin/admin123)
echo Kibana: http://localhost:5601
echo Prometheus: http://localhost:9090
echo Alertmanager: http://localhost:9093
echo.
echo To view logs:
echo docker-compose logs -f
echo.
echo To stop the application:
echo docker-compose down
echo.
echo To restart the application:
echo docker-compose restart
echo.
echo To create a database backup:
echo scripts\backup-db.bat
echo.
echo To restore from backup:
echo scripts\init-db.bat
echo. 