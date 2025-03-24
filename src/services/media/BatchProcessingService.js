import { v4 as uuidv4 } from 'uuid';
import Bull from 'bull';
import path from 'path';
import { promises as fs } from 'fs';
import { logger } from '../../utils/logger.js';
import { MediaService } from './MediaService.js';
import { db } from '../../config/database.js';
import { metricsCollector } from './MetricsCollector.js';
import { videoCompressionService } from './VideoCompressionService.js';
import { getVideoMetadata, generateCompressionSettings } from './mediaUtils.js';
import { thumbnailService } from './ThumbnailService.js';
import { diskManager } from '../../utils/diskManager.js';

class BatchProcessingService {
    constructor() {
        this.mediaService = new MediaService();
        this.batchQueue = new Bull('batch-processing', {
            redis: {
                host: process.env.REDIS_HOST || 'localhost',
                port: process.env.REDIS_PORT || 6379,
                password: process.env.REDIS_PASSWORD
            }
        });

        // Start metrics collector and disk monitoring
        metricsCollector.start();
        diskManager.startMonitoring();

        this.setupQueueHandlers();
    }

    async processFile(file, options) {
        const startTime = Date.now();
        const inputPath = file.path;
        const fileExt = path.extname(file.originalname);
        const outputFormat = options.outputFormat || fileExt.slice(1);
        const outputPath = path.join(
            path.dirname(inputPath),
            `${path.basename(inputPath, fileExt)}_compressed.${outputFormat}`
        );

        try {
            // Check disk space before processing
            const stats = await diskManager.getDiskStats(path.dirname(outputPath));
            if (stats.usagePercent > 90) {
                await diskManager.cleanup(process.env.MEDIA_STORAGE_PATH);
            }

            // Get video metadata and estimate output size
            const metadata = await getVideoMetadata(inputPath);
            const inputSize = (await fs.stat(inputPath)).size;
            const estimatedOutputSize = this.estimateOutputSize(inputSize, options);

            // Ensure we have enough space
            if (stats.free < estimatedOutputSize) {
                this.logger.warn('Low disk space detected, attempting cleanup');
                await diskManager.cleanup(process.env.MEDIA_STORAGE_PATH);
                
                const newStats = await diskManager.getDiskStats(path.dirname(outputPath));
                if (newStats.free < estimatedOutputSize) {
                    throw new Error('Insufficient disk space for video processing');
                }
            }

            // Generate compression settings based on options
            const compressionSettings = {
                ...generateCompressionSettings(metadata, {
                    quality: options.quality || 'medium',
                    size: options.targetSize
                }),
                ...options,
                outputFormat
            };

            // Compress video
            const result = await videoCompressionService.compressVideo(
                inputPath,
                outputPath,
                compressionSettings
            );

            // Generate thumbnails in parallel with compression if requested
            let thumbnailResults = [];
            if (options.generateThumbnails) {
                const thumbnailDir = path.join(
                    process.env.MEDIA_STORAGE_PATH,
                    'thumbnails',
                    path.basename(inputPath, fileExt)
                );

                // Check disk space for thumbnails
                const thumbnailStats = await diskManager.getDiskStats(thumbnailDir);
                const estimatedThumbnailSize = inputSize * 0.1 * (options.thumbnailCount || 3);
                
                if (thumbnailStats.free < estimatedThumbnailSize) {
                    this.logger.warn('Low disk space for thumbnails, cleaning up');
                    await diskManager.cleanupThumbnails(path.join(process.env.MEDIA_STORAGE_PATH, 'thumbnails'));
                }

                thumbnailResults = await thumbnailService.generateThumbnails(
                    outputPath,
                    {
                        count: options.thumbnailCount || 3,
                        strategy: options.thumbnailStrategy || 'uniform',
                        processing: {
                            resize: options.thumbnailSize || { width: 320, height: 180 },
                            quality: options.thumbnailQuality || 80,
                            effects: options.thumbnailEffects || []
                        },
                        priority: options.priority
                    },
                    thumbnailDir
                );
            }

            // Calculate processing metrics
            const processingTime = Date.now() - startTime;
            await metricsCollector.collectFileTypeMetrics(
                outputFormat,
                result.metadata.size,
                result.compressionRatio
            );

            if (thumbnailResults.length > 0) {
                await metricsCollector.collectThumbnailMetrics({
                    videoId: path.basename(inputPath, fileExt),
                    count: thumbnailResults.length,
                    processingTime: Date.now() - startTime,
                    totalSize: await this.calculateTotalSize(thumbnailResults)
                });
            }

            // Clean up temporary files
            await this.cleanupTempFiles(inputPath);

            return {
                success: true,
                inputPath,
                outputPath,
                processingTime,
                compressionRatio: result.compressionRatio,
                metadata: result.metadata,
                thumbnails: thumbnailResults
            };
        } catch (error) {
            logger.error('Error processing file:', error);
            throw error;
        }
    }

