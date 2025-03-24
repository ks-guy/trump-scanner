import winston from 'winston';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create logs directory if it doesn't exist
const logsDir = join(__dirname, '../../logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logDir = join(__dirname, '../../logs');
const errorLogPath = join(logDir, 'error.log');
const combinedLogPath = join(logDir, 'combined.log');

const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
);

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: logFormat,
    transports: [
        new winston.transports.File({
            filename: errorLogPath,
            level: 'error'
        }),
        new winston.transports.File({
            filename: combinedLogPath
        })
    ]
});

// If we're not in production, log to the console as well
if (process.env.NODE_ENV !== 'production') {
    logger.add(new winston.transports.Console({
        format: winston.format.combine(
            winston.format.colorize(),
            winston.format.simple()
        )
    }));
}

export function createLogger(module) {
    return winston.createLogger({
        level: process.env.LOG_LEVEL || 'info',
        format: logFormat,
        defaultMeta: { module },
        transports: [
            new winston.transports.File({
                filename: errorLogPath,
                level: 'error'
            }),
            new winston.transports.File({
                filename: combinedLogPath
            })
        ]
    });
}

/**
 * Create a logger instance for a specific component
 * @param {string} component - The name of the component
 * @returns {winston.Logger} - The configured logger instance
 */
export function createLoggerComponent(componentName) {
    return {
        info: (message, ...args) => {
            console.log(`[${componentName}] INFO:`, message, ...args);
        },
        warn: (message, ...args) => {
            console.warn(`[${componentName}] WARN:`, message, ...args);
        },
        error: (message, ...args) => {
            console.error(`[${componentName}] ERROR:`, message, ...args);
        },
        debug: (message, ...args) => {
            if (process.env.DEBUG) {
                console.debug(`[${componentName}] DEBUG:`, message, ...args);
            }
        }
    };
}

export { logger }; 