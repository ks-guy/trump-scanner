import dotenv from 'dotenv';
dotenv.config();

const config = {
    mysql: {
        host: process.env.DB_HOST || '192.168.1.116',
        user: process.env.DB_USER || 'tscan3',
        password: process.env.DB_PASSWORD || '7EVVN9DrJurYGxBU',
        database: process.env.DB_NAME || 'tscan3',
        port: parseInt(process.env.DB_PORT || '3306'),
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0,
        charset: 'utf8mb4'
    }
};

export default config; 