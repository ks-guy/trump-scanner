const { Sequelize } = require('sequelize');
const { createLogger } = require('../utils/logger');

const logger = createLogger('Database');

const sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: './database.sqlite',
    logging: (msg) => logger.debug(msg)
});

const initializeDatabase = async () => {
    try {
        await sequelize.authenticate();
        logger.info('Database connection established successfully');
        
        // Sync all models
        await sequelize.sync();
        logger.info('Database models synchronized');
        
        return true;
    } catch (error) {
        logger.error('Unable to connect to the database:', error);
        throw error;
    }
};

module.exports = {
    sequelize,
    initializeDatabase
}; 