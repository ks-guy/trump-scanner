const express = require('express');
const { ScraperService } = require('./ScraperService');
const { SourceManager } = require('./SourceManager');
const { QueueManager } = require('./QueueManager');
const { logger } = require('../../utils/logger');
const { healthCheck } = require('../../utils/health');

const app = express();
const port = process.env.SCRAPER_PORT || 3001;

// Initialize services
const queueManager = new QueueManager();
const sourceManager = new SourceManager();
const scraperService = new ScraperService(queueManager, sourceManager);

// Health check endpoint
app.get('/health', (req, res) => {
    const status = healthCheck();
    res.json(status);
});

// Start the scraper service
async function start() {
    try {
        // Initialize Redis connection
        await queueManager.initialize();
        
        // Load and validate sources
        await sourceManager.initialize();
        
        // Start the scraper service
        await scraperService.start();
        
        // Start the Express server
        app.listen(port, () => {
            logger.info(`Scraper service running on port ${port}`);
        });
    } catch (error) {
        logger.error('Failed to start scraper service:', error);
        process.exit(1);
    }
}

// Handle graceful shutdown
process.on('SIGTERM', async () => {
    logger.info('Received SIGTERM signal. Shutting down gracefully...');
    await scraperService.stop();
    await queueManager.close();
    process.exit(0);
});

start(); 