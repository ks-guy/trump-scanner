const express = require('express');
const client = require('prom-client');
const { register, metrics } = require('./monitoring/metrics');
const { createLogger } = require('./utils/logger');
const { initializeDatabase } = require('./database/connection');

const app = express();
const logger = createLogger('Server');
const port = process.env.PORT || 3000;

// Enable metrics collection
client.collectDefaultMetrics({
    register,
    prefix: 'scraper_'
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ status: 'ok' });
});

// Metrics endpoint for Prometheus
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

async function startServer() {
    try {
        // Initialize database
        await initializeDatabase();
        logger.info('Database initialized successfully');

        // Start the server
        app.listen(port, () => {
            logger.info(`Server is running on port ${port}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer(); 