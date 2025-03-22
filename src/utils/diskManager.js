const fs = require('fs').promises;
const path = require('path');
const os = require('os');
const { logger } = require('./logger');

class DiskManager {
    constructor(options = {}) {
        this.options = {
            warningThreshold: 85, // Warn when disk usage is above 85%
            criticalThreshold: 95, // Critical when disk usage is above 95%
            cleanupThreshold: 90, // Start cleanup when disk usage is above 90%
            minFreeSpace: 10 * 1024 * 1024 * 1024, // Minimum 10GB free space
            tempFileMaxAge: 24 * 60 * 60 * 1000, // 24 hours
            ...options
        };

        this.monitoringInterval = null;
    }

    /**
     * Start disk space monitoring
     * @param {number} interval - Monitoring interval in milliseconds
     */
    startMonitoring(interval = 5 * 60 * 1000) { // Default 5 minutes
        this.monitoringInterval = setInterval(async () => {
            try {
                await this.checkDiskSpace();
            } catch (error) {
                logger.error('Error monitoring disk space:', error);
            }
        }, interval);
    }

    /**
     * Stop disk space monitoring
     */
    stopMonitoring() {
        if (this.monitoringInterval) {
            clearInterval(this.monitoringInterval);
            this.monitoringInterval = null;
        }
    }

    /**
     * Check disk space and trigger cleanup if needed
     */
    async checkDiskSpace() {
        const mediaPath = process.env.MEDIA_STORAGE_PATH;
        const tempPath = path.join(os.tmpdir(), 'media-processing');

        try {
            // Check media storage path
            const mediaStats = await this.getDiskStats(mediaPath);
            logger.info(`Media storage disk usage: ${mediaStats.usagePercent}%`);

            if (mediaStats.usagePercent > this.options.criticalThreshold) {
                logger.error(`Critical disk space alert! Usage: ${mediaStats.usagePercent}%`);
                await this.emergencyCleanup(mediaPath);
            } else if (mediaStats.usagePercent > this.options.cleanupThreshold) {
                logger.warn(`High disk usage detected: ${mediaStats.usagePercent}%`);
                await this.cleanup(mediaPath);
            } else if (mediaStats.usagePercent > this.options.warningThreshold) {
                logger.warn(`Disk usage warning: ${mediaStats.usagePercent}%`);
            }

            // Check temp directory
            const tempStats = await this.getDiskStats(tempPath);
            if (tempStats.usagePercent > this.options.warningThreshold) {
                await this.cleanupTempFiles(tempPath);
            }

        } catch (error) {
            logger.error('Error checking disk space:', error);
            throw error;
        }
    }

    /**
     * Get disk statistics for a path
     * @param {string} checkPath - Path to check
     * @returns {Object} Disk statistics
     */
    async getDiskStats(checkPath) {
        const stats = await fs.statfs(checkPath);
        const totalSpace = stats.blocks * stats.bsize;
        const freeSpace = stats.bfree * stats.bsize;
        const usedSpace = totalSpace - freeSpace;
        const usagePercent = (usedSpace / totalSpace) * 100;

        return {
            total: totalSpace,
            free: freeSpace,
            used: usedSpace,
            usagePercent: Math.round(usagePercent * 100) / 100
        };
    }

    /**
     * Normal cleanup procedure
     * @param {string} directory - Directory to clean
     */
    async cleanup(directory) {
        try {
            // Clean old thumbnails first
            await this.cleanupThumbnails(path.join(directory, 'thumbnails'));
            
            // Clean old temporary files
            await this.cleanupTempFiles(path.join(directory, 'temp'));

            // Clean old processed videos based on access time
            await this.cleanupOldFiles(path.join(directory, 'processed'), {
                maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
                minAccess: 7 * 24 * 60 * 60 * 1000  // 7 days since last access
            });

        } catch (error) {
            logger.error('Error during cleanup:', error);
            throw error;
        }
    }

    /**
     * Emergency cleanup when disk space is critical
     * @param {string} directory - Directory to clean
     */
    async emergencyCleanup(directory) {
        try {
            // Aggressive cleanup of temporary files
            await this.cleanupTempFiles(path.join(directory, 'temp'), true);

            // Remove all thumbnails that haven't been accessed in 24 hours
            await this.cleanupThumbnails(path.join(directory, 'thumbnails'), {
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            });

            // Remove old processed files more aggressively
            await this.cleanupOldFiles(path.join(directory, 'processed'), {
                maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
                minAccess: 3 * 24 * 60 * 60 * 1000  // 3 days since last access
            });

            // If still critical, notify administrators
            const stats = await this.getDiskStats(directory);
            if (stats.usagePercent > this.options.criticalThreshold) {
                logger.error('Emergency cleanup completed but disk space still critical!');
                // Here you could add notification logic (email, Slack, etc.)
            }
        } catch (error) {
            logger.error('Error during emergency cleanup:', error);
            throw error;
        }
    }

    /**
     * Clean up thumbnail files
     * @param {string} directory - Thumbnails directory
     * @param {Object} options - Cleanup options
     */
    async cleanupThumbnails(directory, options = {}) {
        const defaultOptions = {
            maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
            minAccess: 24 * 60 * 60 * 1000   // 24 hours since last access
        };
        const cleanupOptions = { ...defaultOptions, ...options };

        try {
            const files = await fs.readdir(directory);
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(directory, file);
                const stats = await fs.stat(filePath);
                const age = now - stats.birthtimeMs;
                const lastAccess = now - stats.atimeMs;

                if (age > cleanupOptions.maxAge || lastAccess > cleanupOptions.minAccess) {
                    await fs.unlink(filePath);
                    logger.info(`Removed old thumbnail: ${file}`);
                }
            }
        } catch (error) {
            logger.error('Error cleaning up thumbnails:', error);
            throw error;
        }
    }

    /**
     * Clean up temporary files
     * @param {string} directory - Temp directory
     * @param {boolean} aggressive - Whether to perform aggressive cleanup
     */
    async cleanupTempFiles(directory, aggressive = false) {
        try {
            const files = await fs.readdir(directory);
            const now = Date.now();
            const maxAge = aggressive ? 
                1 * 60 * 60 * 1000 : // 1 hour for aggressive cleanup
                this.options.tempFileMaxAge;

            for (const file of files) {
                const filePath = path.join(directory, file);
                const stats = await fs.stat(filePath);
                
                if (now - stats.birthtimeMs > maxAge) {
                    await fs.unlink(filePath);
                    logger.info(`Removed temp file: ${file}`);
                }
            }
        } catch (error) {
            logger.error('Error cleaning up temp files:', error);
            throw error;
        }
    }

    /**
     * Clean up old processed files
     * @param {string} directory - Directory containing processed files
     * @param {Object} options - Cleanup options
     */
    async cleanupOldFiles(directory, options) {
        try {
            const files = await fs.readdir(directory);
            const now = Date.now();

            for (const file of files) {
                const filePath = path.join(directory, file);
                const stats = await fs.stat(filePath);
                const age = now - stats.birthtimeMs;
                const lastAccess = now - stats.atimeMs;

                if (age > options.maxAge || lastAccess > options.minAccess) {
                    // Check if file is not in use
                    try {
                        const fd = await fs.open(filePath, 'r+');
                        await fd.close();
                        await fs.unlink(filePath);
                        logger.info(`Removed old file: ${file}`);
                    } catch (error) {
                        logger.warn(`File ${file} is in use, skipping`);
                    }
                }
            }
        } catch (error) {
            logger.error('Error cleaning up old files:', error);
            throw error;
        }
    }
}

module.exports = new DiskManager(); 