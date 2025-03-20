const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const { logger } = require('./utils/logger');
const mediaRoutes = require('./routes/mediaRoutes');
const searchRoutes = require('./routes/searchRoutes');
const cacheWarmingService = require('./services/cache/CacheWarmingService');
const { initializeDatabase } = require('./database/connection');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Routes
app.use('/api/media', mediaRoutes);
app.use('/api/search', searchRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// Initialize application
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Initialize database
        await initializeDatabase();

        // Start cache warming service
        cacheWarmingService.startPeriodicWarming();

        // Start server
        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer();

module.exports = app; 