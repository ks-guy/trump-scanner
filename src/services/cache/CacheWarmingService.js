const redisService = require('./RedisService');
const mediaSearchService = require('../search/MediaSearchService');
const { logger } = require('../../utils/logger');

class CacheWarmingService {
    constructor() {
        this.commonSearches = [
            { searchTerm: '', filters: { media_type: 'video' }, page: 1, limit: 20 },
            { searchTerm: '', filters: { media_type: 'image' }, page: 1, limit: 20 },
            { searchTerm: '', filters: { download_status: 'completed' }, page: 1, limit: 20 },
            { searchTerm: '', filters: { download_status: 'failed' }, page: 1, limit: 20 },
            { searchTerm: '', filters: {}, page: 1, limit: 20 }
        ];

        this.commonSuggestions = [
            'video',
            'image',
            'mp4',
            'jpg',
            'png',
            'completed',
            'failed',
            'pending'
        ];

        this.warmingInterval = 15 * 60 * 1000; // 15 minutes
        this.isWarming = false;
    }

    async startWarming() {
        if (this.isWarming) {
            logger.warn('Cache warming is already in progress');
            return;
        }

        this.isWarming = true;
        logger.info('Starting cache warming process');

        try {
            await this.warmSearchResults();
            await this.warmSuggestions();
            await this.warmStats();
            logger.info('Cache warming completed successfully');
        } catch (error) {
            logger.error('Error during cache warming:', error);
        } finally {
            this.isWarming = false;
        }
    }

    async warmSearchResults() {
        logger.info('Warming search results cache');
        const promises = this.commonSearches.map(async (search) => {
            try {
                const results = await mediaSearchService.search(search);
                const cacheKey = redisService.generateSearchKey(
                    search.searchTerm,
                    search.filters,
                    search.page,
                    search.limit
                );
                await redisService.set(cacheKey, results, redisService.ttl.SEARCH_RESULTS);
                logger.debug(`Warmed search cache for key: ${cacheKey}`);
            } catch (error) {
                logger.error(`Error warming search cache for ${JSON.stringify(search)}:`, error);
            }
        });

        await Promise.all(promises);
    }

    async warmSuggestions() {
        logger.info('Warming suggestions cache');
        const promises = this.commonSuggestions.map(async (term) => {
            try {
                const suggestions = await mediaSearchService.getSearchSuggestions(term);
                const cacheKey = redisService.generateSuggestionsKey(term);
                await redisService.set(cacheKey, suggestions, redisService.ttl.SUGGESTIONS);
                logger.debug(`Warmed suggestions cache for term: ${term}`);
            } catch (error) {
                logger.error(`Error warming suggestions cache for term ${term}:`, error);
            }
        });

        await Promise.all(promises);
    }

    async warmStats() {
        logger.info('Warming search stats cache');
        try {
            const stats = await mediaSearchService.getSearchStats();
            const cacheKey = redisService.generateStatsKey();
            await redisService.set(cacheKey, stats, redisService.ttl.STATS);
            logger.debug('Warmed search stats cache');
        } catch (error) {
            logger.error('Error warming search stats cache:', error);
        }
    }

    startPeriodicWarming() {
        // Initial warming
        this.startWarming();

        // Schedule periodic warming
        setInterval(() => {
            this.startWarming();
        }, this.warmingInterval);

        logger.info(`Cache warming scheduled to run every ${this.warmingInterval / 1000} seconds`);
    }

    async stopWarming() {
        this.isWarming = false;
        logger.info('Cache warming stopped');
    }
}

module.exports = new CacheWarmingService(); 