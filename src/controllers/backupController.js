const backupService = require('../services/backup/BackupService');
const { logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class BackupController {
    // Create a new backup
    async createBackup(req, res) {
        try {
            const result = await backupService.createBackup();
            res.json({
                message: 'Backup created successfully',
                ...result
            });
        } catch (error) {
            logger.error('Error creating backup:', error);
            res.status(500).json({ error: 'Failed to create backup' });
        }
    }

    // Restore from a backup
    async restoreBackup(req, res) {
        try {
            const { backupId } = req.params;
            const result = await backupService.restoreBackup(backupId);
            res.json({
                message: 'Backup restored successfully',
                ...result
            });
        } catch (error) {
            logger.error('Error restoring backup:', error);
            res.status(500).json({ error: 'Failed to restore backup' });
        }
    }

    // List all backups
    async listBackups(req, res) {
        try {
            const backups = await backupService.listBackups();
            res.json(backups);
        } catch (error) {
            logger.error('Error listing backups:', error);
            res.status(500).json({ error: 'Failed to list backups' });
        }
    }

    // Delete a backup
    async deleteBackup(req, res) {
        try {
            const { backupId } = req.params;
            await backupService.deleteBackup(backupId);
            res.json({ message: 'Backup deleted successfully' });
        } catch (error) {
            logger.error('Error deleting backup:', error);
            res.status(500).json({ error: 'Failed to delete backup' });
        }
    }

    // Download a backup
    async downloadBackup(req, res) {
        try {
            const { backupId } = req.params;
            const backupPath = path.join(
                process.env.BACKUP_DIR || 'backups',
                `media_backup_${backupId}.tar.gz`
            );

            // Check if backup exists
            await fs.access(backupPath);

            // Set headers for file download
            res.setHeader('Content-Type', 'application/gzip');
            res.setHeader('Content-Disposition', `attachment; filename=media_backup_${backupId}.tar.gz`);

            // Stream the backup file
            const fileStream = fs.createReadStream(backupPath);
            fileStream.pipe(res);

            // Handle errors
            fileStream.on('error', (error) => {
                logger.error('Error streaming backup file:', error);
                res.status(500).json({ error: 'Failed to download backup' });
            });
        } catch (error) {
            logger.error('Error downloading backup:', error);
            res.status(500).json({ error: 'Failed to download backup' });
        }
    }
}

module.exports = new BackupController(); 