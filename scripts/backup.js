const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

function createBackup() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '../backups');
    const backupPath = path.join(backupDir, `backup-${timestamp}.zip`);

    // Create backups directory if it doesn't exist
    if (!fs.existsSync(backupDir)) {
        fs.mkdirSync(backupDir, { recursive: true });
    }

    // Create a write stream for the backup
    const output = fs.createWriteStream(backupPath);
    const archive = archiver('zip', {
        zlib: { level: 9 } // Maximum compression
    });

    output.on('close', () => {
        console.log(`Backup created successfully: ${backupPath}`);
        console.log(`Total size: ${(archive.pointer() / 1024 / 1024).toFixed(2)} MB`);
    });

    archive.on('error', (err) => {
        throw err;
    });

    // Pipe archive data to the file
    archive.pipe(output);

    // Add source files to the archive
    archive.glob('**/*', {
        cwd: path.join(__dirname, '..'),
        ignore: [
            'node_modules/**',
            'backups/**',
            '.git/**',
            'dist/**',
            'build/**',
            '*.log'
        ]
    });

    // Finalize the archive
    archive.finalize();
}

// Run backup if this script is called directly
if (require.main === module) {
    createBackup();
}

module.exports = { createBackup }; 