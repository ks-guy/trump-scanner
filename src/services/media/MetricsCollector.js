import { db } from '../../config/database.js';
import os from 'os';
import Bull from 'bull';
import { promisify } from 'util';
import { exec } from 'child_process';
import { logger } from '../../utils/logger.js';

class MetricsCollector {
    constructor() {
        this.batchQueue = new Bull('batch-processing', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD
            }
        });
        this.collectInterval = null;
        this.metricsBuffer = [];
        this.BUFFER_SIZE = 100; // Number of metrics to buffer before bulk insert
    }

    async start(intervalMs = 5000) {
        if (this.collectInterval) {
            return;
        }

        this.collectInterval = setInterval(async () => {
            try {
                await this.collectMetrics();
            } catch (error) {
                logger.error('Error collecting metrics:', error);
            }
        }, intervalMs);
    }

    stop() {
        if (this.collectInterval) {
            clearInterval(this.collectInterval);
            this.collectInterval = null;
        }
    }

    async collectMetrics() {
        try {
            const timestamp = new Date();
            
            // Collect different types of metrics
            const [
                systemMetrics,
                queueMetrics,
                processingMetrics,
                diskMetrics,
                networkMetrics
            ] = await Promise.all([
                this.collectSystemMetrics(),
                this.collectQueueMetrics(),
                this.collectProcessingMetrics(),
                this.collectDiskMetrics(),
                this.collectNetworkMetrics()
            ]);

            // Combine all metrics
            const metrics = {
                timestamp,
                metric_type: 'system_health',
                ...systemMetrics,
                ...queueMetrics,
                ...processingMetrics,
                ...diskMetrics,
                ...networkMetrics
            };

            // Add to buffer
            this.metricsBuffer.push(metrics);

            // If buffer is full, flush to database
            if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
                await this.flushMetricsBuffer();
            }
        } catch (error) {
            logger.error('Error in collectMetrics:', error);
        }
    }

    async collectSystemMetrics() {
        const loadAvg = os.loadavg();
        const totalMem = os.totalmem();
        const freeMem = os.freemem();

        return {
            cpu_usage: await this.getCPUUsage(),
            memory_usage: ((totalMem - freeMem) / totalMem) * 100,
            system_load_1m: loadAvg[0],
            system_load_5m: loadAvg[1],
            system_load_15m: loadAvg[2]
        };
    }

    async collectQueueMetrics() {
        const [
            activeCount,
            waitingCount,
            completedCount,
            failedCount,
            delayedCount,
            pausedCount
        ] = await Promise.all([
            this.batchQueue.getActiveCount(),
            this.batchQueue.getWaitingCount(),
            this.batchQueue.getCompletedCount(),
            this.batchQueue.getFailedCount(),
            this.batchQueue.getDelayedCount(),
            this.batchQueue.getPausedCount()
        ]);

        const jobs = await this.batchQueue.getJobs(['active', 'waiting']);
        const queueLatency = jobs.length > 0
            ? Math.max(...jobs.map(job => Date.now() - job.timestamp))
            : 0;

        return {
            queue_name: 'batch-processing',
            active_jobs: activeCount,
            waiting_jobs: waitingCount,
            completed_jobs: completedCount,
            failed_jobs: failedCount,
            delayed_jobs: delayedCount,
            paused_jobs: pausedCount,
            queue_latency: queueLatency
        };
    }

    async collectProcessingMetrics() {
        const query = `
            SELECT 
                COUNT(*) as total_processed,
                SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                AVG(TIMESTAMPDIFF(MICROSECOND, created_at, updated_at)) / 1000 as avg_processing_time_ms,
                COUNT(*) / (TIMESTAMPDIFF(MINUTE, MIN(created_at), MAX(created_at)) + 1) as throughput
            FROM batch_jobs
            WHERE created_at >= DATE_SUB(NOW(), INTERVAL 1 HOUR)
        `;

        const [results] = await db.query(query);
        return {
            total_processed_files: results.total_processed || 0,
            successful_files: results.successful || 0,
            failed_files: results.failed || 0,
            average_processing_time_ms: results.avg_processing_time_ms || 0,
            throughput_per_minute: results.throughput || 0
        };
    }

    async collectDiskMetrics() {
        try {
            // Using df command for disk usage
            const { stdout: dfOutput } = await exec('df -k / | tail -n 1');
            const [, total, used] = dfOutput.split(/\s+/);
            
            // Using iostat for disk I/O
            const { stdout: iostatOutput } = await exec('iostat -d -k 1 1 | tail -n 2');
            const [, kbRead, kbWrite] = iostatOutput.trim().split(/\s+/);

            return {
                disk_usage: (used / total) * 100,
                disk_io_read: parseFloat(kbRead) || 0,
                disk_io_write: parseFloat(kbWrite) || 0
            };
        } catch (error) {
            logger.error('Error collecting disk metrics:', error);
            return {
                disk_usage: 0,
                disk_io_read: 0,
                disk_io_write: 0
            };
        }
    }

    async collectNetworkMetrics() {
        try {
            const { stdout } = await exec("cat /proc/net/dev | grep -v 'lo:' | awk 'NR>2{rx+=$2;tx+=$10}END{print rx,tx}'");
            const [rx, tx] = stdout.trim().split(' ').map(Number);

            return {
                network_rx_bytes: rx || 0,
                network_tx_bytes: tx || 0
            };
        } catch (error) {
            logger.error('Error collecting network metrics:', error);
            return {
                network_rx_bytes: 0,
                network_tx_bytes: 0
            };
        }
    }

    async getCPUUsage() {
        try {
            const { stdout } = await exec("top -bn1 | grep 'Cpu(s)' | awk '{print $2}'");
            return parseFloat(stdout) || 0;
        } catch (error) {
            logger.error('Error getting CPU usage:', error);
            return 0;
        }
    }

    async flushMetricsBuffer() {
        if (this.metricsBuffer.length === 0) {
            return;
        }

        try {
            const values = this.metricsBuffer.map(metric => {
                return Object.entries(metric)
                    .filter(([_, value]) => value !== undefined)
                    .reduce((obj, [key, value]) => {
                        obj[key] = value;
                        return obj;
                    }, {});
            });

            const keys = [...new Set(values.flatMap(obj => Object.keys(obj)))];
            const query = `
                INSERT INTO batch_metrics 
                (${keys.join(', ')}) 
                VALUES 
                ${values.map(obj => `(${keys.map(key => obj[key] === undefined ? 'NULL' : '?').join(', ')})`).join(', ')}
            `;

            const flatValues = values.flatMap(obj => keys.map(key => obj[key] === undefined ? null : obj[key]));
            await db.query(query, flatValues);

            // Clear the buffer after successful insert
            this.metricsBuffer = [];
        } catch (error) {
            logger.error('Error flushing metrics buffer:', error);
        }
    }

    // Additional methods for specific metric collection
    async collectFileTypeMetrics(fileType, size, compressionRatio) {
        const metrics = {
            metric_type: 'file_type',
            file_type: fileType,
            file_size_bytes: size,
            compression_ratio: compressionRatio
        };
        this.metricsBuffer.push(metrics);
    }

    async collectErrorMetrics(errorType, details, batchId) {
        const metrics = {
            metric_type: 'error',
            error_type: errorType,
            error_details: JSON.stringify(details),
            batch_id: batchId,
            error_count: 1
        };
        this.metricsBuffer.push(metrics);
    }

    async collectBatchMetrics(batchId, totalFiles, priority, status, options) {
        const metrics = {
            metric_type: 'batch',
            batch_id: batchId,
            total_files_in_batch: totalFiles,
            batch_priority: priority,
            batch_status: status,
            processing_options: JSON.stringify(options)
        };
        this.metricsBuffer.push(metrics);
    }

    async collectCacheMetrics(hits, misses, usageBytes) {
        const metrics = {
            metric_type: 'cache',
            cache_hits: hits,
            cache_misses: misses,
            cache_usage_bytes: usageBytes
        };
        this.metricsBuffer.push(metrics);
    }
}

export const metricsCollector = new MetricsCollector(); 