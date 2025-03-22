const { BackupService } = require('../services/backup');
const { logger } = require('../utils/logger');
const path = require('path');
const fs = require('fs');

class BackupController {
    async getBackups(req, res) {
        try {
            const backups = await BackupService.listBackups();
            res.json(backups);
        } catch (error) {
            logger.error('Error fetching backups:', error);
            res.status(500).json({ error: 'Failed to fetch backups' });
        }
    }

    async createBackup(req, res) {
        try {
            const { note } = req.body;
            const backup = await BackupService.createBackup(note);
            res.status(201).json(backup);
        } catch (error) {
            logger.error('Error creating backup:', error);
            res.status(500).json({ error: 'Failed to create backup' });
        }
    }

    async restoreBackup(req, res) {
        try {
            const { id } = req.params;
            await BackupService.restoreBackup(id);
            res.json({ message: 'Backup restored successfully' });
        } catch (error) {
            logger.error('Error restoring backup:', error);
            res.status(500).json({ error: 'Failed to restore backup' });
        }
    }

    async deleteBackup(req, res) {
        try {
            const { id } = req.params;
            await BackupService.deleteBackup(id);
            res.json({ message: 'Backup deleted successfully' });
        } catch (error) {
            logger.error('Error deleting backup:', error);
            res.status(500).json({ error: 'Failed to delete backup' });
        }
    }

    async downloadBackup(req, res) {
        try {
            const { id } = req.params;
            const { filePath, fileName } = await BackupService.getBackupFile(id);
            
            res.download(filePath, fileName, (err) => {
                if (err) {
                    logger.error('Error downloading backup:', err);
                    if (!res.headersSent) {
                        res.status(500).json({ error: 'Failed to download backup' });
                    }
                }
            });
        } catch (error) {
            logger.error('Error preparing backup download:', error);
            res.status(500).json({ error: 'Failed to prepare backup for download' });
        }
    }
}

module.exports = new BackupController(); 