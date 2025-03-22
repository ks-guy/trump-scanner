const batchAnalyticsService = require('../services/media/BatchAnalyticsService');
const { logger } = require('../utils/logger');

class BatchAnalyticsController {
    async getAnalytics(req, res) {
        try {
            const { timeRange } = req.query;
            const analytics = await batchAnalyticsService.getAnalytics(timeRange);
            res.json(analytics);
        } catch (error) {
            logger.error('Error getting batch analytics:', error);
            res.status(500).json({ error: 'Failed to get batch analytics' });
        }
    }
}

module.exports = new BatchAnalyticsController(); 