const os = require('os');
const { createLogger } = require('../../utils/logger');
const { MetricsModel } = require('../../models/metrics');
const { EventEmitter } = require('events');

class SystemMetricsService extends EventEmitter {
    constructor() {
        super();
        this.logger = createLogger('SystemMetricsService');
        this.metricsBuffer = [];
        this.isCollecting = false;
        this.collectionInterval = null;
        this.bufferSize = 100; // Number of metrics to buffer before bulk writing
        this.collectionFrequency = 5000; // Collect metrics every 5 seconds
    }

    async start() {
        if (this.isCollecting) {
            this.logger.warn('Metrics collection already running');
            return;
        }

        this.isCollecting = true;
        this.collectionInterval = setInterval(() => {
            this.collectMetrics();
        }, this.collectionFrequency);

        this.logger.info('System metrics collection started');
    }

    async stop() {
        if (!this.isCollecting) {
            return;
        }

        clearInterval(this.collectionInterval);
        this.isCollecting = false;
        
        // Flush any remaining metrics
        if (this.metricsBuffer.length > 0) {
            await this.flushMetrics();
        }

        this.logger.info('System metrics collection stopped');
    }

    async collectMetrics() {
        try {
            const metrics = {
                timestamp: new Date(),
                cpu: this.getCpuMetrics(),
                memory: this.getMemoryMetrics(),
                disk: await this.getDiskMetrics(),
                network: this.getNetworkMetrics(),
                process: this.getProcessMetrics(),
                system: this.getSystemMetrics()
            };

            this.metricsBuffer.push(metrics);
            this.emit('metrics', metrics);

            if (this.metricsBuffer.length >= this.bufferSize) {
                await this.flushMetrics();
            }
        } catch (error) {
            this.logger.error('Error collecting system metrics:', error);
        }
    }

    getCpuMetrics() {
        const cpus = os.cpus();
        const loadAvg = os.loadavg();
        
        const aggregateCpuTimes = cpus.reduce((acc, cpu) => {
            Object.keys(cpu.times).forEach(type => {
                acc[type] = (acc[type] || 0) + cpu.times[type];
            });
            return acc;
        }, {});

        return {
            cores: cpus.length,
            model: cpus[0].model,
            speed: cpus[0].speed,
            load_average: {
                '1m': loadAvg[0],
                '5m': loadAvg[1],
                '15m': loadAvg[2]
            },
            times: aggregateCpuTimes
        };
    }

    getMemoryMetrics() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;

        return {
            total,
            free,
            used,
            usage_percent: (used / total) * 100,
            heap: process.memoryUsage()
        };
    }

    async getDiskMetrics() {
        // We'll implement this using a disk space checking utility
        const { checkDiskSpace } = require('check-disk-space');
        const path = process.env.MEDIA_STORAGE_PATH || '/';

        try {
            const diskSpace = await checkDiskSpace(path);
            return {
                path,
                total: diskSpace.size,
                free: diskSpace.free,
                used: diskSpace.size - diskSpace.free,
                usage_percent: ((diskSpace.size - diskSpace.free) / diskSpace.size) * 100
            };
        } catch (error) {
            this.logger.error('Error getting disk metrics:', error);
            return null;
        }
    }

    getNetworkMetrics() {
        const networkInterfaces = os.networkInterfaces();
        const metrics = {};

        Object.keys(networkInterfaces).forEach(interfaceName => {
            const interface = networkInterfaces[interfaceName];
            metrics[interfaceName] = interface.map(addr => ({
                address: addr.address,
                netmask: addr.netmask,
                family: addr.family,
                mac: addr.mac,
                internal: addr.internal
            }));
        });

        return metrics;
    }

    getProcessMetrics() {
        const usage = process.cpuUsage();
        const memory = process.memoryUsage();

        return {
            uptime: process.uptime(),
            cpu_usage: {
                user: usage.user,
                system: usage.system
            },
            memory: {
                rss: memory.rss,
                heapTotal: memory.heapTotal,
                heapUsed: memory.heapUsed,
                external: memory.external,
                arrayBuffers: memory.arrayBuffers
            },
            pid: process.pid
        };
    }

    getSystemMetrics() {
        return {
            platform: process.platform,
            arch: process.arch,
            version: process.version,
            uptime: os.uptime(),
            hostname: os.hostname(),
            type: os.type(),
            release: os.release()
        };
    }

    async flushMetrics() {
        if (this.metricsBuffer.length === 0) {
            return;
        }

        try {
            await MetricsModel.bulkCreate(
                this.metricsBuffer.map(metrics => ({
                    type: 'system',
                    data: metrics,
                    timestamp: metrics.timestamp
                }))
            );

            this.metricsBuffer = [];
            this.logger.debug(`Flushed ${this.metricsBuffer.length} metrics to database`);
        } catch (error) {
            this.logger.error('Error flushing metrics to database:', error);
        }
    }
}

module.exports = new SystemMetricsService(); 