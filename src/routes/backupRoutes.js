const express = require('express');
const router = express.Router();
const backupController = require('../controllers/backupController');
const { authenticate } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(rateLimit);

// Create a new backup
router.post('/', backupController.createBackup);

// List all backups
router.get('/', backupController.listBackups);

// Download a backup
router.get('/:backupId/download', backupController.downloadBackup);

// Restore from a backup
router.post('/:backupId/restore', backupController.restoreBackup);

// Delete a backup
router.delete('/:backupId', backupController.deleteBackup);

module.exports = router; 