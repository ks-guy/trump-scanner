const { MetricsModel } = require('../models/metrics');
const systemMetrics = require('../services/monitoring/SystemMetricsService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('MetricsController');

// Get the latest system metrics
const getLatestMetrics = async (req, res) => {
    try {
        const metrics = await MetricsModel.findOne({
            where: { type: 'system' },
            order: [['timestamp', 'DESC']]
        });

        if (!metrics) {
            return res.status(404).json({ error: 'No metrics found' });
        }

        res.json(metrics);
    } catch (error) {
        logger.error('Error fetching latest metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
};

// Get metrics for a specific time range
const getMetricsRange = async (req, res) => {
    const { start, end, type = 'system' } = req.query;

    if (!start || !end) {
        return res.status(400).json({ error: 'Start and end dates are required' });
    }

    try {
        const metrics = await MetricsModel.findAll({
            where: {
                type,
                timestamp: {
                    [Op.between]: [new Date(start), new Date(end)]
                }
            },
            order: [['timestamp', 'ASC']]
        });

        res.json(metrics);
    } catch (error) {
        logger.error('Error fetching metrics range:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
};

// Get aggregated metrics for a time period
const getAggregatedMetrics = async (req, res) => {
    const { period = '1h', type = 'system' } = req.query;
    const endDate = new Date();
    const startDate = new Date();

    // Calculate start date based on period
    switch (period) {
        case '1h':
            startDate.setHours(endDate.getHours() - 1);
            break;
        case '24h':
            startDate.setDate(endDate.getDate() - 1);
            break;
        case '7d':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case '30d':
            startDate.setDate(endDate.getDate() - 30);
            break;
        default:
            return res.status(400).json({ error: 'Invalid period' });
    }

    try {
        const metrics = await MetricsModel.findAll({
            where: {
                type,
                timestamp: {
                    [Op.between]: [startDate, endDate]
                }
            },
            order: [['timestamp', 'ASC']]
        });

        // Aggregate metrics
        const aggregated = {
            period,
            type,
            start: startDate,
            end: endDate,
            cpu: {
                avg_load: metrics.reduce((acc, m) => acc + m.data.cpu.load_average['1m'], 0) / metrics.length
            },
            memory: {
                avg_usage: metrics.reduce((acc, m) => acc + m.data.memory.usage_percent, 0) / metrics.length
            },
            disk: {
                avg_usage: metrics.reduce((acc, m) => acc + (m.data.disk?.usage_percent || 0), 0) / metrics.length
            }
        };

        res.json(aggregated);
    } catch (error) {
        logger.error('Error fetching aggregated metrics:', error);
        res.status(500).json({ error: 'Failed to fetch metrics' });
    }
};

// Start metrics collection
const startMetricsCollection = async (req, res) => {
    try {
        await systemMetrics.start();
        res.json({ message: 'Metrics collection started' });
    } catch (error) {
        logger.error('Error starting metrics collection:', error);
        res.status(500).json({ error: 'Failed to start metrics collection' });
    }
};

// Stop metrics collection
const stopMetricsCollection = async (req, res) => {
    try {
        await systemMetrics.stop();
        res.json({ message: 'Metrics collection stopped' });
    } catch (error) {
        logger.error('Error stopping metrics collection:', error);
        res.status(500).json({ error: 'Failed to stop metrics collection' });
    }
};

module.exports = {
    getLatestMetrics,
    getMetricsRange,
    getAggregatedMetrics,
    startMetricsCollection,
    stopMetricsCollection
}; 