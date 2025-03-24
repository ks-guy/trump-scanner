@echo off
echo Creating database backup...

REM Check if .env file exists
if not exist .env (
    echo Error: .env file not found
    exit /b 1
)

REM Create backups directory if it doesn't exist
if not exist backups mkdir backups

REM Create timestamp for backup file
for /f "tokens=2 delims==" %%I in ('wmic os get localdatetime /value') do set datetime=%%I
set TIMESTAMP=%datetime:~0,8%_%datetime:~8,6%
set BACKUP_FILE=backups\backup_%TIMESTAMP%.sql

REM Create backup
echo Creating database backup...
docker-compose exec -T db mysqldump -u"root" -p"%MYSQL_ROOT_PASSWORD%" "%MYSQL_DATABASE%" > "%BACKUP_FILE%"

REM Create latest backup link
if exist backups\latest.sql del backups\latest.sql
copy /Y "%BACKUP_FILE%" backups\latest.sql

echo Backup created at %BACKUP_FILE% 