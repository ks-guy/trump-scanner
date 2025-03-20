const Queue = require('bull');
const { logger } = require('../../utils/logger');

class QueueManager {
    constructor() {
        this.scrapingQueue = null;
        this.processingQueue = null;
        this.redisConfig = {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: parseInt(process.env.REDIS_PORT) || 6379,
                password: process.env.REDIS_PASSWORD
            }
        };
    }

    async initialize() {
        try {
            // Initialize scraping queue
            this.scrapingQueue = new Queue('scraping', this.redisConfig);
            
            // Initialize processing queue
            this.processingQueue = new Queue('processing', this.redisConfig);
            
            // Set up queue event handlers
            this.setupQueueHandlers();
            
            logger.info('Queue manager initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize queue manager:', error);
            throw error;
        }
    }

    setupQueueHandlers() {
        // Scraping queue handlers
        this.scrapingQueue.on('error', error => {
            logger.error('Scraping queue error:', error);
        });

        this.scrapingQueue.on('failed', (job, error) => {
            logger.error(`Job ${job.id} failed:`, error);
        });

        // Processing queue handlers
        this.processingQueue.on('error', error => {
            logger.error('Processing queue error:', error);
        });

        this.processingQueue.on('failed', (job, error) => {
            logger.error(`Processing job ${job.id} failed:`, error);
        });
    }

    async getNextJob() {
        try {
            return await this.scrapingQueue.getJob(['active', 'waiting']);
        } catch (error) {
            logger.error('Error getting next job:', error);
            return null;
        }
    }

    async addSourceToQueue(source) {
        try {
            await this.scrapingQueue.add({
                source: source.id,
                type: source.type,
                url: source.url
            }, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            });
            logger.info(`Added source ${source.id} to scraping queue`);
        } catch (error) {
            logger.error(`Error adding source ${source.id} to queue:`, error);
            throw error;
        }
    }

    async addToProcessingQueue(data) {
        try {
            await this.processingQueue.add(data, {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 5000
                }
            });
            logger.info('Added content to processing queue');
        } catch (error) {
            logger.error('Error adding content to processing queue:', error);
            throw error;
        }
    }

    async retryJob(job) {
        try {
            await job.retry();
            logger.info(`Retrying job ${job.id}`);
        } catch (error) {
            logger.error(`Error retrying job ${job.id}:`, error);
            throw error;
        }
    }

    async close() {
        try {
            await this.scrapingQueue.close();
            await this.processingQueue.close();
            logger.info('Queue manager closed successfully');
        } catch (error) {
            logger.error('Error closing queue manager:', error);
            throw error;
        }
    }
}

module.exports = { QueueManager }; 