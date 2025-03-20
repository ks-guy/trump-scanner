const { Sequelize } = require('sequelize');
const { logger } = require('../utils/logger');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'trump_scanner',
    process.env.DB_USER || 'scanner_user',
    process.env.DB_PASSWORD || 'scanner_password',
    {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT) || 3306,
        dialect: 'mysql',
        logging: (msg) => logger.debug(msg),
        pool: {
            max: 5,
            min: 0,
            acquire: 30000,
            idle: 10000
        },
        define: {
            charset: 'utf8mb4',
            collate: 'utf8mb4_unicode_ci',
            timestamps: true
        }
    }
);

// Test database connection
async function testConnection() {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully.');
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        throw error;
    }
}

// Initialize database
async function initializeDatabase() {
    try {
        // Test connection
        await testConnection();

        // Sync models with database
        await sequelize.sync({ alter: process.env.NODE_ENV === 'development' });
        logger.info('Database models synchronized successfully.');
    } catch (error) {
        logger.error('Database initialization failed:', error);
        throw error;
    }
}

module.exports = {
    sequelize,
    initializeDatabase
}; 