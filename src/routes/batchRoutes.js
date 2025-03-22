const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batchController');
const { authenticate } = require('../middleware/auth');
const { validateBatchCreate } = require('../middleware/validation');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

// Apply authentication middleware to all batch routes
router.use(authenticate);

// Batch endpoints
router.post('/', upload.array('files', 50), validateBatchCreate, batchController.createBatch);
router.get('/', batchController.listBatches);
router.get('/:id', batchController.getBatchStatus);
router.post('/:id/cancel', batchController.cancelBatch);
router.post('/:id/retry', batchController.retryBatch);
router.delete('/:id', batchController.deleteBatch);

module.exports = router; 