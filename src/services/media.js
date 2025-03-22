const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const { db } = require('../config/database');
const sharp = require('sharp');
const ffmpeg = require('fluent-ffmpeg');
const { promisify } = require('util');
const exec = promisify(require('child_process').exec);

class MediaService {
    constructor() {
        this.mediaDir = process.env.MEDIA_DIR || path.join(process.cwd(), 'media');
        this.ensureMediaDir();
    }

    async ensureMediaDir() {
        try {
            await fs.access(this.mediaDir);
        } catch (error) {
            await fs.mkdir(this.mediaDir, { recursive: true });
        }
    }

    async getMedia(filters = {}) {
        try {
            let query = 'SELECT * FROM media WHERE 1=1';
            const params = [];

            if (filters.type && filters.type !== 'all') {
                query += ' AND type = ?';
                params.push(filters.type);
            }

            if (filters.status && filters.status !== 'all') {
                query += ' AND status = ?';
                params.push(filters.status);
            }

            if (filters.dateRange && filters.dateRange !== 'all') {
                const dateFilter = this.getDateRangeFilter(filters.dateRange);
                query += ` AND created_at ${dateFilter}`;
            }

            query += ' ORDER BY created_at DESC';

            const media = await db.query(query, params);
            return media;
        } catch (error) {
            logger.error('Error getting media:', error);
            throw new Error('Failed to get media');
        }
    }

    async getMediaStats() {
        try {
            const stats = await db.query(`
                SELECT 
                    COUNT(*) as total,
                    SUM(size) as totalSize,
                    SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processingQueue,
                    SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed
                FROM media
            `);
            return stats[0];
        } catch (error) {
            logger.error('Error getting media stats:', error);
            throw new Error('Failed to get media stats');
        }
    }

    async processMediaUpload(file) {
        const mediaId = uuidv4();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `${mediaId}_${timestamp}${path.extname(file.originalname)}`;
        const filePath = path.join(this.mediaDir, fileName);

        try {
            // Move uploaded file to media directory
            await fs.rename(file.path, filePath);

            // Get file type and size
            const stats = await fs.stat(filePath);
            const fileType = this.getFileType(file.mimetype);

            // Process media based on type
            let metadata = {};
            let thumbnailPath = null;

            switch (fileType) {
                case 'image':
                    metadata = await this.processImage(filePath);
                    thumbnailPath = await this.generateImageThumbnail(filePath);
                    break;
                case 'video':
                    metadata = await this.processVideo(filePath);
                    thumbnailPath = await this.generateVideoThumbnail(filePath);
                    break;
                case 'audio':
                    metadata = await this.processAudio(filePath);
                    break;
                default:
                    metadata = { type: 'document' };
            }

            // Save media record to database
            const media = await db.query(
                'INSERT INTO media (id, name, type, size, status, metadata, thumbnail_url) VALUES (?, ?, ?, ?, ?, ?, ?) RETURNING *',
                [mediaId, file.originalname, fileType, stats.size, 'processed', JSON.stringify(metadata), thumbnailPath]
            );

            return media;
        } catch (error) {
            logger.error('Error processing media upload:', error);
            throw new Error('Failed to process media upload');
        }
    }

    async getMediaById(id) {
        try {
            const media = await db.query('SELECT * FROM media WHERE id = ?', [id]);
            return media[0];
        } catch (error) {
            logger.error('Error getting media by id:', error);
            throw new Error('Failed to get media');
        }
    }

    async updateMedia(id, updates) {
        try {
            const media = await db.query(
                'UPDATE media SET ? WHERE id = ? RETURNING *',
                [updates, id]
            );
            return media[0];
        } catch (error) {
            logger.error('Error updating media:', error);
            throw new Error('Failed to update media');
        }
    }

    async deleteMedia(id) {
        try {
            const media = await this.getMediaById(id);
            if (!media) {
                return false;
            }

            // Delete media file
            await fs.unlink(media.file_path);

            // Delete thumbnail if exists
            if (media.thumbnail_url) {
                await fs.unlink(media.thumbnail_url);
            }

            // Delete from database
            await db.query('DELETE FROM media WHERE id = ?', [id]);

            return true;
        } catch (error) {
            logger.error('Error deleting media:', error);
            throw new Error('Failed to delete media');
        }
    }

