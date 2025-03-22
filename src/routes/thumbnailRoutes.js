const express = require('express');
const router = express.Router();
const thumbnailController = require('../controllers/thumbnailController');
const { authenticate } = require('../middleware/auth');
const { validateThumbnailOptions } = require('../middleware/validation');

// Apply authentication middleware to all thumbnail routes
router.use(authenticate);

// Generate thumbnails for a video
router.post(
    '/:videoId/generate',
    validateThumbnailOptions,
    thumbnailController.generateThumbnails
);

// Get all thumbnails for a video
router.get(
    '/:videoId',
    thumbnailController.getThumbnails
);

// Delete a specific thumbnail
router.delete(
    '/:videoId/:thumbnailId',
    thumbnailController.deleteThumbnail
);

// Update/process a specific thumbnail
router.put(
    '/:videoId/:thumbnailId',
    validateThumbnailOptions,
    thumbnailController.updateThumbnail
);

module.exports = router; 