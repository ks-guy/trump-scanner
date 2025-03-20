const express = require('express');
const router = express.Router();
const mediaController = require('../controllers/mediaController');
const { validateMediaId } = require('../middleware/validation');
const { authenticate } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(rateLimit);

// Get all media content with pagination and filtering
router.get('/', mediaController.getMediaContent);

// Get media content by ID
router.get('/:id', validateMediaId, mediaController.getMediaById);

// Stream media content
router.get('/:id/stream', validateMediaId, mediaController.streamMedia);

// Get media thumbnail
router.get('/:id/thumbnail', validateMediaId, mediaController.getThumbnail);

// Get media processing status
router.get('/:id/status', validateMediaId, mediaController.getProcessingStatus);

// Retry failed media processing
router.post('/:id/retry', validateMediaId, mediaController.retryProcessing);

// Delete media content
router.delete('/:id', validateMediaId, mediaController.deleteMedia);

module.exports = router; 