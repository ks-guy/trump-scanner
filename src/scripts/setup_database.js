require('dotenv').config();
const mysql = require('mysql2/promise');
const logger = require('../utils/logger');
const dbConfig = require('../config/database');

async function setupDatabase() {
    // Create connection without database selected
    const connection = await mysql.createConnection({
        host: dbConfig.mysql.host,
        user: dbConfig.mysql.user,
        password: dbConfig.mysql.password,
        port: dbConfig.mysql.port
    });

    try {
        // Create database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS ${dbConfig.mysql.database}`);
        logger.info(`Database ${dbConfig.mysql.database} created or already exists`);

        // Use the database
        await connection.query(`USE ${dbConfig.mysql.database}`);

        // Create quotes table
        await connection.query(`
            CREATE TABLE IF NOT EXISTS quotes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                source_url VARCHAR(2048) NOT NULL,
                quote_text TEXT NOT NULL,
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                context JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                INDEX idx_source_url (source_url(255)),
                FULLTEXT INDEX idx_quote_text (quote_text)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        logger.info('Quotes table created or already exists');

    } catch (error) {
        logger.error('Error setting up database:', error);
        throw error;
    } finally {
        await connection.end();
    }
}

if (require.main === module) {
    setupDatabase()
        .then(() => {
            logger.info('Database setup completed successfully');
            process.exit(0);
        })
        .catch(error => {
            logger.error('Database setup failed:', error);
            process.exit(1);
        });
}

module.exports = setupDatabase; 