import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const metricsApi = axios.create({
    baseURL: `${API_BASE_URL}/metrics`,
    timeout: 5000
});

/**
 * Fetch the latest metrics
 * @returns {Promise<Object>} Latest metrics data
 */
export const fetchMetrics = async () => {
    try {
        const response = await metricsApi.get('/latest');
        return response.data;
    } catch (error) {
        console.error('Error fetching metrics:', error);
        throw error;
    }
};

/**
 * Fetch metrics for a specific time range
 * @param {Date|string} start - Start date
 * @param {Date|string} end - End date
 * @param {string} type - Metric type (default: 'system')
 * @returns {Promise<Array>} Array of metrics
 */
export const fetchMetricsRange = async (start, end, type = 'system') => {
    try {
        const response = await metricsApi.get('/range', {
            params: {
                start: new Date(start).toISOString(),
                end: new Date(end).toISOString(),
                type
            }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching metrics range:', error);
        throw error;
    }
};

/**
 * Fetch aggregated metrics for a time period
 * @param {string} period - Time period ('1h', '24h', '7d', '30d')
 * @param {string} type - Metric type (default: 'system')
 * @returns {Promise<Object>} Aggregated metrics
 */
export const fetchAggregatedMetrics = async (period = '1h', type = 'system') => {
    try {
        const response = await metricsApi.get('/aggregated', {
            params: { period, type }
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching aggregated metrics:', error);
        throw error;
    }
};

/**
 * Start metrics collection
 * @returns {Promise<Object>} Response message
 */
export const startMetricsCollection = async () => {
    try {
        const response = await metricsApi.post('/start');
        return response.data;
    } catch (error) {
        console.error('Error starting metrics collection:', error);
        throw error;
    }
};

/**
 * Stop metrics collection
 * @returns {Promise<Object>} Response message
 */
export const stopMetricsCollection = async () => {
    try {
        const response = await metricsApi.post('/stop');
        return response.data;
    } catch (error) {
        console.error('Error stopping metrics collection:', error);
        throw error;
    }
}; 