const { MediaContent, MediaProcessingLogs } = require('../models/media');
const { logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;
const mediaSearchService = require('../services/search/MediaSearchService');

class MediaController {
    // Get all media content with pagination and filtering
    async getMediaContent(req, res) {
        try {
            const {
                page = 1,
                limit = 10,
                media_type,
                status,
                start_date,
                end_date
            } = req.query;

            const where = {};
            if (media_type) where.media_type = media_type;
            if (status) where.download_status = status;
            if (start_date && end_date) {
                where.createdAt = {
                    [Op.between]: [new Date(start_date), new Date(end_date)]
                };
            }

            const media = await MediaContent.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: (page - 1) * limit,
                order: [['createdAt', 'DESC']],
                include: [{
                    model: MediaProcessingLogs,
                    as: 'processingLogs',
                    limit: 5
                }]
            });

            res.json({
                total: media.count,
                page: parseInt(page),
                totalPages: Math.ceil(media.count / limit),
                data: media.rows
            });
        } catch (error) {
            logger.error('Error fetching media content:', error);
            res.status(500).json({ error: 'Failed to fetch media content' });
        }
    }

    // Get media content by ID
    async getMediaById(req, res) {
        try {
            const { id } = req.params;
            const media = await MediaContent.findByPk(id, {
                include: [{
                    model: MediaProcessingLogs,
                    as: 'processingLogs'
                }]
            });

            if (!media) {
                return res.status(404).json({ error: 'Media content not found' });
            }

            res.json(media);
        } catch (error) {
            logger.error('Error fetching media by ID:', error);
            res.status(500).json({ error: 'Failed to fetch media content' });
        }
    }

    // Stream media content
    async streamMedia(req, res) {
        try {
            const { id } = req.params;
            const media = await MediaContent.findByPk(id);

            if (!media || !media.storage_path) {
                return res.status(404).json({ error: 'Media content not found' });
            }

            const filePath = path.join(process.env.MEDIA_STORAGE_PATH, media.storage_path);
            
            // Check if file exists
            try {
                await fs.access(filePath);
            } catch (error) {
                return res.status(404).json({ error: 'Media file not found' });
            }

            // Get file stats
            const stat = await fs.stat(filePath);
            const fileSize = stat.size;
            const range = req.headers.range;

            if (range) {
                const parts = range.replace(/bytes=/, "").split("-");
                const start = parseInt(parts[0], 10);
                const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                const chunksize = (end - start) + 1;
                const file = await fs.open(filePath, 'r');
                const stream = file.createReadStream({ start, end });
                const head = {
                    'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                    'Accept-Ranges': 'bytes',
                    'Content-Length': chunksize,
                    'Content-Type': media.media_type === 'video' ? 'video/mp4' : 'image/jpeg'
                };
                res.writeHead(206, head);
                stream.pipe(res);
            } else {
                const head = {
                    'Content-Length': fileSize,
                    'Content-Type': media.media_type === 'video' ? 'video/mp4' : 'image/jpeg'
                };
                res.writeHead(200, head);
                const file = await fs.open(filePath, 'r');
                file.createReadStream().pipe(res);
            }
        } catch (error) {
            logger.error('Error streaming media:', error);
            res.status(500).json({ error: 'Failed to stream media content' });
        }
    }

    // Get media thumbnail
    async getThumbnail(req, res) {
        try {
            const { id } = req.params;
            const media = await MediaContent.findByPk(id);

            if (!media || !media.thumbnail_path) {
                return res.status(404).json({ error: 'Thumbnail not found' });
            }

            const thumbnailPath = path.join(process.env.MEDIA_STORAGE_PATH, media.thumbnail_path);
            
            // Check if thumbnail exists
            try {
                await fs.access(thumbnailPath);
            } catch (error) {
                return res.status(404).json({ error: 'Thumbnail file not found' });
            }

            res.sendFile(thumbnailPath);
        } catch (error) {
            logger.error('Error fetching thumbnail:', error);
            res.status(500).json({ error: 'Failed to fetch thumbnail' });
        }
    }

    // Get media processing status
    async getProcessingStatus(req, res) {
        try {
            const { id } = req.params;
            const media = await MediaContent.findByPk(id, {
                include: [{
                    model: MediaProcessingLogs,
                    as: 'processingLogs',
                    order: [['createdAt', 'DESC']]
                }]
            });

            if (!media) {
                return res.status(404).json({ error: 'Media content not found' });
            }

            res.json({
                id: media.id,
                status: media.download_status,
                processingLogs: media.processingLogs
            });
        } catch (error) {
            logger.error('Error fetching processing status:', error);
            res.status(500).json({ error: 'Failed to fetch processing status' });
        }
    }

    // Retry failed media processing
    async retryProcessing(req, res) {
        try {
            const { id } = req.params;
            const media = await MediaContent.findByPk(id);

            if (!media) {
                return res.status(404).json({ error: 'Media content not found' });
            }

            // Reset status and trigger reprocessing
            await media.update({
                download_status: 'pending',
                is_downloaded: false
            });

            // Add to processing queue
            await this.queueManager.addToProcessingQueue({
                content: media,
                source: media.source_url,
                type: media.media_type
            });

            res.json({ message: 'Media processing restarted' });
        } catch (error) {
            logger.error('Error retrying media processing:', error);
            res.status(500).json({ error: 'Failed to retry media processing' });
        }
    }

    // Delete media content
    async deleteMedia(req, res) {
        try {
            const { id } = req.params;
            const media = await MediaContent.findByPk(id);

            if (!media) {
                return res.status(404).json({ error: 'Media content not found' });
            }

            // Delete files
            if (media.storage_path) {
                await fs.unlink(path.join(process.env.MEDIA_STORAGE_PATH, media.storage_path));
            }
            if (media.thumbnail_path) {
                await fs.unlink(path.join(process.env.MEDIA_STORAGE_PATH, media.thumbnail_path));
            }
            if (media.audio_path) {
                await fs.unlink(path.join(process.env.MEDIA_STORAGE_PATH, media.audio_path));
            }

            // Delete database record
            await media.destroy();

            res.json({ message: 'Media content deleted successfully' });
        } catch (error) {
            logger.error('Error deleting media content:', error);
            res.status(500).json({ error: 'Failed to delete media content' });
        }
    }

    // Search media content
    async searchMedia(req, res) {
        try {
            const results = await mediaSearchService.search(req.query);
            res.json(results);
        } catch (error) {
            logger.error('Error searching media:', error);
            res.status(500).json({ error: 'Failed to search media content' });
        }
    }

    // Get search suggestions
    async getSearchSuggestions(req, res) {
        try {
            const { term } = req.query;
            if (!term) {
                return res.status(400).json({ error: 'Search term is required' });
            }

            const suggestions = await mediaSearchService.getSearchSuggestions(term);
            res.json(suggestions);
        } catch (error) {
            logger.error('Error getting search suggestions:', error);
            res.status(500).json({ error: 'Failed to get search suggestions' });
        }
    }

    // Get search statistics
    async getSearchStats(req, res) {
        try {
            const stats = await mediaSearchService.getSearchStats();
            res.json(stats);
        } catch (error) {
            logger.error('Error getting search stats:', error);
            res.status(500).json({ error: 'Failed to get search statistics' });
        }
    }
}

module.exports = new MediaController(); 