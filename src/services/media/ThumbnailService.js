import ffmpeg from 'fluent-ffmpeg';
import sharp from 'sharp';
import path from 'path';
import { promises as fs } from 'fs';
import os from 'os';
import { logger } from '../../utils/logger.js';
import { getVideoMetadata } from './mediaUtils.js';
import { Worker } from 'worker_threads';
import Queue from 'bull';
import { diskManager } from '../../utils/diskManager.js';

class ThumbnailService {
    constructor() {
        this.logger = logger;
        this.maxWorkers = Math.max(1, os.cpus().length - 1); // Leave one CPU for system
        this.activeWorkers = 0;
        this.processingQueue = new Queue('thumbnail-processing', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379
            },
            defaultJobOptions: {
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 2000
                },
                removeOnComplete: true,
                removeOnFail: true
            }
        });

        this.setupQueueHandlers();
        
        // Start disk space monitoring
        diskManager.startMonitoring();
    }

    setupQueueHandlers() {
        this.processingQueue.on('failed', (job, err) => {
            this.logger.error(`Job ${job.id} failed:`, err);
        });

        this.processingQueue.on('completed', (job) => {
            this.logger.info(`Job ${job.id} completed successfully`);
        });

        // Process jobs in parallel up to maxWorkers
        this.processingQueue.process(this.maxWorkers, async (job) => {
            const { inputPath, timestamp, outputPath, options } = job.data;
            
            try {
                // Check disk space before processing
                const stats = await diskManager.getDiskStats(path.dirname(outputPath));
                if (stats.usagePercent > 90) {
                    // Trigger cleanup if disk usage is high
                    await diskManager.cleanup(process.env.MEDIA_STORAGE_PATH);
                }

                // Ensure we have enough space for the thumbnail
                const inputStats = await fs.stat(inputPath);
                const estimatedSize = inputStats.size * 0.1; // Estimate thumbnail size as 10% of video size
                if (stats.free < estimatedSize) {
                    throw new Error('Insufficient disk space for thumbnail generation');
                }

                await this.extractFrame(inputPath, timestamp, outputPath);
                if (options?.processing) {
                    await this.processThumbnail(outputPath, options.processing);
                }
                return outputPath;
            } catch (error) {
                this.logger.error(`Error processing thumbnail job ${job.id}:`, error);
                throw error;
            }
        });
    }

    /**
     * Generate thumbnails for a video file with advanced options
     * @param {string} inputPath - Path to the input video file
     * @param {Object} options - Thumbnail generation options
     * @param {string} outputDir - Directory to save thumbnails
     * @returns {Promise<Array<string>>} - Array of generated thumbnail paths
     */
    async generateThumbnails(inputPath, options = {}, outputDir) {
        try {
            // Check disk space before starting
            const stats = await diskManager.getDiskStats(outputDir);
            if (stats.usagePercent > 95) {
                await diskManager.emergencyCleanup(process.env.MEDIA_STORAGE_PATH);
            }

            const metadata = await getVideoMetadata(inputPath);
            const timestamps = this.calculateTimestamps(metadata.duration, options);
            const thumbnailJobs = [];

            // Create output directory if it doesn't exist
            await fs.mkdir(outputDir, { recursive: true });

            // Estimate total space needed
            const inputStats = await fs.stat(inputPath);
            const estimatedSizePerThumbnail = inputStats.size * 0.1;
            const totalEstimatedSize = estimatedSizePerThumbnail * timestamps.length;

            // Check if we have enough space
            if (stats.free < totalEstimatedSize) {
                this.logger.warn('Low disk space detected, attempting cleanup');
                await diskManager.cleanup(process.env.MEDIA_STORAGE_PATH);
                
                // Check again after cleanup
                const newStats = await diskManager.getDiskStats(outputDir);
                if (newStats.free < totalEstimatedSize) {
                    throw new Error('Insufficient disk space for thumbnail generation');
                }
            }

            // Add jobs to queue
            for (const [index, timestamp] of timestamps.entries()) {
                const outputPath = path.join(
                    outputDir,
                    `thumbnail_${index}_${Date.now()}.jpg`
                );

                const job = await this.processingQueue.add({
                    inputPath,
                    timestamp,
                    outputPath,
                    options
                }, {
                    priority: options.priority || 0,
                    jobId: `${path.basename(inputPath)}_${index}`
                });

                thumbnailJobs.push(job);
            }

            // Wait for all jobs to complete
            const results = await Promise.all(
                thumbnailJobs.map(job => job.finished())
            );

            // Monitor system resources
            this.monitorResources();

            return results;
        } catch (error) {
            this.logger.error('Error generating thumbnails:', error);
            throw new Error('Failed to generate thumbnails');
        }
    }

    /**
     * Monitor system resources and adjust processing accordingly
     */
    async monitorResources() {
        const cpuUsage = os.loadavg()[0] / os.cpus().length;
        const totalMem = os.totalmem();
        const freeMem = os.freemem();
        const memUsage = (totalMem - freeMem) / totalMem;

        this.logger.info(`System metrics - CPU: ${(cpuUsage * 100).toFixed(2)}%, Memory: ${(memUsage * 100).toFixed(2)}%`);

        // Adjust concurrent processing based on resource usage
        if (cpuUsage > 0.8 || memUsage > 0.8) {
            await this.processingQueue.pause();
            this.logger.warn('High resource usage detected, pausing queue');
            
            // Resume after resource usage decreases
            setTimeout(async () => {
                if (os.loadavg()[0] / os.cpus().length < 0.7) {
                    await this.processingQueue.resume();
                    this.logger.info('Resource usage normalized, resuming queue');
                }
            }, 5000);
        }
    }

    /**
     * Calculate thumbnail extraction timestamps
     * @param {number} duration - Video duration in seconds
     * @param {Object} options - Timestamp calculation options
     * @returns {Array<number>} - Array of timestamps in seconds
     */
    calculateTimestamps(duration, options = {}) {
        const {
            count = 3,
            interval,
            strategy = 'uniform',
            customTimestamps
        } = options;

        if (customTimestamps && Array.isArray(customTimestamps)) {
            return customTimestamps.filter(t => t >= 0 && t <= duration);
        }

        if (strategy === 'uniform') {
            const timestamps = [];
            const step = interval || (duration / (count + 1));
            
            for (let i = 1; i <= count; i++) {
                timestamps.push(Math.min(step * i, duration));
            }
            
            return timestamps;
        }

        if (strategy === 'weighted') {
            // Focus on the first third of the video
            return [
                duration * 0.1,
                duration * 0.25,
                duration * 0.5
            ].filter(t => t <= duration);
        }

        if (strategy === 'dynamic') {
            // Analyze video content for scene changes (placeholder)
            return this.detectSceneChanges(duration);
        }

        return [duration / 2]; // Default to middle frame
    }

    /**
     * Extract a frame from the video
     * @param {string} inputPath - Path to input video
     * @param {number} timestamp - Timestamp to extract
     * @param {string} outputPath - Path to save the frame
     */
    async extractFrame(inputPath, timestamp, outputPath) {
        return new Promise((resolve, reject) => {
            ffmpeg(inputPath)
                .screenshots({
                    timestamps: [timestamp],
                    filename: path.basename(outputPath),
                    folder: path.dirname(outputPath),
                    size: '1280x720'
                })
                .on('end', () => resolve(outputPath))
                .on('error', (err) => reject(err));
        });
    }

    /**
     * Process a thumbnail with various enhancements
     * @param {string} imagePath - Path to the thumbnail
     * @param {Object} options - Processing options
     */
    async processThumbnail(imagePath, options = {}) {
        const {
            resize,
            quality = 80,
            format = 'jpeg',
            effects = []
        } = options;

        let image = sharp(imagePath);

        // Apply resize if specified
        if (resize) {
            const { width, height, fit = 'cover' } = resize;
            image = image.resize(width, height, { fit });
        }

        // Apply effects
        for (const effect of effects) {
            switch (effect.type) {
                case 'blur':
                    image = image.blur(effect.sigma || 1);
                    break;
                case 'sharpen':
                    image = image.sharpen(effect.sigma || 1);
                    break;
                case 'brightness':
                    image = image.modulate({ brightness: effect.value });
                    break;
                case 'contrast':
                    image = image.modulate({ contrast: effect.value });
                    break;
                case 'grayscale':
                    image = image.grayscale();
                    break;
                case 'watermark':
                    await this.applyWatermark(image, effect.options);
                    break;
            }
        }

        // Save processed image
        await image
            .jpeg({ quality })
            .toFile(imagePath + '.processed');

        // Replace original with processed
        await fs.unlink(imagePath);
        await fs.rename(imagePath + '.processed', imagePath);
    }

    /**
     * Apply watermark to thumbnail
     * @param {Sharp} image - Sharp image instance
     * @param {Object} options - Watermark options
     */
    async applyWatermark(image, options = {}) {
        const {
            text,
            font = 'Arial',
            fontSize = 24,
            color = 'white',
            opacity = 0.7,
            position = 'bottomRight',
            padding = 20
        } = options;

        if (!text) return image;

        const svgBuffer = Buffer.from(`
            <svg width="100%" height="100%">
                <style>
                    .text { font: ${fontSize}px ${font}; fill: ${color}; opacity: ${opacity}; }
                </style>
                <text
                    x="${position.includes('Right') ? '95%' : '5%'}"
                    y="${position.includes('Bottom') ? '95%' : '5%'}"
                    text-anchor="${position.includes('Right') ? 'end' : 'start'}"
                    class="text"
                >
                    ${text}
                </text>
            </svg>
        `);

        return image.composite([
            {
                input: svgBuffer,
                top: 0,
                left: 0
            }
        ]);
    }

    /**
     * Detect scene changes in video (placeholder)
     * @param {number} duration - Video duration
     * @returns {Array<number>} - Array of timestamps
     */
    detectSceneChanges(duration) {
        // Placeholder for scene detection logic
        // In a real implementation, this would analyze video content
        return [
            duration * 0.25,
            duration * 0.5,
            duration * 0.75
        ];
    }

    /**
     * Cleanup resources and shutdown service
     */
    async cleanup() {
        try {
            // Stop disk monitoring
            diskManager.stopMonitoring();
            
            // Close the processing queue
            await this.processingQueue.close();
            
            this.logger.info('ThumbnailService cleaned up successfully');
        } catch (error) {
            this.logger.error('Error cleaning up ThumbnailService:', error);
        }
    }
}

export const thumbnailService = new ThumbnailService(); 