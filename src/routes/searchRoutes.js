const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');
const { rateLimit } = require('../middleware/rateLimit');
const { validateSearchQuery } = require('../middleware/validation');

// Apply authentication and rate limiting to all search routes
router.use(authenticate);
router.use(rateLimit);

// Search endpoints
router.get('/', validateSearchQuery, searchController.search);
router.get('/suggestions', searchController.getSuggestions);
router.get('/stats', searchController.getSearchStats);

module.exports = router; 