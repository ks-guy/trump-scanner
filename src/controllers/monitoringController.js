const { monitoringService } = require('../services/monitoring');
const { logger } = require('../utils/logger');

class MonitoringController {
    // Get current system health status
    async getHealthStatus(req, res) {
        try {
            const status = await monitoringService.getHealthStatus();
            res.json(status);
        } catch (error) {
            logger.error('Error getting health status:', error);
            res.status(500).json({ error: 'Failed to get health status' });
        }
    }

    // Get current metrics
    async getCurrentMetrics(req, res) {
        try {
            const metrics = await monitoringService.collectMetrics();
            res.json(metrics);
        } catch (error) {
            logger.error('Error getting current metrics:', error);
            res.status(500).json({ error: 'Failed to get current metrics' });
        }
    }

    // Get metrics history
    async getMetricsHistory(req, res) {
        try {
            const { startTime, endTime } = req.query;
            const start = startTime ? parseInt(startTime) : Date.now() - (24 * 60 * 60 * 1000); // Default to last 24 hours
            const end = endTime ? parseInt(endTime) : Date.now();

            const metrics = await monitoringService.getMetricsHistory(start, end);
            res.json(metrics);
        } catch (error) {
            logger.error('Error getting metrics history:', error);
            res.status(500).json({ error: 'Failed to get metrics history' });
        }
    }

    // Get system metrics
    async getSystemMetrics(req, res) {
        try {
            const metrics = await monitoringService.getSystemMetrics();
            res.json(metrics);
        } catch (error) {
            logger.error('Error getting system metrics:', error);
            res.status(500).json({ error: 'Failed to get system metrics' });
        }
    }

    // Get application metrics
    async getApplicationMetrics(req, res) {
        try {
            const metrics = await monitoringService.getApplicationMetrics();
            res.json(metrics);
        } catch (error) {
            logger.error('Error getting application metrics:', error);
            res.status(500).json({ error: 'Failed to get application metrics' });
        }
    }

    // Get database metrics
    async getDatabaseMetrics(req, res) {
        try {
            const metrics = await monitoringService.getDatabaseMetrics();
            res.json(metrics);
        } catch (error) {
            logger.error('Error getting database metrics:', error);
            res.status(500).json({ error: 'Failed to get database metrics' });
        }
    }

    // Get storage metrics
    async getStorageMetrics(req, res) {
        try {
            const metrics = await monitoringService.getStorageMetrics();
            res.json(metrics);
        } catch (error) {
            logger.error('Error getting storage metrics:', error);
            res.status(500).json({ error: 'Failed to get storage metrics' });
        }
    }

    // Get recent alerts
    async getAlerts(req, res) {
        try {
            const { limit = 100 } = req.query;
            const alerts = await monitoringService.getRecentAlerts(parseInt(limit));
            res.json(alerts);
        } catch (error) {
            logger.error('Error getting alerts:', error);
            res.status(500).json({ error: 'Failed to get alerts' });
        }
    }
}

module.exports = new MonitoringController(); 