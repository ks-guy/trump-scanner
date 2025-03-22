import mysql from 'mysql2/promise';
import { logger } from '../utils/logger.js';
import config from '../config/database.js';

class Quote {
    static pool = null;

    static async getConnection() {
        if (!this.pool) {
            try {
                this.pool = mysql.createPool({
                    ...config.mysql,
                    waitForConnections: true,
                    connectionLimit: 10,
                    queueLimit: 0,
                    enableKeepAlive: true,
                    keepAliveInitialDelay: 0
                });

                // Test the connection
                const connection = await this.pool.getConnection();
                await connection.ping();
                connection.release();
                logger.info('Database connection pool initialized successfully');
            } catch (error) {
                logger.error('Failed to initialize database connection pool:', error);
                throw error;
            }
        }
        return this.pool;
    }

    static async initialize() {
        try {
            const pool = await this.getConnection();
            
            // Create quotes table if it doesn't exist
            await pool.execute(`
                CREATE TABLE IF NOT EXISTS quotes (
                    id INT AUTO_INCREMENT PRIMARY KEY,
                    source_url VARCHAR(2048) NOT NULL,
                    quote_text TEXT NOT NULL,
                    context JSON,
                    pdf_path VARCHAR(1024),
                    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                    FULLTEXT(quote_text)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
            `);

            logger.info('Quotes table initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Quote model:', error);
            throw error;
        }
    }

    static async insert(quote) {
        const pool = await this.getConnection();
        const connection = await pool.getConnection();
        
        try {
            const [result] = await connection.execute(
                'INSERT INTO quotes (source_url, quote_text, context, pdf_path) VALUES (?, ?, ?, ?)',
                [quote.source_url, quote.quote_text, JSON.stringify(quote.context), quote.pdf_path]
            );

            return result.insertId;
        } catch (error) {
            logger.error('Failed to insert quote:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async bulkInsert(quotes) {
        if (!quotes.length) return [];

        const pool = await this.getConnection();
        const connection = await pool.getConnection();
        
        try {
            const values = quotes.map(q => [
                q.source_url,
                q.quote_text,
                JSON.stringify(q.context),
                q.pdf_path
            ]);

            const [result] = await connection.query(
                'INSERT INTO quotes (source_url, quote_text, context, pdf_path) VALUES ?',
                [values]
            );

            return result.insertId;
        } catch (error) {
            logger.error('Failed to bulk insert quotes:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async findBySourceUrl(url) {
        const pool = await this.getConnection();
        const connection = await pool.getConnection();
        
        try {
            const [rows] = await connection.execute(
                'SELECT * FROM quotes WHERE source_url = ?',
                [url]
            );

            return rows;
        } catch (error) {
            logger.error('Failed to find quotes by source URL:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async search(query, options = {}) {
        const pool = await this.getConnection();
        const connection = await pool.getConnection();
        
        try {
            const limit = options.limit || 10;
            const offset = options.offset || 0;
            
            const [rows] = await connection.execute(
                'SELECT *, MATCH(quote_text) AGAINST(? IN NATURAL LANGUAGE MODE) as relevance ' +
                'FROM quotes ' +
                'WHERE MATCH(quote_text) AGAINST(? IN NATURAL LANGUAGE MODE) ' +
                'ORDER BY relevance DESC ' +
                'LIMIT ? OFFSET ?',
                [query, query, limit, offset]
            );

            return rows;
        } catch (error) {
            logger.error('Failed to search quotes:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getStats() {
        const pool = await this.getConnection();
        const connection = await pool.getConnection();
        
        try {
            const [[countResult]] = await connection.execute(
                'SELECT COUNT(*) as totalQuotes FROM quotes'
            );

            const [[latestResult]] = await connection.execute(
                'SELECT * FROM quotes ORDER BY timestamp DESC LIMIT 1'
            );

            const [[oldestResult]] = await connection.execute(
                'SELECT * FROM quotes ORDER BY timestamp ASC LIMIT 1'
            );

            return {
                totalQuotes: countResult.totalQuotes,
                latestQuote: latestResult,
                oldestQuote: oldestResult
            };
        } catch (error) {
            logger.error('Failed to get quote statistics:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async getPDFPath(quoteId) {
        const pool = await this.getConnection();
        const connection = await pool.getConnection();
        
        try {
            const [[result]] = await connection.execute(
                'SELECT pdf_path FROM quotes WHERE id = ?',
                [quoteId]
            );

            return result?.pdf_path;
        } catch (error) {
            logger.error('Failed to get PDF path:', error);
            throw error;
        } finally {
            connection.release();
        }
    }

    static async cleanup() {
        if (this.pool) {
            try {
                await this.pool.end();
                this.pool = null;
                logger.info('Database connection pool closed successfully');
            } catch (error) {
                logger.error('Error closing database connection pool:', error);
                throw error;
            }
        }
    }
}

export { Quote }; 