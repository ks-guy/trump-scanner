const express = require('express');
const router = express.Router();
const batchAnalyticsController = require('../controllers/batchAnalyticsController');
const { authenticate } = require('../middleware/auth');

// Apply authentication middleware
router.use(authenticate);

// Analytics endpoints
router.get('/', batchAnalyticsController.getAnalytics);

module.exports = router; 