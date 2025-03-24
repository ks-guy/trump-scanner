import Redis from 'ioredis';
import { logger } from '../../utils/logger.js';
import { compressionService } from './CompressionService.js';
import { cacheAnalyticsService } from './CacheAnalyticsService.js';

class RedisService {
    constructor() {
        this.client = new Redis({
            host: process.env.REDIS_HOST || 'localhost',
            port: process.env.REDIS_PORT || 6379,
            password: process.env.REDIS_PASSWORD,
            retryStrategy: (times) => {
                const delay = Math.min(times * 50, 2000);
                return delay;
            }
        });

        this.client.on('error', (error) => {
            logger.error('Redis connection error:', error);
            cacheAnalyticsService.trackError();
        });

        this.client.on('connect', () => {
            logger.info('Successfully connected to Redis');
        });

        // Default TTL values in seconds
        this.ttl = {
            SEARCH_RESULTS: 300,    // 5 minutes
            SUGGESTIONS: 60,        // 1 minute
            STATS: 1800,           // 30 minutes
        };

        // Compression settings
        this.compressionThresholds = {
            SEARCH_RESULTS: 1024 * 10,  // 10KB
            SUGGESTIONS: 1024 * 5,      // 5KB
            STATS: 1024 * 2,           // 2KB
        };

        // Start analytics service
        cacheAnalyticsService.startPeriodicUpdate();
    }

    async get(key) {
        try {
            const data = await this.client.get(key);
            if (!data) {
                await cacheAnalyticsService.trackMiss();
                return null;
            }

            await cacheAnalyticsService.trackHit();

            // Check if data is compressed
            const isCompressed = data.startsWith('compressed:');
            const actualData = isCompressed ? data.slice(11) : data;

            return await compressionService.decompress(actualData, isCompressed);
        } catch (error) {
            logger.error(`Error getting cache for key ${key}:`, error);
            await cacheAnalyticsService.trackError();
            return null;
        }
    }

    async set(key, value, ttl = null) {
        try {
            // Determine compression threshold based on key type
            const threshold = this.getCompressionThreshold(key);
            compressionService.setCompressionThreshold(threshold);

            // Compress data if needed
            const { data, isCompressed } = await compressionService.compress(value);
            const finalData = isCompressed ? `compressed:${data}` : data;

            if (ttl) {
                await this.client.setex(key, ttl, finalData);
            } else {
                await this.client.set(key, finalData);
            }

            // Track compression stats
            if (isCompressed) {
                const originalSize = JSON.stringify(value).length;
                const compressedSize = data.length;
                await cacheAnalyticsService.trackCompression(originalSize, compressedSize);
                const compressionRatio = ((originalSize - compressedSize) / originalSize * 100).toFixed(2);
                logger.debug(`Compressed cache entry ${key}: ${compressionRatio}% reduction`);
            } else {
                await cacheAnalyticsService.trackUncompressed();
            }

            return true;
        } catch (error) {
            logger.error(`Error setting cache for key ${key}:`, error);
            await cacheAnalyticsService.trackError();
            return false;
        }
    }

    async del(key) {
        try {
            await this.client.del(key);
            return true;
        } catch (error) {
            logger.error(`Error deleting cache for key ${key}:`, error);
            return false;
        }
    }

    generateSearchKey(query, filters, page, limit) {
        const filterString = JSON.stringify(filters);
        return `search:${query}:${filterString}:${page}:${limit}`;
    }

    generateSuggestionsKey(query) {
        return `suggestions:${query}`;
    }

    generateStatsKey() {
        return 'search:stats';
    }

    getCompressionThreshold(key) {
        if (key.startsWith('search:')) {
            return this.compressionThresholds.SEARCH_RESULTS;
        } else if (key.startsWith('suggestions:')) {
            return this.compressionThresholds.SUGGESTIONS;
        } else if (key === 'search:stats') {
            return this.compressionThresholds.STATS;
        }
        return 1024; // Default 1KB threshold
    }

    async invalidateSearchCache() {
        try {
            const keys = await this.client.keys('search:*');
            if (keys.length > 0) {
                await this.client.del(keys);
                logger.info(`Invalidated ${keys.length} search cache entries`);
            }
        } catch (error) {
            logger.error('Error invalidating search cache:', error);
        }
    }

    async invalidateSuggestionsCache() {
        try {
            const keys = await this.client.keys('suggestions:*');
            if (keys.length > 0) {
                await this.client.del(keys);
                logger.info(`Invalidated ${keys.length} suggestions cache entries`);
            }
        } catch (error) {
            logger.error('Error invalidating suggestions cache:', error);
        }
    }
}

export const redisService = new RedisService(); 