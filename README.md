# Trump Scanner

A comprehensive system for scraping, analyzing, and storing Trump-related legal documents and quotes. This application provides a robust platform for monitoring and analyzing legal documents, media content, and quotes related to Trump.

## Features

- **Document Scraping**: Automated scraping of legal documents from various sources
- **Media Processing**: Support for processing PDFs, images, videos, and audio files
- **Quote Extraction**: Intelligent extraction and analysis of quotes from documents
- **Sentiment Analysis**: Analysis of document and quote sentiment
- **Entity Recognition**: Identification of named entities in documents and quotes
- **Full-Text Search**: Advanced search capabilities using Elasticsearch
- **Monitoring**: Comprehensive monitoring with Prometheus, Grafana, and Alertmanager
- **Backup System**: Automated database and file backups
- **API**: RESTful API for accessing and managing data
- **Document Management**: Version control and citation tracking

## Prerequisites

- Node.js >= 18.0.0
- MySQL >= 8.0
- Redis >= 6.0
- Elasticsearch >= 7.0
- FFmpeg (for media processing)
- Docker and Docker Compose (optional, for containerized deployment)

## Quick Start

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/trump-scanner.git
   cd trump-scanner
   ```

2. Run the setup script:
   ```bash
   npm run setup
   ```

3. Update the `.env` file with your configuration:
   ```bash
   cp .env.example .env
   # Edit .env with your settings
   ```

4. Start the application:
   ```bash
   npm start
   ```

## Docker Deployment

1. Build and start the containers:
   ```bash
   npm run docker:build
   npm run docker:up
   ```

2. Monitor the logs:
   ```bash
   npm run docker:logs
   ```

3. Stop the containers:
   ```bash
   npm run docker:down
   ```

## Accessing Services

Once the application is running, you can access:

- Main Application: http://localhost:3000
- Prisma Studio: http://localhost:5555
- Grafana Dashboard: http://localhost:3001
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- Elasticsearch: http://localhost:9200

## Database Configuration

The application uses MySQL as its primary database. The database is configured with the following default settings:

- Database Name: `trump_scanner`
- Username: `trump_scanner`
- Password: `trump_scanner_password`
- Host: `localhost`
- Port: `3306`

To modify these settings, update the `DATABASE_URL` in your `.env` file.

## Project Structure

```
trump-scanner/
├── src/
│   ├── app.js              # Main application entry point
│   ├── config/             # Configuration files
│   ├── services/           # Business logic services
│   ├── scripts/            # Utility scripts
│   └── utils/              # Helper utilities
├── prisma/
│   └── schema.prisma       # Database schema
├── documents/              # Document storage
├── error_logs/            # Error logs
├── logs/                  # Application logs
├── monitoring/            # Monitoring configuration
├── backups/              # Database backups
├── scripts/              # Setup and utility scripts
├── .env.example          # Example environment variables
├── docker-compose.yml    # Docker configuration
└── package.json          # Project dependencies
```

## Environment Variables

The application requires several environment variables to be set. See `.env.example` for a complete list of required variables.

Key variables include:
- `DATABASE_URL`: MySQL connection string
- `REDIS_HOST`: Redis host
- `ELASTICSEARCH_NODE`: Elasticsearch URL
- `JWT_SECRET`: Secret for JWT tokens
- `API_KEYS`: Various API keys for external services

## Common Docker Commands

```bash
# Build containers
npm run docker:build

# Start containers
npm run docker:up

# Stop containers
npm run docker:down

# View logs
npm run docker:logs

# Access container shell
docker-compose exec app sh
```

## Database Backup and Restore

### Creating a Backup

```bash
npm run backup
```

### Restoring from Backup

```bash
npm run restore
```

## Troubleshooting

### Database Connection Issues

1. Check if MySQL is running:
   ```bash
   docker-compose ps
   ```

2. Verify database credentials in `.env`

3. Check database logs:
   ```bash
   docker-compose logs db
   ```

### Redis Issues

1. Check Redis connection:
   ```bash
   docker-compose exec redis redis-cli ping
   ```

2. Verify Redis configuration in `.env`

### Elasticsearch Issues

1. Check Elasticsearch health:
   ```bash
   curl http://localhost:9200/_cluster/health
   ```

2. Verify Elasticsearch configuration in `.env`

### General Issues

1. Check application logs:
   ```bash
   npm run docker:logs
   ```

2. Verify all required environment variables are set

3. Check disk space and permissions

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 