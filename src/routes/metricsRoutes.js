const express = require('express');
const router = express.Router();
const metricsController = require('../controllers/metricsController');
const { authenticate } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60 // 60 requests per minute
}));

// Get latest metrics
router.get('/latest', metricsController.getLatestMetrics);

// Get metrics for a specific time range
router.get('/range', metricsController.getMetricsRange);

// Get aggregated metrics
router.get('/aggregated', metricsController.getAggregatedMetrics);

// Start metrics collection
router.post('/start', metricsController.startMetricsCollection);

// Stop metrics collection
router.post('/stop', metricsController.stopMetricsCollection);

module.exports = router; 