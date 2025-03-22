const app = require('./app');
const { createLogger } = require('./utils/logger');
const { initializeDatabase } = require('./database/connection');

const logger = createLogger('Server');
const PORT = process.env.PORT || 3000;

async function startServer() {
    try {
        // Initialize database
        await initializeDatabase();
        logger.info('Database initialized successfully');

        // Start the server
        app.listen(PORT, () => {
            logger.info(`Server is running on port ${PORT}`);
        });
    } catch (error) {
        logger.error('Failed to start server:', error);
        process.exit(1);
    }
}

startServer(); 