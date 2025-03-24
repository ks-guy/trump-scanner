import { createLogger } from '../../utils/logger.js';
import path from 'path';
import { promises as fs } from 'fs';
import { MediaStorage } from '../../models/media.js';

class StorageService {
    constructor() {
        this.logger = createLogger('StorageService');
        this.storageConfig = null;
    }

    async initialize() {
        try {
            // Get active storage configuration
            this.storageConfig = await MediaStorage.findOne({
                where: { is_active: true }
            });

            if (!this.storageConfig) {
                throw new Error('No active storage configuration found');
            }

            // Ensure storage directory exists
            await this.ensureStorageDirectory();
            
            this.logger.info(`Initialized storage service with type: ${this.storageConfig.storage_type}`);
        } catch (error) {
            this.logger.error(`Error initializing storage service: ${error.message}`);
            throw error;
        }
    }

    async ensureStorageDirectory() {
        try {
            const basePath = this.storageConfig.base_path;
            const dirs = [
                basePath,
                path.join(basePath, 'videos'),
                path.join(basePath, 'thumbnails'),
                path.join(basePath, 'audio'),
                path.join(basePath, 'temp')
            ];

            for (const dir of dirs) {
                await fs.mkdir(dir, { recursive: true });
            }
        } catch (error) {
            this.logger.error(`Error creating storage directories: ${error.message}`);
            throw error;
        }
    }

    async uploadThumbnail(mediaId, thumbnailPath) {
        try {
            const filename = `thumb_${mediaId}.jpg`;
            const destination = path.join(this.storageConfig.base_path, 'thumbnails', filename);
            
            await fs.copyFile(thumbnailPath, destination);
            
            this.logger.info(`Uploaded thumbnail for media ${mediaId}`);
            return destination;
        } catch (error) {
            this.logger.error(`Error uploading thumbnail: ${error.message}`);
            throw error;
        }
    }

    async uploadAudio(mediaId, audioPath) {
        try {
            const filename = `audio_${mediaId}.mp3`;
            const destination = path.join(this.storageConfig.base_path, 'audio', filename);
            
            await fs.copyFile(audioPath, destination);
            
            this.logger.info(`Uploaded audio for media ${mediaId}`);
            return destination;
        } catch (error) {
            this.logger.error(`Error uploading audio: ${error.message}`);
            throw error;
        }
    }

    async moveToPermanentStorage(mediaId, filePath) {
        try {
            const filename = `video_${mediaId}.mp4`;
            const destination = path.join(this.storageConfig.base_path, 'videos', filename);
            
            await fs.copyFile(filePath, destination);
            
            // Update storage usage
            await this.updateStorageUsage();
            
            this.logger.info(`Moved media ${mediaId} to permanent storage`);
            return destination;
        } catch (error) {
            this.logger.error(`Error moving file to permanent storage: ${error.message}`);
            throw error;
        }
    }

    async updateStorageUsage() {
        try {
            const basePath = this.storageConfig.base_path;
            let totalSize = 0;

            // Calculate total size of all files
            for (const dir of ['videos', 'thumbnails', 'audio']) {
                const dirPath = path.join(basePath, dir);
                const files = await fs.readdir(dirPath);
                
                for (const file of files) {
                    const stats = await fs.stat(path.join(dirPath, file));
                    totalSize += stats.size;
                }
            }

            // Update storage usage in database
            await this.storageConfig.update({
                current_storage_used: totalSize
            });

            this.logger.info(`Updated storage usage: ${Math.round(totalSize / 1024 / 1024)}MB`);
        } catch (error) {
            this.logger.error(`Error updating storage usage: ${error.message}`);
            throw error;
        }
    }

    async checkStorageLimit() {
        try {
            const currentUsage = this.storageConfig.current_storage_used;
            const maxStorage = this.storageConfig.max_storage_size;
            
            if (currentUsage >= maxStorage) {
                throw new Error(`Storage limit reached: ${Math.round(currentUsage / 1024 / 1024)}MB / ${Math.round(maxStorage / 1024 / 1024)}MB`);
            }
            
            return true;
        } catch (error) {
            this.logger.error(`Storage limit check failed: ${error.message}`);
            throw error;
        }
    }

    async cleanupTempFiles() {
        try {
            const tempDir = path.join(this.storageConfig.base_path, 'temp');
            const files = await fs.readdir(tempDir);
            
            for (const file of files) {
                const filePath = path.join(tempDir, file);
                await fs.unlink(filePath);
            }
            
            this.logger.info(`Cleaned up ${files.length} temporary files`);
        } catch (error) {
            this.logger.error(`Error cleaning up temporary files: ${error.message}`);
            throw error;
        }
    }
}

export class StorageService {} 