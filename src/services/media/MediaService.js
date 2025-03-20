const { createLogger } = require('../../utils/logger');
const { downloadVideo, extractAudio, generateThumbnail } = require('./mediaProcessing');
const { MediaContent, MediaDownloadQueue, MediaProcessingLogs } = require('../../models/media');
const { StorageService } = require('./StorageService');
const path = require('path');
const fs = require('fs').promises;

class MediaService {
    constructor() {
        this.logger = createLogger('MediaService');
        this.storageService = new StorageService();
        this.processingQueue = new Map();
    }

    async processNewMedia(mediaContentId) {
        try {
            const mediaContent = await MediaContent.findById(mediaContentId);
            if (!mediaContent) {
                throw new Error(`Media content ${mediaContentId} not found`);
            }

            // Add to download queue
            await this.addToDownloadQueue(mediaContent);

            this.logger.info(`Added media content ${mediaContentId} to processing queue`);
            return true;
        } catch (error) {
            this.logger.error(`Error processing new media: ${error.message}`);
            await this.logProcessingError(mediaContentId, 'queue', error);
            return false;
        }
    }

    async addToDownloadQueue(mediaContent) {
        try {
            const queueItem = await MediaDownloadQueue.create({
                media_content_id: mediaContent.id,
                priority: this.calculatePriority(mediaContent),
                status: 'pending'
            });

            this.logger.info(`Added media ${mediaContent.id} to download queue with priority ${queueItem.priority}`);
            return queueItem;
        } catch (error) {
            this.logger.error(`Error adding to download queue: ${error.message}`);
            throw error;
        }
    }

    calculatePriority(mediaContent) {
        // Higher priority for:
        // 1. Recent content
        // 2. Video content
        // 3. Content with quotes
        let priority = 0;
        
        if (mediaContent.media_type === 'video') priority += 3;
        if (mediaContent.created_at > new Date(Date.now() - 24 * 60 * 60 * 1000)) priority += 2;
        
        return priority;
    }

    async processDownloadQueue() {
        try {
            const pendingItems = await MediaDownloadQueue.findAll({
                where: { status: 'pending' },
                order: [['priority', 'DESC']],
                limit: 5
            });

            for (const item of pendingItems) {
                await this.processQueueItem(item);
            }
        } catch (error) {
            this.logger.error(`Error processing download queue: ${error.message}`);
        }
    }

    async processQueueItem(queueItem) {
        try {
            // Update status to in_progress
            await queueItem.update({ status: 'in_progress', last_attempt: new Date() });

            const mediaContent = await MediaContent.findById(queueItem.media_content_id);
            if (!mediaContent) {
                throw new Error(`Media content ${queueItem.media_content_id} not found`);
            }

            // Download the media
            const downloadResult = await this.downloadMedia(mediaContent);
            
            // Process the media (generate thumbnails, extract audio if needed)
            await this.processMedia(mediaContent, downloadResult);

            // Update status to completed
            await queueItem.update({ status: 'completed' });
            await mediaContent.update({ 
                is_downloaded: true,
                download_status: 'completed'
            });

            this.logger.info(`Successfully processed media ${mediaContent.id}`);
        } catch (error) {
            this.logger.error(`Error processing queue item: ${error.message}`);
            await this.handleProcessingError(queueItem, error);
        }
    }

    async downloadMedia(mediaContent) {
        const startTime = Date.now();
        try {
            this.logger.info(`Starting download for media ${mediaContent.id}`);
            
            // Create temporary directory for processing
            const tempDir = await this.createTempDirectory(mediaContent.id);
            
            // Download the media
            const downloadResult = await downloadVideo(mediaContent.source_url, tempDir);
            
            // Update media content with file information
            await mediaContent.update({
                file_size: downloadResult.fileSize,
                format: downloadResult.format,
                resolution: downloadResult.resolution,
                bitrate: downloadResult.bitrate
            });

            const processingTime = Date.now() - startTime;
            await this.logProcessingSuccess(mediaContent.id, 'download', processingTime);

            return downloadResult;
        } catch (error) {
            const processingTime = Date.now() - startTime;
            await this.logProcessingError(mediaContent.id, 'download', error, processingTime);
            throw error;
        }
    }

    async processMedia(mediaContent, downloadResult) {
        const startTime = Date.now();
        try {
            const tempDir = path.join(process.env.TEMP_DIR, `media_${mediaContent.id}`);
            
            // Generate thumbnail
            if (mediaContent.media_type === 'video') {
                const thumbnailPath = await generateThumbnail(downloadResult.filePath);
                await this.storageService.uploadThumbnail(mediaContent.id, thumbnailPath);
            }

            // Extract audio if it's a video
            if (mediaContent.media_type === 'video') {
                const audioPath = await extractAudio(downloadResult.filePath);
                await this.storageService.uploadAudio(mediaContent.id, audioPath);
            }

            // Move processed file to permanent storage
            await this.storageService.moveToPermanentStorage(mediaContent.id, downloadResult.filePath);

            const processingTime = Date.now() - startTime;
            await this.logProcessingSuccess(mediaContent.id, 'processing', processingTime);
        } catch (error) {
            const processingTime = Date.now() - startTime;
            await this.logProcessingError(mediaContent.id, 'processing', error, processingTime);
            throw error;
        }
    }

    async createTempDirectory(mediaId) {
        const tempDir = path.join(process.env.TEMP_DIR, `media_${mediaId}`);
        await fs.mkdir(tempDir, { recursive: true });
        return tempDir;
    }

    async handleProcessingError(queueItem, error) {
        const retryCount = queueItem.retry_count + 1;
        const maxRetries = 3;

        if (retryCount >= maxRetries) {
            await queueItem.update({ 
                status: 'failed',
                error_message: error.message
            });
        } else {
            await queueItem.update({ 
                retry_count: retryCount,
                status: 'pending',
                last_attempt: new Date()
            });
        }
    }

    async logProcessingSuccess(mediaContentId, processType, processingTime) {
        await MediaProcessingLogs.create({
            media_content_id: mediaContentId,
            process_type: processType,
            status: 'success',
            processing_time: processingTime
        });
    }

    async logProcessingError(mediaContentId, processType, error, processingTime = null) {
        await MediaProcessingLogs.create({
            media_content_id: mediaContentId,
            process_type: processType,
            status: 'error',
            error_message: error.message,
            processing_time: processingTime
        });
    }
}

module.exports = MediaService; 