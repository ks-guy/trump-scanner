import mysql from 'mysql2/promise';
import config from '../config/database.js';
import { logger } from '../utils/logger.js';

async function checkDatabase() {
    let connection;
    try {
        connection = await mysql.createConnection(config.mysql);
        
        // Show table structure
        const [tables] = await connection.query('SHOW TABLES');
        logger.info('Tables:', tables);
        
        const [columns] = await connection.query('DESCRIBE quotes');
        logger.info('Quotes table structure:', columns);
        
        process.exit(0);
    } catch (error) {
        logger.error('Failed to check database:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

checkDatabase(); 