    estimateOutputSize(inputSize, options) {
        // Estimate output size based on compression options
        const qualityFactors = {
            'low': 0.4,
            'medium': 0.6,
            'high': 0.8,
            'ultra': 0.9
        };

        const quality = options.quality || 'medium';
        const estimatedRatio = qualityFactors[quality] || 0.6;
        
        // Add buffer for safety
        return Math.ceil(inputSize * estimatedRatio * 1.2);
    }

    async cleanupTempFiles(inputPath) {
        try {
            const tempDir = path.dirname(inputPath);
            const tempFiles = await fs.readdir(tempDir);
            const baseFileName = path.basename(inputPath, path.extname(inputPath));

            for (const file of tempFiles) {
                if (file.startsWith(baseFileName) && file.includes('temp')) {
                    await fs.unlink(path.join(tempDir, file));
                }
            }
        } catch (error) {
            logger.warn('Error cleaning up temp files:', error);
        }
    }

    async calculateTotalSize(filePaths) {
        try {
            const sizes = await Promise.all(
                filePaths.map(async (filePath) => {
                    const stats = await fs.stat(filePath);
                    return stats.size;
                })
            );
            return sizes.reduce((total, size) => total + size, 0);
        } catch (error) {
            logger.error('Error calculating total size:', error);
            return 0;
        }
    }

    async createBatch(files, options = {}) {
        const batchId = uuidv4();
        const timestamp = new Date();

        try {
            // Validate compression options
            const supportedOptions = videoCompressionService.getSupportedOptions();
            if (options.codec && !supportedOptions.codecs[options.codec]) {
                throw new Error(`Unsupported codec: ${options.codec}`);
            }
            if (options.outputFormat && !supportedOptions.formats[options.outputFormat]) {
                throw new Error(`Unsupported output format: ${options.outputFormat}`);
            }

            // Create batch record
            await db.query(
                'INSERT INTO batch_jobs (id, status, total_files, options, created_at) VALUES (?, ?, ?, ?, ?)',
                [batchId, 'pending', files.length, JSON.stringify(options), timestamp]
            );

            // Add job to queue
            const job = await this.batchQueue.add({
                batchId,
                files,
                options
            }, {
                priority: options.priority || 0,
                attempts: options.retries || 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            });

            // Collect initial batch metrics
            await metricsCollector.collectBatchMetrics(
                batchId,
                files.length,
                options.priority || 0,
                'pending',
                options
            );

            return {
                batchId,
                jobId: job.id,
                status: 'pending',
                totalFiles: files.length
            };
        } catch (error) {
            logger.error('Error creating batch:', error);
            await metricsCollector.collectErrorMetrics(
                'batch_creation_failure',
                { error: error.message },
                batchId
            );
            throw new Error('Failed to create batch');
        }
    }

