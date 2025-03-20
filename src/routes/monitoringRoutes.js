const express = require('express');
const router = express.Router();
const monitoringController = require('../controllers/monitoringController');
const { authenticate } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');

// Apply authentication and rate limiting to all routes
router.use(authenticate);
router.use(rateLimit);

// Health check endpoint
router.get('/health', monitoringController.getHealthStatus);

// Current metrics endpoint
router.get('/metrics/current', monitoringController.getCurrentMetrics);

// Metrics history endpoint
router.get('/metrics/history', monitoringController.getMetricsHistory);

// Individual metrics endpoints
router.get('/metrics/system', monitoringController.getSystemMetrics);
router.get('/metrics/application', monitoringController.getApplicationMetrics);
router.get('/metrics/database', monitoringController.getDatabaseMetrics);
router.get('/metrics/storage', monitoringController.getStorageMetrics);

module.exports = router; 