    async getMediaFile(id) {
        try {
            const media = await this.getMediaById(id);
            if (!media) {
                throw new Error('Media not found');
            }

            return {
                filePath: media.file_path,
                fileName: media.name
            };
        } catch (error) {
            logger.error('Error getting media file:', error);
            throw new Error('Failed to get media file');
        }
    }

    // Helper methods
    getFileType(mimetype) {
        if (mimetype.startsWith('image/')) return 'image';
        if (mimetype.startsWith('video/')) return 'video';
        if (mimetype.startsWith('audio/')) return 'audio';
        return 'document';
    }

    getDateRangeFilter(dateRange) {
        const now = new Date();
        switch (dateRange) {
            case 'today':
                return `>= DATE_SUB(CURDATE(), INTERVAL 1 DAY)`;
            case 'week':
                return `>= DATE_SUB(CURDATE(), INTERVAL 1 WEEK)`;
            case 'month':
                return `>= DATE_SUB(CURDATE(), INTERVAL 1 MONTH)`;
            case 'year':
                return `>= DATE_SUB(CURDATE(), INTERVAL 1 YEAR)`;
            default:
                return '>= 0';
        }
    }

    async processImage(filePath) {
        try {
            const metadata = await sharp(filePath).metadata();
            return {
                width: metadata.width,
                height: metadata.height,
                format: metadata.format,
                size: metadata.size,
                orientation: metadata.orientation
            };
        } catch (error) {
            logger.error('Error processing image:', error);
            throw new Error('Failed to process image');
        }
    }

    async processVideo(filePath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    logger.error('Error processing video:', err);
                    reject(new Error('Failed to process video'));
                    return;
                }

                const videoStream = metadata.streams.find(s => s.codec_type === 'video');
                const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

                resolve({
                    duration: metadata.format.duration,
                    size: metadata.format.size,
                    bitrate: metadata.format.bit_rate,
                    videoCodec: videoStream ? videoStream.codec_name : null,
                    audioCodec: audioStream ? audioStream.codec_name : null,
                    width: videoStream ? videoStream.width : null,
                    height: videoStream ? videoStream.height : null
                });
            });
        });
    }

    async processAudio(filePath) {
        return new Promise((resolve, reject) => {
            ffmpeg.ffprobe(filePath, (err, metadata) => {
                if (err) {
                    logger.error('Error processing audio:', err);
                    reject(new Error('Failed to process audio'));
                    return;
                }

                const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

                resolve({
                    duration: metadata.format.duration,
                    size: metadata.format.size,
                    bitrate: metadata.format.bit_rate,
                    codec: audioStream ? audioStream.codec_name : null,
                    channels: audioStream ? audioStream.channels : null,
                    sampleRate: audioStream ? audioStream.sample_rate : null
                });
            });
        });
    }

    async generateImageThumbnail(filePath) {
        try {
            const thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg');
            await sharp(filePath)
                .resize(200, 200, {
                    fit: 'cover',
                    position: 'center'
                })
                .jpeg({ quality: 80 })
                .toFile(thumbnailPath);
            return thumbnailPath;
        } catch (error) {
            logger.error('Error generating image thumbnail:', error);
            throw new Error('Failed to generate thumbnail');
        }
    }

    async generateVideoThumbnail(filePath) {
        try {
            const thumbnailPath = filePath.replace(/\.[^/.]+$/, '_thumb.jpg');
            await new Promise((resolve, reject) => {
                ffmpeg(filePath)
                    .screenshots({
                        timestamps: ['50%'],
                        filename: path.basename(thumbnailPath),
                        folder: path.dirname(thumbnailPath),
                        size: '200x200'
                    })
                    .on('end', resolve)
                    .on('error', reject);
            });
            return thumbnailPath;
        } catch (error) {
            logger.error('Error generating video thumbnail:', error);
            throw new Error('Failed to generate thumbnail');
        }
    }
}

module.exports = {
    MediaService: new MediaService()
}; 