    async processBatch(job) {
        const { batchId, files, options } = job.data;
        const startTime = Date.now();
        const results = [];

        try {
            let processedFiles = 0;
            let successfulFiles = 0;
            let failedFiles = 0;
            let totalInputSize = 0;
            let totalOutputSize = 0;

            for (const file of files) {
                try {
                    const fileStartTime = Date.now();
                    const result = await this.processFile(file, options);

                    totalInputSize += (await fs.stat(file.path)).size;
                    totalOutputSize += (await fs.stat(result.outputPath)).size;

                    results.push({
                        fileName: file.originalname,
                        success: true,
                        processingTime: Date.now() - fileStartTime,
                        ...result
                    });

                    successfulFiles++;
                } catch (error) {
                    failedFiles++;
                    results.push({
                        fileName: file.originalname,
                        success: false,
                        error: error.message
                    });

                    await metricsCollector.collectErrorMetrics(
                        'file_processing_failure',
                        { error: error.message, fileId: file.id },
                        batchId
                    );
                }

                processedFiles++;
                const progress = (processedFiles / files.length) * 100;
                await job.progress(progress);
            }

            // Collect final processing metrics
            const totalTime = Date.now() - startTime;
            const overallCompressionRatio = totalInputSize / totalOutputSize;

            await metricsCollector.collectBatchMetrics(
                batchId,
                {
                    totalFiles: files.length,
                    successfulFiles,
                    failedFiles,
                    processingTimeMs: totalTime,
                    averageTimePerFile: totalTime / files.length,
                    compressionRatio: overallCompressionRatio,
                    inputSize: totalInputSize,
                    outputSize: totalOutputSize
                }
            );

            return {
                batchId,
                processedFiles,
                successfulFiles,
                failedFiles,
                totalTime,
                compressionRatio: overallCompressionRatio,
                results
            };
        } catch (error) {
            logger.error('Error processing batch:', error);
            await metricsCollector.collectErrorMetrics(
                'batch_processing_failure',
                { error: error.message },
                batchId
            );
            throw error;
        }
    }

    setupQueueHandlers() {
        this.batchQueue.on('completed', async (job, result) => {
            const { batchId } = job.data;
            await this.updateBatchStatus(batchId, 'completed');
            await metricsCollector.collectBatchMetrics(
                batchId,
                job.data.files.length,
                job.data.options.priority || 0,
                'completed',
                job.data.options
            );
        });

        this.batchQueue.on('failed', async (job, error) => {
            const { batchId } = job.data;
            await this.updateBatchStatus(batchId, 'failed');
            await metricsCollector.collectErrorMetrics(
                'job_failure',
                { error: error.message, jobId: job.id },
                batchId
            );
            await metricsCollector.collectBatchMetrics(
                batchId,
                job.data.files.length,
                job.data.options.priority || 0,
                'failed',
                job.data.options
            );
        });

        this.batchQueue.on('progress', async (job, progress) => {
            const { batchId } = job.data;
            await this.updateBatchProgress(batchId, progress);
        });
    }

    async updateBatchStatus(batchId, status) {
        await db.query(
            'UPDATE batch_jobs SET status = ?, updated_at = NOW() WHERE id = ?',
            [status, batchId]
        );
    }

    async updateBatchProgress(batchId, progress) {
        await db.query(
            'UPDATE batch_jobs SET progress = ?, updated_at = NOW() WHERE id = ?',
            [progress, batchId]
        );
    }

    async getBatchStatus(batchId) {
        const [batch] = await db.query(
            'SELECT * FROM batch_jobs WHERE id = ?',
            [batchId]
        );
        return batch;
    }

    async cleanup() {
        try {
            // Stop the metrics collector
            metricsCollector.stop();
            
            // Stop disk monitoring
            diskManager.stopMonitoring();
            
            // Close the batch queue
            await this.batchQueue.close();

            // Clean up thumbnail service
            await thumbnailService.cleanup();

            // Final cleanup of temporary files
            await diskManager.cleanupTempFiles(path.join(process.env.MEDIA_STORAGE_PATH, 'temp'));

            logger.info('Batch processing service cleaned up successfully');
        } catch (error) {
            logger.error('Error cleaning up batch processing service:', error);
        }
    }
}

export const batchProcessingService = new BatchProcessingService(); 