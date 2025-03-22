const thumbnailService = require('../services/media/ThumbnailService');
const { logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs').promises;

class ThumbnailController {
    async generateThumbnails(req, res) {
        try {
            const { videoId } = req.params;
            const options = req.body;

            // Validate video exists
            const videoPath = path.join(process.env.MEDIA_STORAGE_PATH, `${videoId}.mp4`);
            try {
                await fs.access(videoPath);
            } catch (error) {
                logger.error(`Video not found: ${videoId}`);
                return res.status(404).json({ error: 'Video not found' });
            }

            // Create thumbnails directory if it doesn't exist
            const thumbnailDir = path.join(process.env.MEDIA_STORAGE_PATH, 'thumbnails', videoId);
            await fs.mkdir(thumbnailDir, { recursive: true });

            // Generate thumbnails
            const thumbnails = await thumbnailService.generateThumbnails(
                videoPath,
                options,
                thumbnailDir
            );

            return res.status(200).json({
                message: 'Thumbnails generated successfully',
                thumbnails: thumbnails.map(t => path.basename(t))
            });
        } catch (error) {
            logger.error('Error generating thumbnails:', error);
            return res.status(500).json({ error: 'Failed to generate thumbnails' });
        }
    }

    async getThumbnails(req, res) {
        try {
            const { videoId } = req.params;
            const thumbnailDir = path.join(process.env.MEDIA_STORAGE_PATH, 'thumbnails', videoId);

            try {
                const files = await fs.readdir(thumbnailDir);
                const thumbnails = files.filter(f => f.endsWith('.jpg'));

                return res.status(200).json({
                    thumbnails: thumbnails
                });
            } catch (error) {
                return res.status(404).json({ error: 'No thumbnails found' });
            }
        } catch (error) {
            logger.error('Error getting thumbnails:', error);
            return res.status(500).json({ error: 'Failed to get thumbnails' });
        }
    }

    async deleteThumbnail(req, res) {
        try {
            const { videoId, thumbnailId } = req.params;
            const thumbnailPath = path.join(
                process.env.MEDIA_STORAGE_PATH,
                'thumbnails',
                videoId,
                thumbnailId
            );

            try {
                await fs.unlink(thumbnailPath);
                return res.status(200).json({ message: 'Thumbnail deleted successfully' });
            } catch (error) {
                return res.status(404).json({ error: 'Thumbnail not found' });
            }
        } catch (error) {
            logger.error('Error deleting thumbnail:', error);
            return res.status(500).json({ error: 'Failed to delete thumbnail' });
        }
    }

    async updateThumbnail(req, res) {
        try {
            const { videoId, thumbnailId } = req.params;
            const options = req.body;
            const thumbnailPath = path.join(
                process.env.MEDIA_STORAGE_PATH,
                'thumbnails',
                videoId,
                thumbnailId
            );

            try {
                await fs.access(thumbnailPath);
            } catch (error) {
                return res.status(404).json({ error: 'Thumbnail not found' });
            }

            // Process thumbnail with new options
            await thumbnailService.processThumbnail(thumbnailPath, options);

            return res.status(200).json({ message: 'Thumbnail updated successfully' });
        } catch (error) {
            logger.error('Error updating thumbnail:', error);
            return res.status(500).json({ error: 'Failed to update thumbnail' });
        }
    }
}

module.exports = new ThumbnailController(); 