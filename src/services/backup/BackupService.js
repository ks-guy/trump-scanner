const fs = require('fs').promises;
const path = require('path');
const { createGzip } = require('zlib');
const { pipeline } = require('stream');
const { promisify } = require('util');
const { MediaContent } = require('../../models/media');
const { logger } = require('../../utils/logger');

const pipelineAsync = promisify(pipeline);

class BackupService {
    constructor() {
        this.backupDir = path.join(process.env.BACKUP_DIR || 'backups');
        this.mediaDir = process.env.MEDIA_STORAGE_PATH;
        this.maxBackups = parseInt(process.env.MAX_BACKUPS || '5');
    }

    async createBackup() {
        try {
            // Create backup directory if it doesn't exist
            await fs.mkdir(this.backupDir, { recursive: true });

            // Generate backup filename with timestamp
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFilename = `media_backup_${timestamp}.tar.gz`;
            const backupPath = path.join(this.backupDir, backupFilename);

            // Get all media content records
            const mediaContent = await MediaContent.findAll({
                where: {
                    is_downloaded: true
                }
            });

            // Create backup manifest
            const manifest = {
                timestamp: new Date().toISOString(),
                totalItems: mediaContent.length,
                items: mediaContent.map(item => ({
                    id: item.id,
                    source_url: item.source_url,
                    media_type: item.media_type,
                    storage_path: item.storage_path,
                    thumbnail_path: item.thumbnail_path,
                    audio_path: item.audio_path,
                    metadata: item.metadata
                }))
            };

            // Save manifest
            const manifestPath = path.join(this.backupDir, `manifest_${timestamp}.json`);
            await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));

            // Create tar archive of media files
            const tar = require('tar');
            await tar.create(
                {
                    gzip: true,
                    file: backupPath,
                    cwd: this.mediaDir
                },
                mediaContent.map(item => item.storage_path)
            );

            // Clean up old backups
            await this.cleanupOldBackups();

            return {
                success: true,
                backupPath,
                manifestPath,
                totalItems: mediaContent.length
            };
        } catch (error) {
            logger.error('Error creating backup:', error);
            throw error;
        }
    }

    async restoreBackup(backupId) {
        try {
            const manifestPath = path.join(this.backupDir, `manifest_${backupId}.json`);
            const backupPath = path.join(this.backupDir, `media_backup_${backupId}.tar.gz`);

            // Verify backup files exist
            await fs.access(manifestPath);
            await fs.access(backupPath);

            // Read manifest
            const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));

            // Extract backup
            const tar = require('tar');
            await tar.extract({
                file: backupPath,
                cwd: this.mediaDir
            });

            // Restore database records
            for (const item of manifest.items) {
                await MediaContent.upsert({
                    id: item.id,
                    source_url: item.source_url,
                    media_type: item.media_type,
                    storage_path: item.storage_path,
                    thumbnail_path: item.thumbnail_path,
                    audio_path: item.audio_path,
                    metadata: item.metadata,
                    is_downloaded: true,
                    download_status: 'completed'
                });
            }

            return {
                success: true,
                restoredItems: manifest.items.length
            };
        } catch (error) {
            logger.error('Error restoring backup:', error);
            throw error;
        }
    }

    async listBackups() {
        try {
            const files = await fs.readdir(this.backupDir);
            const manifests = files.filter(file => file.startsWith('manifest_'));
            
            const backups = await Promise.all(
                manifests.map(async manifest => {
                    const manifestPath = path.join(this.backupDir, manifest);
                    const manifestContent = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
                    const backupId = manifest.replace('manifest_', '').replace('.json', '');
                    
                    return {
                        id: backupId,
                        timestamp: manifestContent.timestamp,
                        totalItems: manifestContent.totalItems,
                        size: await this.getBackupSize(backupId)
                    };
                })
            );

            return backups.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        } catch (error) {
            logger.error('Error listing backups:', error);
            throw error;
        }
    }

    async getBackupSize(backupId) {
        try {
            const backupPath = path.join(this.backupDir, `media_backup_${backupId}.tar.gz`);
            const stats = await fs.stat(backupPath);
            return stats.size;
        } catch (error) {
            logger.error('Error getting backup size:', error);
            return 0;
        }
    }

    async cleanupOldBackups() {
        try {
            const backups = await this.listBackups();
            if (backups.length > this.maxBackups) {
                const oldBackups = backups.slice(this.maxBackups);
                for (const backup of oldBackups) {
                    await this.deleteBackup(backup.id);
                }
            }
        } catch (error) {
            logger.error('Error cleaning up old backups:', error);
            throw error;
        }
    }

    async deleteBackup(backupId) {
        try {
            const manifestPath = path.join(this.backupDir, `manifest_${backupId}.json`);
            const backupPath = path.join(this.backupDir, `media_backup_${backupId}.tar.gz`);

            await fs.unlink(manifestPath);
            await fs.unlink(backupPath);

            return { success: true };
        } catch (error) {
            logger.error('Error deleting backup:', error);
            throw error;
        }
    }
}

module.exports = new BackupService(); 