# Trump Scanner 3

A document scraping and analysis system with comprehensive monitoring and logging.

## System Requirements

- Docker Engine 20.10+
- Docker Compose 2.0+
- 4GB RAM minimum (8GB recommended)
- 20GB free disk space
- Linux/Unix-based system (Windows requires WSL2)

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/trump-scanner-3.git
cd trump-scanner-3
```

2. Set up the environment:
```bash
# Make setup script executable
chmod +x setup-logging.sh

# Run setup script
./setup-logging.sh
```

3. Start the services:
```bash
docker-compose up -d
```

## Service URLs

- Main Application: http://localhost:3000
- Monitoring:
  - Grafana: http://localhost:3001 (admin/admin123)
  - Prometheus: http://localhost:9090
  - AlertManager: http://localhost:9093
- Logging:
  - Kibana: http://localhost:5601
  - Elasticsearch: http://localhost:9200
  - Logstash: http://localhost:9600

## Directory Structure

```
trump-scanner-3/
├── src/                    # Source code
├── documents/              # Scraped documents
├── data/                  # Application data
├── logs/                  # Application logs
├── monitoring/            # Monitoring configurations
│   ├── alertmanager/     # AlertManager config
│   ├── prometheus/       # Prometheus config
│   ├── grafana/         # Grafana dashboards
│   ├── logstash/        # Logstash config
│   ├── filebeat/        # Filebeat config
│   └── elasticsearch/   # Elasticsearch config
└── docker-compose.yml    # Docker services configuration
```

## Configuration

1. Environment Variables:
   - Copy `.env.example` to `.env`
   - Update variables as needed

2. Monitoring Setup:
   - Update email settings in `monitoring/alertmanager/config.yml`
   - Customize alert rules in `monitoring/prometheus/rules/`
   - Adjust Grafana dashboards in `monitoring/grafana/provisioning/`

3. Logging Setup:
   - Configure log retention in `monitoring/elasticsearch/`
   - Adjust log patterns in `monitoring/logstash/pipeline/`
   - Modify log shipping in `monitoring/filebeat/filebeat.yml`

## Deployment

### First-time Setup

1. System Preparation:
```bash
# Install Docker and Docker Compose
curl -fsSL https://get.docker.com | sh
sudo curl -L "https://github.com/docker/compose/releases/download/v2.23.0/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Set up system limits
echo "vm.max_map_count=262144" | sudo tee -a /etc/sysctl.conf
sudo sysctl -w vm.max_map_count=262144
```

2. Create Required Directories:
```bash
mkdir -p documents data logs
chmod -R 755 documents data logs
```

### Production Deployment

1. Clone and Setup:
```bash
git clone https://github.com/yourusername/trump-scanner-3.git
cd trump-scanner-3
./setup-logging.sh
```

2. Configure Production Settings:
```bash
# Update environment variables
cp .env.example .env
nano .env

# Update monitoring configuration
nano monitoring/alertmanager/config.yml
```

3. Start Services:
```bash
docker-compose up -d
```

### Maintenance

1. Update Services:
```bash
git pull
docker-compose build --no-cache
docker-compose up -d
```

2. Backup Data:
```bash
# Backup documents and data
tar -czf backup-$(date +%Y%m%d).tar.gz documents/ data/

# Backup Elasticsearch indices
curl -X PUT "localhost:9200/_snapshot/backup" -H 'Content-Type: application/json' -d '{
  "type": "fs",
  "settings": {
    "location": "/backup"
  }
}'
```

3. Monitor Resources:
```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f

# Monitor resource usage
docker stats
```

## Troubleshooting

1. Elasticsearch fails to start:
```bash
# Check system limits
sudo sysctl -w vm.max_map_count=262144

# Check permissions
sudo chown -R 1000:1000 monitoring/elasticsearch/data
```

2. Logstash connection issues:
```bash
# Check Logstash status
docker-compose logs logstash

# Verify Elasticsearch connection
curl localhost:9200/_cat/health
```

3. Filebeat not shipping logs:
```bash
# Check Filebeat status
docker-compose logs filebeat

# Verify permissions
sudo chown root monitoring/filebeat/filebeat.yml
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

[Your License Here] 