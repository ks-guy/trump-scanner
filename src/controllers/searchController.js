const { MediaSearchService } = require('../services/search');
const { logger } = require('../utils/logger');

class SearchController {
    async search(req, res) {
        try {
            const { q, media_type, sentiment, confidence, date_range } = req.query;
            const filters = {
                media_type,
                sentiment,
                confidence: confidence ? confidence.split(',').map(Number) : undefined,
                date_range: date_range ? date_range.split(',').map(d => new Date(d)) : undefined
            };

            const results = await MediaSearchService.search(q, filters);
            res.json(results);
        } catch (error) {
            logger.error('Search error:', error);
            res.status(500).json({ error: 'Failed to perform search' });
        }
    }

    async getSavedSearches(req, res) {
        try {
            const userId = req.user.id;
            const searches = await MediaSearchService.getSavedSearches(userId);
            res.json(searches);
        } catch (error) {
            logger.error('Error getting saved searches:', error);
            res.status(500).json({ error: 'Failed to get saved searches' });
        }
    }

    async saveSearch(req, res) {
        try {
            const userId = req.user.id;
            const { query, filters } = req.body;
            
            const savedSearch = await MediaSearchService.saveSearch(userId, query, filters);
            res.json(savedSearch);
        } catch (error) {
            logger.error('Error saving search:', error);
            res.status(500).json({ error: 'Failed to save search' });
        }
    }

    async deleteSavedSearch(req, res) {
        try {
            const userId = req.user.id;
            const searchId = req.params.id;
            
            await MediaSearchService.deleteSavedSearch(userId, searchId);
            res.json({ message: 'Search deleted successfully' });
        } catch (error) {
            logger.error('Error deleting saved search:', error);
            res.status(500).json({ error: 'Failed to delete saved search' });
        }
    }
}

module.exports = new SearchController(); 