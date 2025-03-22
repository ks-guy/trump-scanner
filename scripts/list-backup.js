const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const yauzl = require('yauzl');

const backupFile = path.join(__dirname, '../backups/backup-2025-03-20T15-36-16-307Z.zip');

yauzl.open(backupFile, {lazyEntries: true}, function(err, zipfile) {
    if (err) throw err;
    
    console.log('\nContents of backup:');
    console.log('==================\n');
    
    zipfile.readEntry();
    zipfile.on('entry', function(entry) {
        console.log(`${entry.fileName} (${(entry.uncompressedSize / 1024).toFixed(2)} KB)`);
        zipfile.readEntry();
    });
    
    zipfile.on('end', function() {
        console.log('\n==================');
    });
}); 