import { Quote } from '../models/Quote.js';
import { logger } from '../utils/logger.js';

async function initializeDatabase() {
    try {
        await Quote.initialize();
        logger.info('Database initialized successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Failed to initialize database:', error);
        process.exit(1);
    }
}

initializeDatabase(); 