@echo off
setlocal enabledelayedexpansion

echo [INFO] Trump Scanner 3 Deployment Helper
echo.

:: Check if running with administrator privileges
net session >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Running with administrator privileges
) else (
    echo [ERROR] This script requires administrator privileges
    echo Please right-click and select "Run as administrator"
    pause
    exit /b 1
)

:: Check if WSL is installed
wsl --status >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] WSL is installed
) else (
    echo [WARN] WSL is not installed
    echo Installing WSL...
    wsl --install
    echo Please restart your computer and run this script again
    pause
    exit /b 1
)

:: Check if Docker Desktop is installed
docker --version >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Docker Desktop is installed
) else (
    echo [WARN] Docker Desktop is not installed
    echo Please install Docker Desktop from:
    echo https://www.docker.com/products/docker-desktop
    echo.
    echo After installation:
    echo 1. Start Docker Desktop
    echo 2. Go to Settings ^> General and enable "Use WSL 2 based engine"
    echo 3. Go to Settings ^> Resources ^> WSL Integration and enable integration for your Linux distribution
    echo 4. Run this script again
    pause
    exit /b 1
)

:: Check if Git is installed
git --version >nul 2>&1
if %errorLevel% == 0 (
    echo [INFO] Git is installed
) else (
    echo [WARN] Git is not installed
    echo Please install Git from:
    echo https://git-scm.com/download/win
    echo.
    echo After installation, run this script again
    pause
    exit /b 1
)

:: All prerequisites are met
echo [INFO] All prerequisites are met
echo.
echo Starting deployment in WSL...
echo.

:: Launch deployment in WSL
wsl bash ./deploy.sh

pause 