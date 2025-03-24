# Trump Scanner

A comprehensive web scraper for collecting and analyzing legal documents and quotes related to Donald Trump. The application uses a modern tech stack with containerized services for scalability and maintainability.

## Features

- **Legal Document Scraping**
  - Automated collection from CourtListener
  - PDF document processing
  - Document metadata extraction
  - Source tracking and verification

- **Quote Collection**
  - Automated quote extraction
  - Context preservation
  - Source attribution
  - Metadata enrichment

- **Data Storage & Search**
  - MySQL database for structured data
  - Redis for caching and performance
  - Elasticsearch for full-text search
  - Prisma ORM for database management

- **Monitoring & Logging**
  - Prometheus for metrics collection
  - Grafana for visualization
  - Loki for log aggregation
  - Promtail for log collection

## Prerequisites

- Docker (20.10.0 or higher)
- Docker Compose (2.0.0 or higher)
- Git

## Quick Start

1. **Clone the Repository**
```bash
git clone https://github.com/yourusername/trump-scanner.git
cd trump-scanner
```

2. **Set Up Environment**
```bash
# Copy the example environment file
cp .env.example .env

# Edit the .env file with your credentials
nano .env
```

3. **Start the Application**
```bash
# Make the start script executable
chmod +x start.sh

# Run the start script
./start.sh
```

The start script will:
- Install Docker and Docker Compose if needed
- Create necessary directories
- Build and start all containers
- Initialize the database
- Set up monitoring and logging

## Accessing the Services

Once the application is running, you can access:

- **Main Application**: http://localhost:3000
- **Prisma Studio** (Database UI): http://localhost:5555
- **Grafana** (Metrics Dashboard): http://localhost:3001
  - Default credentials: admin / (password from .env)
- **Prometheus** (Metrics): http://localhost:9090
- **Elasticsearch** (Search): http://localhost:9200

## Database Configuration

The application uses three main databases:

1. **MySQL (Main Database)**
   - Database: trump_scanner
   - User: trump_scanner
   - Password: trump_scanner_password
   - Port: 3306

2. **Redis (Cache)**
   - Password: trump_scanner_redis_password
   - Port: 6379

3. **Elasticsearch (Search)**
   - User: elastic
   - Password: trump_scanner_elastic_password
   - Port: 9200

All database credentials are managed in the `.env` file.

## Project Structure

```
trump-scanner/
├── config/
│   └── database.js    # Database configuration
├── src/
│   ├── services/
│   │   └── scrapers/
│   │       └── LegalDocumentScraper.js
│   └── utils/
│       └── database.js
├── prisma/
│   └── schema.prisma  # Database schema
├── scripts/
│   ├── init-db.sh     # Database initialization
│   ├── backup-db.sh   # Database backup
│   └── start.sh       # Application startup
├── legal_documents/   # Downloaded PDFs
├── error_logs/        # Error logs
├── logs/             # Application logs
├── backups/          # Database backups
├── docker-compose.yml
├── Dockerfile
└── .env.example
```

## Environment Variables

Required environment variables in `.env`:

```env
# Database Credentials
DB_HOST=localhost
DB_PORT=3306
DB_USER=trump_scanner
DB_PASSWORD=trump_scanner_password
DB_NAME=trump_scanner

# Redis Credentials
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=trump_scanner_redis_password
REDIS_DB=0

# Elasticsearch Credentials
ELASTICSEARCH_URL=http://localhost:9200
ELASTICSEARCH_USER=elastic
ELASTICSEARCH_PASSWORD=trump_scanner_elastic_password

# API Keys
SCRAPEOPS_API_KEY=your_scrapeops_api_key
COURT_LISTENER_API_KEY=your_court_listener_api_key
DOCUMENT_CLOUD_API_KEY=your_document_cloud_api_key
OPENAI_API_KEY=your_openai_api_key
ANTHROPIC_API_KEY=your_anthropic_api_key

# Monitoring
GRAFANA_ADMIN_PASSWORD=your_grafana_admin_password
```

## Docker Commands

Common Docker commands for managing the application:

```bash
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild services
docker-compose up -d --build

# Access MySQL CLI
docker-compose exec db mysql -u trump_scanner -p

# Access Redis CLI
docker-compose exec redis redis-cli -a trump_scanner_redis_password

# Access Elasticsearch
docker-compose exec elasticsearch curl -u elastic:trump_scanner_elastic_password localhost:9200
```

## Database Backup & Restore

### Creating a Backup
```bash
# For Unix/Linux
./scripts/backup-db.sh

# For Windows
.\scripts\backup-db.bat
```

Backups are stored in the `backups` directory with timestamps.

### Restoring from Backup
```bash
# Copy your backup file to backups/latest.sql
# The init-db.sh script will automatically import it
```

## Troubleshooting

1. **Database Connection Issues**
   - Check if MySQL container is running: `docker-compose ps db`
   - Verify credentials in `.env`
   - Check logs: `docker-compose logs db`

2. **Redis Connection Issues**
   - Verify Redis container is running
   - Check Redis password in `.env`
   - View Redis logs: `docker-compose logs redis`

3. **Elasticsearch Issues**
   - Check if Elasticsearch container is running
   - Verify memory settings in docker-compose.yml
   - View Elasticsearch logs: `docker-compose logs elasticsearch`

4. **General Issues**
   - Check all container logs: `docker-compose logs`
   - Verify all services are running: `docker-compose ps`
   - Check error logs in `error_logs` directory

## Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 