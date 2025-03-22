const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');
const { validateSearch, validateSavedSearch } = require('../middleware/validation');

// Apply authentication middleware to all search routes
router.use(authenticate);

// Search endpoints
router.get('/', validateSearch, searchController.search);

// Saved searches endpoints
router.get('/saved', searchController.getSavedSearches);
router.post('/saved', validateSavedSearch, searchController.saveSearch);
router.delete('/saved/:id', searchController.deleteSavedSearch);

module.exports = router; 