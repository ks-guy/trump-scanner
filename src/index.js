import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import bodyParser from 'body-parser';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { promClient } from './utils/metrics.js';
import { logger } from './utils/logger.js';
import { connectDB } from './config/database.js';
import { connectRedis } from './config/redis.js';
import { connectElasticsearch } from './config/elasticsearch.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();

// Middleware
app.use(cors());
app.use(helmet());
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', promClient.register.contentType);
        res.end(await promClient.register.metrics());
    } catch (error) {
        logger.error('Error collecting metrics:', error);
        res.status(500).send('Error collecting metrics');
    }
});

// Initialize connections
async function initializeApp() {
    try {
        await connectDB();
        await connectRedis();
        await connectElasticsearch();

        const PORT = process.env.PORT || 3000;
        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to initialize app:', error);
        process.exit(1);
    }
}

initializeApp(); 