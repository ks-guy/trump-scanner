import mysql from 'mysql2/promise';
import config from '../config/database.js';
import { logger } from '../utils/logger.js';

async function updateSchema() {
    let connection;
    try {
        connection = await mysql.createConnection(config.mysql);
        
        // Drop the foreign key constraint
        await connection.query('ALTER TABLE quote_media DROP FOREIGN KEY quote_media_ibfk_1');
        
        // Drop the existing quotes table
        await connection.query('DROP TABLE IF EXISTS quotes');
        
        // Create the quotes table with the new schema
        await connection.query(`
            CREATE TABLE quotes (
                id INT AUTO_INCREMENT PRIMARY KEY,
                source_url VARCHAR(2048) NOT NULL,
                quote_text TEXT NOT NULL,
                context JSON,
                pdf_path VARCHAR(1024),
                timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FULLTEXT(quote_text)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        `);
        
        // Recreate the foreign key constraint
        await connection.query(`
            ALTER TABLE quote_media 
            ADD CONSTRAINT quote_media_ibfk_1 
            FOREIGN KEY (quote_id) 
            REFERENCES quotes(id)
        `);
        
        logger.info('Schema updated successfully');
        process.exit(0);
    } catch (error) {
        logger.error('Failed to update schema:', error);
        process.exit(1);
    } finally {
        if (connection) {
            await connection.end();
        }
    }
}

updateSchema(); 