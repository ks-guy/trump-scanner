const os = require('os');
const { promisify } = require('util');
const { MediaContent } = require('../../models/media');
const { logger } = require('../../utils/logger');
const Redis = require('ioredis');

class MonitoringService {
    constructor() {
        this.redis = new Redis(process.env.REDIS_URL);
        this.metricsPrefix = 'monitoring:metrics:';
        this.healthCheckInterval = 60000; // 1 minute
        this.metricsRetention = 7 * 24 * 60 * 60; // 7 days
        this.startMonitoring();
    }

    async startMonitoring() {
        setInterval(() => this.collectMetrics(), this.healthCheckInterval);
        logger.info('Monitoring service started');
    }

    async collectMetrics() {
        try {
            const timestamp = Date.now();
            const metrics = {
                timestamp,
                system: await this.getSystemMetrics(),
                application: await this.getApplicationMetrics(),
                database: await this.getDatabaseMetrics(),
                storage: await this.getStorageMetrics()
            };

            // Store metrics in Redis
            await this.storeMetrics(metrics);

            // Log if any metrics exceed thresholds
            await this.checkThresholds(metrics);

            return metrics;
        } catch (error) {
            logger.error('Error collecting metrics:', error);
            throw error;
        }
    }

    async getSystemMetrics() {
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const usedMem = totalMem - freeMem;

        return {
            cpu: {
                load: os.loadavg(),
                cores: os.cpus().length,
                usage: await this.getCPUUsage()
            },
            memory: {
                total: totalMem,
                free: freeMem,
                used: usedMem,
                usagePercent: (usedMem / totalMem) * 100
            },
            disk: await this.getDiskUsage(),
            uptime: os.uptime()
        };
    }

    async getApplicationMetrics() {
        const [totalMedia, processingMedia, failedMedia] = await Promise.all([
            MediaContent.count(),
            MediaContent.count({ where: { download_status: 'in_progress' } }),
            MediaContent.count({ where: { download_status: 'failed' } })
        ]);

        return {
            media: {
                total: totalMedia,
                processing: processingMedia,
                failed: failedMedia,
                successRate: totalMedia ? ((totalMedia - failedMedia) / totalMedia) * 100 : 0
            },
            api: {
                requests: await this.getApiMetrics(),
                errors: await this.getErrorMetrics()
            }
        };
    }

    async getDatabaseMetrics() {
        const db = require('../../database/connection');
        const [result] = await db.query('SHOW STATUS WHERE Variable_name IN ("Threads_connected", "Threads_running", "Queries", "Slow_queries")');
        
        return {
            connections: result.find(r => r.Variable_name === 'Threads_connected').Value,
            activeQueries: result.find(r => r.Variable_name === 'Threads_running').Value,
            totalQueries: result.find(r => r.Variable_name === 'Queries').Value,
            slowQueries: result.find(r => r.Variable_name === 'Slow_queries').Value
        };
    }

    async getStorageMetrics() {
        const fs = require('fs').promises;
        const path = require('path');
        const mediaDir = process.env.MEDIA_STORAGE_PATH;

        try {
            const stats = await fs.stat(mediaDir);
            const files = await fs.readdir(mediaDir);
            const fileStats = await Promise.all(
                files.map(file => fs.stat(path.join(mediaDir, file)))
            );

            const totalSize = fileStats.reduce((sum, stat) => sum + stat.size, 0);

            return {
                total: stats.size,
                used: totalSize,
                free: stats.size - totalSize,
                usagePercent: (totalSize / stats.size) * 100,
                files: files.length
            };
        } catch (error) {
            logger.error('Error getting storage metrics:', error);
            return null;
        }
    }

    async storeMetrics(metrics) {
        const timestamp = metrics.timestamp;
        const key = `${this.metricsPrefix}${timestamp}`;
        
        await this.redis.setex(
            key,
            this.metricsRetention,
            JSON.stringify(metrics)
        );

        // Store in time series
        await this.redis.zadd(
            `${this.metricsPrefix}timestamps`,
            timestamp,
            key
        );
    }

    async getMetricsHistory(startTime, endTime) {
        const keys = await this.redis.zrangebyscore(
            `${this.metricsPrefix}timestamps`,
            startTime,
            endTime
        );

        const metrics = await Promise.all(
            keys.map(key => this.redis.get(key))
        );

        return metrics.map(m => JSON.parse(m));
    }

    async checkThresholds(metrics) {
        const thresholds = {
            cpu: 80, // 80% CPU usage
            memory: 85, // 85% memory usage
            disk: 90, // 90% disk usage
            errorRate: 5 // 5% error rate
        };

        if (metrics.system.cpu.usage > thresholds.cpu) {
            logger.warn(`High CPU usage detected: ${metrics.system.cpu.usage}%`);
        }

        if (metrics.system.memory.usagePercent > thresholds.memory) {
            logger.warn(`High memory usage detected: ${metrics.system.memory.usagePercent}%`);
        }

        if (metrics.storage && metrics.storage.usagePercent > thresholds.disk) {
            logger.warn(`High disk usage detected: ${metrics.storage.usagePercent}%`);
        }

        if (metrics.application.media.successRate < (100 - thresholds.errorRate)) {
            logger.warn(`High error rate detected: ${100 - metrics.application.media.successRate}%`);
        }
    }

    async getHealthStatus() {
        try {
            const metrics = await this.collectMetrics();
            const status = {
                status: 'healthy',
                timestamp: Date.now(),
                checks: {
                    system: this.checkSystemHealth(metrics.system),
                    application: this.checkApplicationHealth(metrics.application),
                    database: this.checkDatabaseHealth(metrics.database),
                    storage: this.checkStorageHealth(metrics.storage)
                }
            };

            // Overall status is unhealthy if any check fails
            status.status = Object.values(status.checks).every(check => check.status === 'healthy')
                ? 'healthy'
                : 'unhealthy';

            return status;
        } catch (error) {
            logger.error('Error getting health status:', error);
            return {
                status: 'unhealthy',
                timestamp: Date.now(),
                error: error.message
            };
        }
    }

    checkSystemHealth(metrics) {
        return {
            status: metrics.cpu.usage < 90 && metrics.memory.usagePercent < 90 ? 'healthy' : 'warning',
            details: {
                cpu: metrics.cpu.usage,
                memory: metrics.memory.usagePercent
            }
        };
    }

    checkApplicationHealth(metrics) {
        return {
            status: metrics.media.successRate > 95 ? 'healthy' : 'warning',
            details: {
                successRate: metrics.media.successRate,
                failedCount: metrics.media.failed
            }
        };
    }

    checkDatabaseHealth(metrics) {
        return {
            status: metrics.connections < 100 && metrics.slowQueries < 10 ? 'healthy' : 'warning',
            details: {
                connections: metrics.connections,
                slowQueries: metrics.slowQueries
            }
        };
    }

    checkStorageHealth(metrics) {
        if (!metrics) return { status: 'error', details: { error: 'Storage metrics unavailable' } };
        
        return {
            status: metrics.usagePercent < 90 ? 'healthy' : 'warning',
            details: {
                usagePercent: metrics.usagePercent,
                freeSpace: metrics.free
            }
        };
    }
}

module.exports = new MonitoringService(); 