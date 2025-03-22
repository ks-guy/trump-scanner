import winston from 'winston';
import path from 'path';

const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'debug/logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'debug/logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

export const createLogger = (name) => {
    return logger.child({ service: name });
};

export default logger; 