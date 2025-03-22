const mysql = require('mysql2/promise');
const config = require('./config/database');
const logger = require('./utils/logger');

async function testConnection() {
    try {
        const connection = await mysql.createConnection(config.mysql);
        logger.info('Successfully connected to database');
        
        // Test query
        const [result] = await connection.execute('SELECT 1');
        logger.info('Database query successful');
        
        await connection.end();
        logger.info('Connection closed successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Database connection failed:', error);
        process.exit(1);
    }
}

testConnection(); 