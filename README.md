# Trump Scanner

A web scraper for collecting legal documents and quotes related to Donald Trump.

## Features

- Legal document scraping from CourtListener
- Quote collection from various sources
- PDF document processing
- MySQL database storage
- Prisma Studio for data monitoring

## Prerequisites

- Docker and Docker Compose
- Node.js 20+ (for local development)
- MySQL 8.0 (for local development)

## Quick Start with Docker

1. Clone the repository:
```bash
git clone https://github.com/ks-guy/trump-scanner.git
cd trump-scanner
```

2. Create a `.env` file with your ScrapeOps API key:
```
SCRAPEOPS_API_KEY=your_api_key_here
```

3. Start the services:
```bash
docker-compose up -d
```

4. Access Prisma Studio at http://localhost:5555

## Local Development Setup

1. Install dependencies:
```bash
npm install
```

2. Set up the database:
```bash
npx prisma migrate dev
```

3. Start Prisma Studio:
```bash
npx prisma studio
```

4. Start the scraper:
```bash
npm run scrape:legal
```

## Project Structure

- `src/services/scrapers/` - Scraper implementations
- `src/utils/` - Utility functions
- `prisma/` - Database schema and migrations
- `documents/` - Downloaded documents
- `error_logs/` - Error logs

## Environment Variables

- `SCRAPEOPS_API_KEY` - Your ScrapeOps API key
- `DATABASE_URL` - MySQL connection string (default: mysql://scanner_user:scanner_password@localhost:3306/trump_scanner)

## Docker Commands

- Start services: `docker-compose up -d`
- Stop services: `docker-compose down`
- View logs: `docker-compose logs -f`
- Rebuild: `docker-compose up -d --build`

## Database Backup

To backup the database:
```bash
npx prisma db pull
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request 