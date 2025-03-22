const { logger } = require('../../utils/logger');
const { db } = require('../../config/database');
const TruthSocialScraper = require('../scrapers/TruthSocialScraper');
const { v4: uuidv4 } = require('uuid');

class SocialMediaArchiver {
    constructor() {
        this.truthSocialScraper = new TruthSocialScraper();
        this.archiveDir = process.env.ARCHIVE_DIR || 'archives';
        this.maxArchiveAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    }

    /**
     * Archive content from all configured social media platforms
     * @param {Object} options Archive options
     * @param {Date} options.startDate Start date for archive
     * @param {Date} options.endDate End date for archive
     * @param {string[]} options.platforms Platforms to archive (default: all)
     * @returns {Promise<string>} Archive ID
     */
    async createArchive(options = {}) {
        const {
            startDate = new Date(Date.now() - 24 * 60 * 60 * 1000), // Default to last 24 hours
            endDate = new Date(),
            platforms = ['truth_social', 'twitter', 'facebook']
        } = options;

        const archiveId = uuidv4();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const archivePath = `${this.archiveDir}/archive_${timestamp}`;

        try {
            // Create archive directory with secure permissions
            await fs.mkdir(archivePath, { recursive: true, mode: 0o700 });

            // Archive each platform
            for (const platform of platforms) {
                try {
                    await this.archivePlatform(platform, {
                        archiveId,
                        archivePath,
                        startDate,
                        endDate
                    });
                } catch (error) {
                    logger.error(`Error archiving ${platform}:`, error);
                    // Continue with other platforms even if one fails
                }
            }

            // Record archive in database
            await db.query(
                `INSERT INTO archives (
                    id, 
                    path, 
                    start_date, 
                    end_date, 
                    platforms,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, NOW())`,
                [archiveId, archivePath, startDate, endDate, JSON.stringify(platforms)]
            );

            // Clean up old archives
            await this.cleanupOldArchives();

            return archiveId;
        } catch (error) {
            logger.error('Error creating archive:', error);
            // Clean up failed archive directory
            try {
                await fs.rm(archivePath, { recursive: true, force: true });
            } catch (cleanupError) {
                logger.error('Error cleaning up failed archive:', cleanupError);
            }
            throw new Error('Failed to create archive');
        }
    }

    /**
     * Archive content from a specific platform
     * @param {string} platform Platform to archive
     * @param {Object} options Archive options
     * @returns {Promise<void>}
     */
    async archivePlatform(platform, options) {
        const { archiveId, archivePath, startDate, endDate } = options;
        const platformDir = path.join(archivePath, platform);

        try {
            await fs.mkdir(platformDir, { recursive: true, mode: 0o700 });

            switch (platform) {
                case 'truth_social':
                    await this.archiveTruthSocial(platformDir, startDate, endDate);
                    break;
                case 'twitter':
                    await this.archiveTwitter(platformDir, startDate, endDate);
                    break;
                case 'facebook':
                    await this.archiveFacebook(platformDir, startDate, endDate);
                    break;
                default:
                    throw new Error(`Unsupported platform: ${platform}`);
            }

            // Record platform archive in database
            await db.query(
                `INSERT INTO platform_archives (
                    id,
                    archive_id,
                    platform,
                    path,
                    start_date,
                    end_date,
                    created_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW())`,
                [uuidv4(), archiveId, platform, platformDir, startDate, endDate]
            );
        } catch (error) {
            logger.error(`Error archiving ${platform}:`, error);
            throw error;
        }
    }

    /**
     * Archive Truth Social content
     * @param {string} dir Directory to store archive
     * @param {Date} startDate Start date
     * @param {Date} endDate End date
     * @returns {Promise<void>}
     */
    async archiveTruthSocial(dir, startDate, endDate) {
        try {
            const profile = await this.truthSocialScraper.scrapeProfile();
            const posts = await this.truthSocialScraper.scrapePosts({
                startDate,
                endDate
            });

            // Save profile data
            await fs.writeFile(
                path.join(dir, 'profile.json'),
                JSON.stringify(profile, null, 2),
                { mode: 0o600 }
            );

            // Save posts data
            await fs.writeFile(
                path.join(dir, 'posts.json'),
                JSON.stringify(posts, null, 2),
                { mode: 0o600 }
            );

            // Download media files
            const mediaDir = path.join(dir, 'media');
            await fs.mkdir(mediaDir, { recursive: true, mode: 0o700 });

            for (const post of posts) {
                if (post.media_urls) {
                    for (const mediaUrl of post.media_urls) {
                        try {
                            const mediaPath = path.join(mediaDir, path.basename(mediaUrl));
                            await this.downloadMedia(mediaUrl, mediaPath);
                        } catch (error) {
                            logger.error(`Error downloading media ${mediaUrl}:`, error);
                        }
                    }
                }
            }
        } catch (error) {
            logger.error('Error archiving Truth Social:', error);
            throw error;
        }
    }

    /**
     * Archive Twitter/X content
     * @param {string} dir Directory to store archive
     * @param {Date} startDate Start date
     * @param {Date} endDate End date
     * @returns {Promise<void>}
     */
    async archiveTwitter(dir, startDate, endDate) {
        // TODO: Implement Twitter/X archiving
        logger.warn('Twitter/X archiving not yet implemented');
    }

    /**
     * Archive Facebook content
     * @param {string} dir Directory to store archive
     * @param {Date} startDate Start date
     * @param {Date} endDate End date
     * @returns {Promise<void>}
     */
    async archiveFacebook(dir, startDate, endDate) {
        // TODO: Implement Facebook archiving
        logger.warn('Facebook archiving not yet implemented');
    }

    /**
     * Download media file with retry logic
     * @param {string} url Media URL
     * @param {string} path Local path to save file
     * @returns {Promise<void>}
     */
    async downloadMedia(url, path) {
        const maxRetries = 3;
        let retries = 0;

        while (retries < maxRetries) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
                
                const buffer = await response.buffer();
                await fs.writeFile(path, buffer, { mode: 0o600 });
                return;
            } catch (error) {
                retries++;
                if (retries === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, retries)));
            }
        }
    }

    /**
     * Clean up old archives
     * @returns {Promise<void>}
     */
    async cleanupOldArchives() {
        try {
            const cutoffDate = new Date(Date.now() - this.maxArchiveAge);
            const oldArchives = await db.query(
                'SELECT id, path FROM archives WHERE created_at < ?',
                [cutoffDate]
            );

            for (const archive of oldArchives) {
                try {
                    await fs.rm(archive.path, { recursive: true, force: true });
                    await db.query('DELETE FROM archives WHERE id = ?', [archive.id]);
                    await db.query('DELETE FROM platform_archives WHERE archive_id = ?', [archive.id]);
                    logger.info(`Cleaned up old archive: ${archive.id}`);
                } catch (error) {
                    logger.error(`Error cleaning up archive ${archive.id}:`, error);
                }
            }
        } catch (error) {
            logger.error('Error cleaning up old archives:', error);
        }
    }
}

module.exports = SocialMediaArchiver; 