const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { authenticate } = require('../middleware/auth');
const { validateBackupCreate } = require('../middleware/validation');

// Apply authentication middleware to all backup routes
router.use(authenticate);

// Backup endpoints
router.get('/', backupController.getBackups);
router.post('/', validateBackupCreate, backupController.createBackup);
router.post('/:id/restore', backupController.restoreBackup);
router.delete('/:id', backupController.deleteBackup);
router.get('/:id/download', backupController.downloadBackup);

module.exports = router; 