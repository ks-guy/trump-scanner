const batchProcessingService = require('../services/media/BatchProcessingService');
const { logger } = require('../utils/logger');

class BatchController {
    async createBatch(req, res) {
        try {
            const files = req.files;
            const options = req.body.options || {};

            if (!files || files.length === 0) {
                return res.status(400).json({ error: 'No files uploaded' });
            }

            const batch = await batchProcessingService.createBatch(files, options);
            res.status(201).json(batch);
        } catch (error) {
            logger.error('Error creating batch:', error);
            res.status(500).json({ error: 'Failed to create batch' });
        }
    }

    async getBatchStatus(req, res) {
        try {
            const { id } = req.params;
            const status = await batchProcessingService.getBatchStatus(id);
            res.json(status);
        } catch (error) {
            logger.error('Error getting batch status:', error);
            res.status(error.message === 'Batch not found' ? 404 : 500)
                .json({ error: error.message });
        }
    }

    async listBatches(req, res) {
        try {
            const { status, startDate, endDate } = req.query;
            const filters = { status, startDate, endDate };
            const batches = await batchProcessingService.listBatches(filters);
            res.json(batches);
        } catch (error) {
            logger.error('Error listing batches:', error);
            res.status(500).json({ error: 'Failed to list batches' });
        }
    }

    async cancelBatch(req, res) {
        try {
            const { id } = req.params;
            await batchProcessingService.cancelBatch(id);
            res.json({ message: 'Batch cancelled successfully' });
        } catch (error) {
            logger.error('Error cancelling batch:', error);
            res.status(500).json({ error: 'Failed to cancel batch' });
        }
    }

    async retryBatch(req, res) {
        try {
            const { id } = req.params;
            const result = await batchProcessingService.retryBatch(id);
            res.json(result);
        } catch (error) {
            logger.error('Error retrying batch:', error);
            res.status(error.message.includes('not found') ? 404 : 500)
                .json({ error: error.message });
        }
    }

    async deleteBatch(req, res) {
        try {
            const { id } = req.params;
            await batchProcessingService.deleteBatch(id);
            res.json({ message: 'Batch deleted successfully' });
        } catch (error) {
            logger.error('Error deleting batch:', error);
            res.status(500).json({ error: 'Failed to delete batch' });
        }
    }
}

module.exports = new BatchController(); 