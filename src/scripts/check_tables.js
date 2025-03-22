const mysql = require('mysql2/promise');
const dbConfig = require('../config/database');
const logger = require('../utils/logger');

async function checkTables() {
    let connection;
    
    try {
        connection = await mysql.createConnection(dbConfig.mysql);
        
        // Get all tables
        const [tables] = await connection.query('SHOW TABLES');
        logger.info('Database tables:');
        tables.forEach(table => {
            logger.info(`- ${Object.values(table)[0]}`);
        });
        
    } catch (error) {
        logger.error('Error checking tables:', error);
        throw error;
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

// Run check if script is called directly
if (require.main === module) {
    checkTables()
        .then(() => {
            logger.info('Table check completed successfully.');
            process.exit(0);
        })
        .catch(error => {
            logger.error('Table check failed:', error);
            process.exit(1);
        });
} 