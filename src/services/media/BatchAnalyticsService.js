const { db } = require('../../config/database');
const Bull = require('bull');
const os = require('os');
const { logger } = require('../../utils/logger');

class BatchAnalyticsService {
    constructor() {
        this.batchQueue = new Bull('batch-processing', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD
            }
        });
    }

    async getAnalytics(timeRange) {
        try {
            const endDate = new Date();
            const startDate = this.getStartDate(timeRange);

            const [
                throughput,
                statusDistribution,
                processingTimes,
                queueMetrics,
                resourceUtilization
            ] = await Promise.all([
                this.getProcessingThroughput(startDate, endDate),
                this.getStatusDistribution(startDate, endDate),
                this.getAverageProcessingTimes(startDate, endDate),
                this.getQueueMetrics(),
                this.getResourceUtilization()
            ]);

            return {
                throughput,
                statusDistribution,
                processingTimes,
                queueMetrics,
                resourceUtilization
            };
        } catch (error) {
            logger.error('Error getting batch analytics:', error);
            throw new Error('Failed to get batch analytics');
        }
    }

    getStartDate(timeRange) {
        const now = new Date();
        switch (timeRange) {
            case '1h':
                return new Date(now.getTime() - 60 * 60 * 1000);
            case '24h':
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
            case '7d':
                return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            case '30d':
                return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
            default:
                return new Date(now.getTime() - 24 * 60 * 60 * 1000);
        }
    }

    async getProcessingThroughput(startDate, endDate) {
        const query = `
            SELECT 
                DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00') as timestamp,
                COUNT(*) / 60 as filesPerMinute
            FROM batch_jobs
            WHERE created_at BETWEEN ? AND ?
            GROUP BY DATE_FORMAT(created_at, '%Y-%m-%d %H:00:00')
            ORDER BY timestamp ASC
        `;

        const results = await db.query(query, [startDate, endDate]);
        return results;
    }

    async getStatusDistribution(startDate, endDate) {
        const query = `
            SELECT 
                status as name,
                COUNT(*) as value
            FROM batch_jobs
            WHERE created_at BETWEEN ? AND ?
            GROUP BY status
        `;

        const results = await db.query(query, [startDate, endDate]);
        return results;
    }

    async getAverageProcessingTimes(startDate, endDate) {
        const query = `
            SELECT 
                JSON_EXTRACT(options, '$.outputFormat') as fileType,
                AVG(TIMESTAMPDIFF(SECOND, created_at, updated_at)) as averageTime
            FROM batch_jobs
            WHERE 
                created_at BETWEEN ? AND ?
                AND status = 'completed'
            GROUP BY JSON_EXTRACT(options, '$.outputFormat')
        `;

        const results = await db.query(query, [startDate, endDate]);
        return results.map(row => ({
            ...row,
            fileType: row.fileType || 'original',
            averageTime: Math.round(row.averageTime)
        }));
    }

    async getQueueMetrics() {
        const [
            activeCount,
            waitingCount,
            completedCount,
            failedCount
        ] = await Promise.all([
            this.batchQueue.getActiveCount(),
            this.batchQueue.getWaitingCount(),
            this.batchQueue.getCompletedCount(),
            this.batchQueue.getFailedCount()
        ]);

        const jobs = await this.batchQueue.getJobs(['active', 'waiting']);
        const waitTimes = jobs.map(job => job.timestamp ? Date.now() - job.timestamp : 0);
        const averageWaitTime = waitTimes.length > 0
            ? Math.round(waitTimes.reduce((a, b) => a + b, 0) / waitTimes.length / 1000)
            : 0;

        return {
            activeJobs: activeCount,
            waitingJobs: waitingCount,
            completedJobs24h: completedCount,
            failedJobs24h: failedCount,
            averageWaitTime
        };
    }

    async getResourceUtilization() {
        const intervals = 12; // Last 12 data points
        const data = [];

        for (let i = 0; i < intervals; i++) {
            const timestamp = new Date(Date.now() - (intervals - 1 - i) * 5 * 60 * 1000);
            data.push({
                timestamp: timestamp.toISOString(),
                cpu: Math.round(os.loadavg()[0] * 100) / 100,
                memory: Math.round((1 - os.freemem() / os.totalmem()) * 100),
                diskIO: Math.round(Math.random() * 100) // Simulated disk I/O for demo
            });
        }

        return data;
    }
}

module.exports = new BatchAnalyticsService(); 