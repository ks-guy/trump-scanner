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
        this.maxBackupAge = 30 * 24 * 60 * 60 * 1000; // 30 days in milliseconds
    }

    async ensureBackupDir() {
        try {
            await fs.access(this.backupDir);
            // Check directory permissions
            const stats = await fs.stat(this.backupDir);
            if ((stats.mode & 0o777) !== 0o700) {
                logger.warn('Backup directory has incorrect permissions. Setting to 700...');
                await fs.chmod(this.backupDir, 0o700);
            }
        } catch (error) {
            await fs.mkdir(this.backupDir, { recursive: true, mode: 0o700 });
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
            // Create a write stream with secure permissions
            const output = createWriteStream(filePath, { mode: 0o600 });
            const archive = archiver('zip', {
                zlib: { level: 9 } // Maximum compression
            });

            // Pipe archive data to the file
            archive.pipe(output);

            // Add database dump
            const dump = await this.createDatabaseDump();
            archive.append(dump, { name: 'database.sql' });

            // Add configuration files (excluding sensitive data)
            const configFiles = [
                'package.json',
                'src/config/sources.js',
                'src/database/schema.sql'
            ];

            for (const file of configFiles) {
                try {
                    const filePath = path.join(process.cwd(), file);
                    const stats = await fs.stat(filePath);
                    if (stats.isFile()) {
                        archive.file(filePath, { name: file });
                    }
                } catch (error) {
                    logger.warn(`Could not add ${file} to backup:`, error);
                }
            }

            // Finalize the archive
            await archive.finalize();
            await new Promise((resolve, reject) => {
                output.on('close', resolve);
                output.on('error', reject);
            });

            // Set secure file permissions
            await fs.chmod(filePath, 0o600);

            // Record backup in database
            const fileStats = await fs.stat(filePath);
            await db.query(
                'INSERT INTO backups (id, file_path, size, note, created_at) VALUES (?, ?, ?, ?, NOW())',
                [backupId, filePath, fileStats.size, note]
            );

            // Clean up old backups
            await this.cleanupOldBackups();

            return backupId;
        } catch (error) {
            logger.error('Error creating backup:', error);
            // Clean up failed backup file if it exists
            try {
                await fs.unlink(filePath);
            } catch (unlinkError) {
                logger.error('Error cleaning up failed backup file:', unlinkError);
            }
            throw new Error('Failed to create backup');
        }
    }

    async cleanupOldBackups() {
        try {
            const cutoffDate = new Date(Date.now() - this.maxBackupAge);
            const oldBackups = await db.query(
                'SELECT id, file_path FROM backups WHERE created_at < ?',
                [cutoffDate]
            );

            for (const backup of oldBackups) {
                try {
                    await fs.unlink(backup.file_path);
                    await db.query('DELETE FROM backups WHERE id = ?', [backup.id]);
                    logger.info(`Cleaned up old backup: ${backup.id}`);
                } catch (error) {
                    logger.error(`Error cleaning up backup ${backup.id}:`, error);
                }
            }
        } catch (error) {
            logger.error('Error cleaning up old backups:', error);
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