const fs = require('fs').promises;
const path = require('path');
const { default: ora } = require('ora');
const Quote = require('../models/Quote');
const logger = require('../utils/logger');

async function createBackup() {
    const spinner = ora('Creating backup...').start();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../../backups', timestamp);

    try {
        // Create backup directory
        await fs.mkdir(backupDir, { recursive: true });
        spinner.text = 'Created backup directory';

        // Backup database
        spinner.text = 'Backing up quotes...';
        const quotes = await Quote.query();
        await fs.writeFile(
            path.join(backupDir, 'quotes.json'),
            JSON.stringify(quotes, null, 2)
        );

        // Backup configuration
        spinner.text = 'Backing up configuration...';
        const config = require('../config/sources');
        await fs.writeFile(
            path.join(backupDir, 'config.json'),
            JSON.stringify(config, null, 2)
        );

        // Backup statistics
        spinner.text = 'Backing up statistics...';
        const stats = await Quote.getStats();
        await fs.writeFile(
            path.join(backupDir, 'stats.json'),
            JSON.stringify(stats, null, 2)
        );

        // Create backup info
        const backupInfo = {
            timestamp,
            quotesCount: quotes.length,
            configVersion: config.version || '1.0.0',
            stats
        };

        await fs.writeFile(
            path.join(backupDir, 'backup-info.json'),
            JSON.stringify(backupInfo, null, 2)
        );

        spinner.succeed(`Backup completed successfully at ${backupDir}`);
        logger.info('Backup details:', backupInfo);

    } catch (error) {
        spinner.fail(`Backup failed: ${error.message}`);
        logger.error('Backup failed:', error);
        process.exitCode = 1;
    }
}

// Handle interruptions
process.on('SIGINT', () => {
    logger.info('Received SIGINT. Cleaning up...');
    process.exit(0);
});

// Create backup
createBackup(); 