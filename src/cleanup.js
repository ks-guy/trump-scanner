const Quote = require('./models/Quote');
const logger = require('./utils/logger');

async function cleanup() {
    try {
        // Close database connections
        await Quote.cleanup();
        logger.info('All connections closed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Error during cleanup:', error);
        process.exit(1);
    }
}

cleanup(); 