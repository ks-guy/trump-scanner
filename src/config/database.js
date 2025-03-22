import dotenv from 'dotenv';
dotenv.config();

const config = {
    mysql: {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'dummy_user',
        password: process.env.DB_PASSWORD || 'dummy_password',
        database: process.env.DB_NAME || 'trump_scanner',
        port: parseInt(process.env.DB_PORT || '3306'),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
    }
};

export default config; 