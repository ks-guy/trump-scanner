const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

class SetupScript {
    static async setup() {
        console.log('Starting Trump Scanner setup...');
        
        try {
            // Create necessary directories
            const directories = [
                'src/config',
                'src/database',
                'src/models',
                'src/services',
                'src/workers/backup',
                'src/workers/restore',
                'src/workers/notification',
                'src/workers/cleanup',
                'src/workers/health',
                'src/workers/analytics',
                'src/scripts',
                'src/utils',
                'src/middleware',
                'src/routes',
                'src/controllers',
                'src/views',
                'src/public',
                'src/tests',
                'logs',
                'error_logs',
                'backups',
                'temp'
            ];

            for (const dir of directories) {
                fs.mkdirSync(dir, { recursive: true });
                console.log(`Created directory: ${dir}`);
            }

            // Create package.json
            const packageJson = {
                "name": "trump-scanner",
                "version": "1.0.0",
                "description": "Distributed web crawler for monitoring Trump-related content",
                "main": "src/index.js",
                "scripts": {
                    "start": "node src/index.js",
                    "dev": "nodemon src/index.js",
                    "test": "jest",
                    "setup": "node setup.js"
                },
                "dependencies": {
                    "express": "^4.18.2",
                    "mysql2": "^3.6.0",
                    "sequelize": "^6.32.1",
                    "puppeteer": "^21.0.0",
                    "cheerio": "^1.0.0-rc.12",
                    "playwright": "^1.40.0",
                    "winston": "^3.10.0",
                    "dotenv": "^16.3.1",
                    "axios": "^1.5.0",
                    "cors": "^2.8.5",
                    "helmet": "^7.0.0",
                    "compression": "^1.7.4",
                    "morgan": "^1.10.0",
                    "jsonwebtoken": "^9.0.2",
                    "bcryptjs": "^2.4.3",
                    "nodemailer": "^6.9.4",
                    "socket.io": "^4.7.2",
                    "redis": "^4.6.7",
                    "bull": "^4.11.3",
                    "express-rate-limit": "^6.9.0",
                    "express-validator": "^7.0.1",
                    "multer": "^1.4.5-lts.1",
                    "sharp": "^0.32.5",
                    "ffmpeg-static": "^5.1.0",
                    "fluent-ffmpeg": "^2.1.2",
                    "uuid": "^9.0.1",
                    "moment": "^2.29.4",
                    "lodash": "^4.17.21"
                },
                "devDependencies": {
                    "nodemon": "^3.0.1",
                    "jest": "^29.7.0",
                    "supertest": "^6.3.3",
                    "eslint": "^8.50.0",
                    "prettier": "^3.0.3"
                }
            };

            fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2));
            console.log('Created package.json');

            // Create .env file
            const envContent = `# Database Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=trump_scanner
DB_USER=root
DB_PASSWORD=your_password

# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=24h

# Email Configuration
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_specific_password

# API Configuration
API_PORT=3000
API_URL=http://localhost:3000

# Scraping Configuration
MAX_CONCURRENT_SCRAPES=50
REQUEST_DELAY=2000
USER_AGENT_ROTATION=true

# Media Processing
MEDIA_STORAGE_PATH=./media
MAX_VIDEO_SIZE=100MB
ALLOWED_VIDEO_FORMATS=mp4,webm,ogg

# Backup Configuration
BACKUP_PATH=./backups
BACKUP_RETENTION_DAYS=30

# Logging
LOG_LEVEL=info
LOG_FILE_PATH=./logs/app.log

# Security
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100`;
            
            fs.writeFileSync('.env', envContent);
            console.log('Created .env file');

            // Create docker-compose.yml
            const dockerCompose = {
                version: '3.8',
                services: {
                    app: {
                        build: '.',
                        ports: ['3000:3000'],
                        volumes: ['./src:/app/src', './logs:/app/logs'],
                        environment: {
                            NODE_ENV: 'development',
                            DB_HOST: 'db',
                            REDIS_HOST: 'redis'
                        },
                        depends_on: ['db', 'redis']
                    },
                    db: {
                        image: 'mysql:8.0',
                        environment: {
                            MYSQL_ROOT_PASSWORD: 'your_password',
                            MYSQL_DATABASE: 'trump_scanner'
                        },
                        ports: ['3306:3306'],
                        volumes: ['./mysql_data:/var/lib/mysql']
                    },
                    redis: {
                        image: 'redis:6.2',
                        ports: ['6379:6379'],
                        volumes: ['./redis_data:/data']
                    }
                }
            };

            fs.writeFileSync('docker-compose.yml', JSON.stringify(dockerCompose, null, 2));
            console.log('Created docker-compose.yml');

            // Create README.md
            const readmeContent = `# Trump Scanner

A distributed web crawler for monitoring Trump-related content.

## Features

- Distributed web crawling system
- Media content management
- Real-time notifications
- Analytics and reporting
- Backup and restore functionality
- Health monitoring
- API endpoints for data access

## Prerequisites

- Node.js (v14 or higher)
- MySQL 8.0
- Redis 6.2
- Docker and Docker Compose (optional)

## Installation

1. Clone the repository
2. Run \`npm install\`
3. Copy \`.env.example\` to \`.env\` and configure your environment variables
4. Run \`npm run setup\` to initialize the database and create necessary directories
5. Start the application with \`npm start\`

## Docker Setup

1. Build and start containers:
   \`\`\`bash
   docker-compose up -d
   \`\`\`

2. Initialize the database:
   \`\`\`bash
   docker-compose exec app npm run setup
   \`\`\`

## Development

- Run in development mode: \`npm run dev\`
- Run tests: \`npm test\`
- Lint code: \`npm run lint\`

## API Documentation

API documentation is available at \`/api-docs\` when running the application.

## License

MIT`;

            fs.writeFileSync('README.md', readmeContent);
            console.log('Created README.md');

            // Install dependencies
            console.log('Installing dependencies...');
            execSync('npm install', { stdio: 'inherit' });

            // Initialize database
            console.log('Initializing database...');
            execSync('node src/scripts/init-db.js', { stdio: 'inherit' });

            console.log('Setup completed successfully!');
        } catch (error) {
            console.error('Setup failed:', error);
            process.exit(1);
        }
    }
}

// Run setup
SetupScript.setup(); 