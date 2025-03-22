#!/bin/bash

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
log() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if a command exists
check_command() {
    if ! command -v $1 &> /dev/null; then
        error "$1 is not installed"
        return 1
    fi
    return 0
}

# Detect OS
detect_os() {
    case "$(uname -s)" in
        Linux*)     OS='Linux';;
        Darwin*)    OS='Mac';;
        CYGWIN*)    OS='Cygwin';;
        MINGW*)     OS='Windows';;
        MSYS*)      OS='Windows';;
        *)          OS='Unknown';;
    esac
    echo $OS
}

# Check system requirements
check_requirements() {
    log "Checking system requirements..."
    
    OS=$(detect_os)
    
    if [ "$OS" = "Windows" ]; then
        # Check if running in WSL
        if ! grep -q Microsoft /proc/version 2>/dev/null; then
            error "On Windows, this script must be run in WSL2"
            error "Please install WSL2 and run this script again"
            return 1
        fi
    fi
    
    # Check memory (platform-specific)
    if [ "$OS" = "Linux" ] || [ "$OS" = "Windows" ]; then
        total_mem=$(free -g | awk '/^Mem:/{print $2}')
        if [ $total_mem -lt 4 ]; then
            error "Insufficient memory. 4GB minimum required, found ${total_mem}GB"
            return 1
        fi
    elif [ "$OS" = "Mac" ]; then
        total_mem=$(($(sysctl -n hw.memsize) / 1024 / 1024 / 1024))
        if [ $total_mem -lt 4 ]; then
            error "Insufficient memory. 4GB minimum required, found ${total_mem}GB"
            return 1
        fi
    fi
    
    # Check disk space (platform-specific)
    if [ "$OS" = "Linux" ] || [ "$OS" = "Windows" ]; then
        free_space=$(df -BG . | awk '/[0-9]%/{print $4}' | sed 's/G//')
    elif [ "$OS" = "Mac" ]; then
        free_space=$(df -g . | awk 'NR==2 {print $4}')
    fi
    
    if [ $free_space -lt 20 ]; then
        error "Insufficient disk space. 20GB minimum required, found ${free_space}GB"
        return 1
    fi
    
    return 0
}

# Install required packages
install_dependencies() {
    log "Installing dependencies..."
    
    OS=$(detect_os)
    
    if [ "$OS" = "Linux" ]; then
        # Linux installation
        sudo apt-get update
        sudo apt-get install -y \
            apt-transport-https \
            ca-certificates \
            curl \
            gnupg \
            lsb-release \
            git
            
    elif [ "$OS" = "Mac" ]; then
        # Mac installation
        if ! check_command brew; then
            /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        fi
        brew install curl git
        
    elif [ "$OS" = "Windows" ]; then
        # Windows (WSL) installation
        sudo apt-get update
        sudo apt-get install -y \
            apt-transport-https \
            ca-certificates \
            curl \
            gnupg \
            lsb-release \
            git
    fi
    
    # Install Docker if not present
    if ! check_command docker; then
        log "Installing Docker..."
        curl -fsSL https://get.docker.com | sh
    fi
    
    # Install Docker Compose if not present
    if ! check_command docker-compose; then
        log "Installing Docker Compose..."
        sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
    fi
}

# Configure system settings
configure_system() {
    log "Configuring system settings..."
    
    OS=$(detect_os)
    
    if [ "$OS" = "Linux" ] || [ "$OS" = "Windows" ]; then
        # Set up system limits for Elasticsearch
        echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
        sudo sysctl -w vm.max_map_count=262144
        
        # Create log rotation config
        sudo tee /etc/logrotate.d/docker-logs > /dev/null << EOF
/var/lib/docker/containers/*/*.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
EOF
    elif [ "$OS" = "Mac" ]; then
        # macOS specific settings
        screen -dm sudo sysctl -w vm.max_map_count=262144
    fi
}

# Set up project directories
setup_directories() {
    log "Setting up project directories..."
    
    # Create required directories
    mkdir -p monitoring/{prometheus/{rules},alertmanager,grafana/provisioning/{datasources,dashboards},logstash/{config,pipeline},filebeat,elasticsearch/data}
    mkdir -p documents data logs
    
    # Set permissions
    if [ "$(detect_os)" != "Windows" ]; then
        chmod -R 755 documents data logs
        sudo chown -R 1000:1000 monitoring/elasticsearch/data
        chmod -R 755 monitoring
    fi
}

# Configure environment
setup_environment() {
    log "Setting up environment..."
    
    if [ ! -f .env ]; then
        if [ ! -f .env.example ]; then
            error ".env.example file not found"
            return 1
        fi
        
        cp .env.example .env
        warn "Please update .env file with your settings"
        if [ "$(detect_os)" = "Windows" ]; then
            warn "Edit the file using: notepad .env"
        else
            warn "Edit the file using: nano .env"
        fi
    else
        warn ".env file already exists, skipping..."
    fi
}

# Start services
start_services() {
    log "Starting services..."
    
    # Pull latest images
    docker-compose pull
    
    # Start services
    docker-compose up -d
    
    # Wait for services to be ready
    log "Waiting for services to start..."
    sleep 30
    
    # Check service health
    if ! curl -s localhost:9200 > /dev/null; then
        error "Elasticsearch failed to start"
        docker-compose logs elasticsearch
        return 1
    fi
    
    if ! curl -s localhost:9090 > /dev/null; then
        error "Prometheus failed to start"
        docker-compose logs prometheus
        return 1
    fi
}

# Main deployment function
deploy() {
    log "Starting deployment..."
    
    OS=$(detect_os)
    log "Detected OS: $OS"
    
    if [ "$OS" = "Windows" ] && [ ! -f /proc/version ]; then
        error "Please run this script in WSL2 or Git Bash"
        exit 1
    fi
    
    # Check requirements
    if ! check_requirements; then
        error "System requirements not met"
        exit 1
    fi
    
    # Install dependencies
    if ! install_dependencies; then
        error "Failed to install dependencies"
        exit 1
    fi
    
    # Configure system
    if ! configure_system; then
        error "Failed to configure system"
        exit 1
    fi
    
    # Setup directories
    if ! setup_directories; then
        error "Failed to set up directories"
        exit 1
    fi
    
    # Setup environment
    if ! setup_environment; then
        error "Failed to set up environment"
        exit 1
    fi
    
    # Start services
    if ! start_services; then
        error "Failed to start services"
        exit 1
    fi
    
    log "Deployment completed successfully!"
    log "Access URLs:"
    log "- Grafana: http://localhost:3001 (admin/admin123)"
    log "- Prometheus: http://localhost:9090"
    log "- Kibana: http://localhost:5601"
    log "- AlertManager: http://localhost:9093"
    
    warn "Don't forget to:"
    warn "1. Update .env file with your settings"
    warn "2. Configure email alerts in monitoring/alertmanager/config.yml"
    warn "3. Change default passwords for Grafana and other services"
    
    if [ "$OS" = "Windows" ]; then
        warn "Note: On Windows, make sure Docker Desktop is running and WSL2 integration is enabled"
    fi
}

# Run deployment
deploy 