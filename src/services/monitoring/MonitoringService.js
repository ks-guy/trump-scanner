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
        this.performanceMetrics = new Map();
        this.errorCounts = new Map();
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
        const cpus = os.cpus();
        
        // Calculate detailed CPU metrics
        const cpuMetrics = {
            cores: cpus.length,
            speed: cpus[0].speed,
            usage: await this.getCPUUsage(),
            perCore: cpus.map(cpu => {
                const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
                return {
                    user: (cpu.times.user / total) * 100,
                    sys: (cpu.times.sys / total) * 100,
                    idle: (cpu.times.idle / total) * 100
                };
            })
        };

        // Get network interfaces
        const networkInterfaces = os.networkInterfaces();
        const networkMetrics = Object.entries(networkInterfaces).reduce((acc, [name, interfaces]) => {
            acc[name] = interfaces.map(iface => ({
                address: iface.address,
                netmask: iface.netmask,
                family: iface.family,
                mac: iface.mac,
                internal: iface.internal
            }));
            return acc;
        }, {});

        return {
            cpu: cpuMetrics,
            memory: {
                total: totalMem,
                free: freeMem,
                used: usedMem,
                usagePercent: (usedMem / totalMem) * 100,
                swapTotal: os.totalmem(),
                swapFree: os.freemem()
            },
            disk: await this.getDiskUsage(),
            network: networkMetrics,
            uptime: os.uptime(),
            loadAvg: os.loadavg()
        };
    }

    async getApplicationMetrics() {
        const [totalMedia, processingMedia, failedMedia] = await Promise.all([
            MediaContent.count(),
            MediaContent.count({ where: { download_status: 'in_progress' } }),
            MediaContent.count({ where: { download_status: 'failed' } })
        ]);

        // Get performance metrics
        const performanceStats = {};
        for (const [operation, metrics] of this.performanceMetrics.entries()) {
            performanceStats[operation] = {
                count: metrics.count,
                avgDuration: metrics.totalDuration / metrics.count,
                minDuration: metrics.min,
                maxDuration: metrics.max,
                recentOperations: metrics.recent
            };
        }

        // Get error statistics
        const errorStats = {};
        for (const [errorType, count] of this.errorCounts.entries()) {
            errorStats[errorType] = count;
        }

        return {
            media: {
                total: totalMedia,
                processing: processingMedia,
                failed: failedMedia,
                successRate: totalMedia ? ((totalMedia - failedMedia) / totalMedia) * 100 : 0
            },
            performance: performanceStats,
            errors: errorStats,
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
            errorRate: 5, // 5% error rate
            responseTime: 1000, // 1 second
            failedRequests: 10 // 10 failed requests per minute
        };

        const alerts = [];

        if (metrics.system.cpu.usage > thresholds.cpu) {
            alerts.push({
                type: 'cpu',
                severity: 'warning',
                message: `High CPU usage detected: ${metrics.system.cpu.usage}%`
            });
        }

        if (metrics.system.memory.usagePercent > thresholds.memory) {
            alerts.push({
                type: 'memory',
                severity: 'warning',
                message: `High memory usage detected: ${metrics.system.memory.usagePercent}%`
            });
        }

        if (metrics.storage && metrics.storage.usagePercent > thresholds.disk) {
            alerts.push({
                type: 'storage',
                severity: 'warning',
                message: `High disk usage detected: ${metrics.storage.usagePercent}%`
            });
        }

        // Check performance thresholds
        for (const [operation, stats] of Object.entries(metrics.application.performance)) {
            if (stats.avgDuration > thresholds.responseTime) {
                alerts.push({
                    type: 'performance',
                    severity: 'warning',
                    message: `Slow operation detected: ${operation} (avg: ${stats.avgDuration}ms)`
                });
            }
        }

        // Store alerts in Redis for historical tracking
        if (alerts.length > 0) {
            const alertKey = `${this.metricsPrefix}alerts:${Date.now()}`;
            await this.redis.setex(alertKey, this.metricsRetention, JSON.stringify(alerts));
            alerts.forEach(alert => logger.warn(alert.message));
        }

        return alerts;
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

    // Track performance of a specific operation
    async trackPerformance(operation, duration, metadata = {}) {
        const metrics = this.performanceMetrics.get(operation) || {
            count: 0,
            totalDuration: 0,
            min: Infinity,
            max: 0,
            recent: []
        };

        metrics.count++;
        metrics.totalDuration += duration;
        metrics.min = Math.min(metrics.min, duration);
        metrics.max = Math.max(metrics.max, duration);
        metrics.recent = [...metrics.recent.slice(-9), { duration, timestamp: Date.now(), metadata }];

        this.performanceMetrics.set(operation, metrics);
    }

    // Track errors by type
    trackError(errorType, error) {
        const count = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, count + 1);
        logger.error(`[${errorType}] ${error.message}`, { error });
    }
}

module.exports = new MonitoringService(); 