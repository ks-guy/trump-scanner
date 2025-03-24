# Trump Quote Scanner

A comprehensive tool for scanning, analyzing, and monitoring Trump-related content from various sources.

## Features

- Automated scraping of legal documents and news articles
- Real-time monitoring of new content
- Advanced text analysis and sentiment detection
- Elasticsearch-powered search functionality
- Redis caching for improved performance
- MySQL database for persistent storage
- Prometheus metrics and Grafana dashboards
- AlertManager for notifications
- Kibana for log visualization

## Prerequisites

- Docker and Docker Compose
- Node.js 18 or higher (for local development)
- At least 4GB of RAM
- 20GB of free disk space

## Quick Start

1. Clone the repository:
```bash
git clone https://github.com/yourusername/trump-scanner.git
cd trump-scanner
```

2. Create a `.env` file in the root directory:
```bash
cp .env.example .env
```

3. Start the application:
```bash
docker-compose up -d
```

4. Verify the services are running:
```bash
docker-compose ps
```

5. Check the application health:
```bash
curl http://localhost:3000/health
```

## Docker Deployment

The application uses Docker Compose to manage multiple services:

- `app`: Main application service
- `db`: MySQL database
- `redis`: Redis cache
- `elasticsearch`: Search engine
- `prometheus`: Metrics collection
- `grafana`: Metrics visualization
- `alertmanager`: Alert management
- `kibana`: Log visualization

### Starting Services

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Stop services
docker-compose down
```

### Database Configuration

The MySQL database is automatically initialized with:
- Database name: `trump_scanner`
- Username: `trump_scanner`
- Password: `trump_scanner`
- Required tables are created on startup

### Monitoring

- Grafana: http://localhost:3001
- Kibana: http://localhost:5601
- Prometheus: http://localhost:9090
- AlertManager: http://localhost:9093

## Project Structure

```
trump-scanner/
├── src/
│   ├── config/         # Configuration files
│   ├── services/       # Core services
│   ├── scripts/        # Utility scripts
│   └── index.js        # Application entry point
├── docker/             # Docker configuration
├── logs/              # Application logs
├── data/              # Persistent data
├── .env.example       # Example environment variables
├── docker-compose.yml # Docker Compose configuration
├── Dockerfile         # Application Dockerfile
└── package.json       # Node.js dependencies
```

## Environment Variables

Required environment variables:
- `NODE_ENV`: Application environment (development/production)
- `DB_HOST`: MySQL host
- `DB_USER`: MySQL username
- `DB_PASSWORD`: MySQL password
- `DB_NAME`: MySQL database name
- `REDIS_HOST`: Redis host
- `ELASTICSEARCH_HOST`: Elasticsearch host
- `LOG_LEVEL`: Logging level

## Common Docker Commands

```bash
# Build images
docker-compose build

# Start services
docker-compose up -d

# Stop services
docker-compose down

# View logs
docker-compose logs -f

# Restart services
docker-compose restart

# Check service status
docker-compose ps
```

## Backup and Restore

### Database Backup
```bash
docker-compose exec db mysqldump -u trump_scanner -ptrump_scanner trump_scanner > backup.sql
```

### Database Restore
```bash
docker-compose exec -T db mysql -u trump_scanner -ptrump_scanner trump_scanner < backup.sql
```

## Troubleshooting

1. If services fail to start:
   ```bash
   docker-compose down -v
   docker-compose up -d
   ```

2. If database connection fails:
   ```bash
   docker-compose restart db
   ```

3. If Elasticsearch is not accessible:
   ```bash
   docker-compose restart elasticsearch
   ```

4. Check service logs:
   ```bash
   docker-compose logs -f [service_name]
   ```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 