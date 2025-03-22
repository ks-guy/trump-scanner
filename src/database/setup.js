import mysql from 'mysql2/promise';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

async function setupDatabase() {
    try {
        // Create connection pool
        const pool = mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: parseInt(process.env.DB_PORT || '3306', 10),
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Get connection
        const connection = await pool.getConnection();
        try {
            // Create legal_documents table
            await connection.execute(`
                CREATE TABLE IF NOT EXISTS legal_documents (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    source_id INT,
                    url VARCHAR(768) NOT NULL,
                    title VARCHAR(512),
                    case_number VARCHAR(255),
                    court VARCHAR(255),
                    filing_date TIMESTAMP NULL,
                    content TEXT,
                    metadata JSON,
                    pdf_urls JSON,
                    downloaded_pdfs JSON,
                    pdf_content JSON,
                    scraped_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FOREIGN KEY (source_id) REFERENCES sources(id),
                    UNIQUE KEY unique_document_url (url(768)),
                    INDEX idx_case_number (case_number),
                    INDEX idx_court (court),
                    INDEX idx_filing_date (filing_date)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            logger.info('Database tables created successfully');
        } finally {
            connection.release();
        }

        await pool.end();
    } catch (error) {
        logger.error('Error setting up database:', error);
        throw error;
    }
}

setupDatabase().catch(error => {
    logger.error('Database setup failed:', error);
    process.exit(1);
}); 