import mysql from 'mysql2/promise';
import { logger } from '../utils/logger.js';

const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'trump_scanner',
  password: process.env.DB_PASSWORD || 'trump_scanner_password',
  database: process.env.DB_NAME || 'trump_scanner',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

export async function connectDB() {
  try {
    const connection = await pool.getConnection();
    logger.info('Successfully connected to MySQL database');
    connection.release();
    return pool;
  } catch (error) {
    logger.error('Error connecting to MySQL database:', error);
    throw error;
  }
}

export async function query(sql, params) {
  try {
    const [results] = await pool.execute(sql, params);
    return results;
  } catch (error) {
    logger.error('Error executing MySQL query:', error);
    throw error;
  }
}

export default {
  connectDB,
  query,
  pool
}; 