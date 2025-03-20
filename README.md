# Trump Scanner

A distributed web crawler for monitoring and analyzing Trump-related content across various sources.

## Features

### 1. Distributed Web Crawler
- Automatic quote detection with context capture
- CAPTCHA solving via 2Captcha API
- Multi-source monitoring (news, social media, transcripts)
- Context-aware scraping (3 sentences before/after quotes)
- Trump keyword detection ("donald", "trump", "45th president")

### 2. Database Management
- MySQL with connection pooling (max 15 connections)
- Daily automated backups at 2 AM
- LZ4 compression for stored HTML
- Full-text search implementation
- GDPR-compliant data anonymization

### 3. Error Recovery System
- Comprehensive error logging with stack traces
- Automatic resume from last checkpoint
- Telegram bot alerts for critical failures
- Rate limit monitoring and handling

### 4. Compliance Features
- Robots.txt validation and caching
- Domain-specific rate limiting
- GDPR-compliant data handling
- Ethical scraping practices

### 5. Performance Optimization
- Redis DNS caching
- LZ4 compression for HTML storage
- Priority queue for high-value domains
- Distributed scraping capabilities

## Prerequisites

- Node.js (v14 or higher)
- Docker Desktop
- 2Captcha API account
- Telegram Bot Token

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/trump-scanner.git
cd trump-scanner
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Start Docker services:
```bash
docker-compose up -d
```

5. Create required directories:
```bash
mkdir -p error_logs backups
```

## Configuration

### Environment Variables
Create a `.env` file with the following variables:
- `DB_HOST`: MySQL host (default: localhost)
- `DB_USER`: Database username (default: scanner_user)
- `DB_PASSWORD`: Database password (default: scanner_password)
- `DB_NAME`: Database name (default: trump_scanner)
- `DB_POOL_MAX`: Maximum database connections (default: 15)
- `REDIS_URL`: Redis connection URL (default: redis://localhost:6379)
- `TELEGRAM_BOT_TOKEN`: Your Telegram bot token
- `TELEGRAM_CHAT_ID`: Your Telegram chat ID
- `CAPTCHA_API_KEY`: Your 2Captcha API key

### Scraping Configuration
- `MAX_CONCURRENT_SCRAPES`: Maximum concurrent scraping jobs (default: 50)
- `REQUEST_DELAY_MIN`: Minimum delay between requests (default: 1000ms)
- `REQUEST_DELAY_MAX`: Maximum delay between requests (default: 3000ms)
- `USER_AGENT`: Custom user agent string

## Usage

1. Start the application:
```bash
npm start
```

2. Monitor via Telegram:
- Start the bot: `/start`
- View statistics: `/stats`

3. Database backups:
- Automatic daily backups at 2 AM
- Manual backup: `npm run backup`

## Error Logs

Error logs are stored in the `error_logs` directory:
- `error.log`: General errors
- `scraper_error.log`: Scraping-related errors
- `captcha_error.log`: CAPTCHA solving errors
- `backup_error.log`: Backup-related errors
- `telegram_error.log`: Telegram bot errors

## Development

1. Start in development mode:
```bash
npm run dev
```

2. Run tests:
```bash
npm test
```

3. Lint code:
```bash
npm run lint
```

4. Format code:
```bash
npm run format
```

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push to the branch
5. Create a new Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details. 