const path = require('path');
const fs = require('fs').promises;
const archiver = require('archiver');
const { createReadStream, createWriteStream } = require('fs');
const { logger } = require('../utils/logger');
const { db } = require('../config/database');
const { v4: uuidv4 } = require('uuid');

class BackupService {
    constructor() {
        this.backupDir = process.env.BACKUP_DIR || path.join(process.cwd(), 'backups');
        this.ensureBackupDir();
    }

    async ensureBackupDir() {
        try {
            await fs.access(this.backupDir);
        } catch (error) {
            await fs.mkdir(this.backupDir, { recursive: true });
        }
    }

    async listBackups() {
        try {
            const backups = await db.query(
                'SELECT id, created_at, note, size FROM backups ORDER BY created_at DESC'
            );
            return backups;
        } catch (error) {
            logger.error('Error listing backups:', error);
            throw new Error('Failed to list backups');
        }
    }

    async createBackup(note) {
        const backupId = uuidv4();
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const fileName = `backup_${timestamp}.zip`;
        const filePath = path.join(this.backupDir, fileName);

        try {
            // Create a write stream
            const output = createWriteStream(filePath);
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            // Pipe archive data to the file
            archive.pipe(output);

            // Add database dump
            const dbDump = await this.createDatabaseDump();
            archive.append(dbDump, { name: 'database.sql' });

            // Add media files
            const mediaDir = process.env.MEDIA_DIR || path.join(process.cwd(), 'media');
            archive.directory(mediaDir, 'media');

            // Finalize the archive
            await archive.finalize();

            // Get the size of the backup file
            const stats = await fs.stat(filePath);

            // Save backup metadata to database
            const backup = await db.query(
                'INSERT INTO backups (id, file_path, note, size) VALUES (?, ?, ?, ?) RETURNING *',
                [backupId, filePath, note, stats.size]
            );

            return backup;
        } catch (error) {
            logger.error('Error creating backup:', error);
            throw new Error('Failed to create backup');
        }
    }

    async restoreBackup(id) {
        try {
            const backup = await db.query('SELECT file_path FROM backups WHERE id = ?', [id]);
            if (!backup) {
                throw new Error('Backup not found');
            }

            // Extract the backup
            await this.extractBackup(backup.file_path);

            // Restore database
            await this.restoreDatabase(path.join(this.backupDir, 'temp', 'database.sql'));

            // Restore media files
            const mediaDir = process.env.MEDIA_DIR || path.join(process.cwd(), 'media');
            await fs.rm(mediaDir, { recursive: true, force: true });
            await fs.rename(
                path.join(this.backupDir, 'temp', 'media'),
                mediaDir
            );

            // Clean up temp directory
            await fs.rm(path.join(this.backupDir, 'temp'), { recursive: true });

            return true;
        } catch (error) {
            logger.error('Error restoring backup:', error);
            throw new Error('Failed to restore backup');
        }
    }

    async deleteBackup(id) {
        try {
            const backup = await db.query('SELECT file_path FROM backups WHERE id = ?', [id]);
            if (!backup) {
                throw new Error('Backup not found');
            }

            // Delete the backup file
            await fs.unlink(backup.file_path);

            // Delete from database
            await db.query('DELETE FROM backups WHERE id = ?', [id]);

            return true;
        } catch (error) {
            logger.error('Error deleting backup:', error);
            throw new Error('Failed to delete backup');
        }
    }

    async getBackupFile(id) {
        try {
            const backup = await db.query('SELECT file_path FROM backups WHERE id = ?', [id]);
            if (!backup) {
                throw new Error('Backup not found');
            }

            const fileName = path.basename(backup.file_path);
            return { filePath: backup.file_path, fileName };
        } catch (error) {
            logger.error('Error getting backup file:', error);
            throw new Error('Failed to get backup file');
        }
    }

    async createDatabaseDump() {
        // Implementation depends on your database type
        // This is a placeholder for MySQL dump
        try {
            const { execSync } = require('child_process');
            const dumpFile = path.join(this.backupDir, 'temp_dump.sql');
            
            // Use environment variables for credentials
            const dbUser = process.env.DB_USER || 'dummy_user';
            const dbPassword = process.env.DB_PASSWORD || 'dummy_password';
            const dbName = process.env.DB_NAME || 'trump_scanner';
            
            // Create a temporary credentials file
            const credentialsFile = path.join(this.backupDir, '.my.cnf');
            await fs.writeFile(credentialsFile, `[client]\nuser=${dbUser}\npassword=${dbPassword}`);
            
            try {
                execSync(`mysqldump --defaults-file=${credentialsFile} ${dbName} > ${dumpFile}`);
                const dump = await fs.readFile(dumpFile);
                await fs.unlink(dumpFile);
                return dump;
            } finally {
                // Clean up credentials file
                await fs.unlink(credentialsFile);
            }
        } catch (error) {
            logger.error('Error creating database dump:', error);
            throw new Error('Failed to create database dump');
        }
    }

    async extractBackup(filePath) {
        try {
            const extract = require('extract-zip');
            const tempDir = path.join(this.backupDir, 'temp');
            
            await fs.mkdir(tempDir, { recursive: true });
            await extract(filePath, { dir: tempDir });
            
            return tempDir;
        } catch (error) {
            logger.error('Error extracting backup:', error);
            throw new Error('Failed to extract backup');
        }
    }

    async restoreDatabase(dumpFile) {
        // Implementation depends on your database type
        // This is a placeholder for MySQL restore
        try {
            const { execSync } = require('child_process');
            
            // Use environment variables for credentials
            const dbUser = process.env.DB_USER || 'dummy_user';
            const dbPassword = process.env.DB_PASSWORD || 'dummy_password';
            const dbName = process.env.DB_NAME || 'trump_scanner';
            
            // Create a temporary credentials file
            const credentialsFile = path.join(this.backupDir, '.my.cnf');
            await fs.writeFile(credentialsFile, `[client]\nuser=${dbUser}\npassword=${dbPassword}`);
            
            try {
                execSync(`mysql --defaults-file=${credentialsFile} ${dbName} < ${dumpFile}`);
                return true;
            } finally {
                // Clean up credentials file
                await fs.unlink(credentialsFile);
            }
        } catch (error) {
            logger.error('Error restoring database:', error);
            throw new Error('Failed to restore database');
        }
    }
}

module.exports = {
    BackupService: new BackupService()
}; 