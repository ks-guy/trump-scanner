const redisService = require('./RedisService');
const { logger } = require('../../utils/logger');

class CacheVersioningService {
    constructor() {
        this.versionKey = 'cache:version';
        this.currentVersion = {
            search: 1,
            suggestions: 1,
            stats: 1,
            media: 1
        };
        this.versionPrefixes = {
            search: 'v1:search:',
            suggestions: 'v1:suggestions:',
            stats: 'v1:stats:',
            media: 'v1:media:'
        };
    }

    async initialize() {
        try {
            const storedVersion = await redisService.get(this.versionKey);
            if (storedVersion) {
                this.currentVersion = storedVersion;
                logger.info('Loaded cache versions:', this.currentVersion);
            } else {
                await this.saveVersion();
                logger.info('Initialized cache versions:', this.currentVersion);
            }
        } catch (error) {
            logger.error('Error initializing cache versions:', error);
        }
    }

    async saveVersion() {
        try {
            await redisService.set(this.versionKey, this.currentVersion);
        } catch (error) {
            logger.error('Error saving cache version:', error);
        }
    }

    async incrementVersion(type) {
        if (this.currentVersion[type]) {
            this.currentVersion[type]++;
            await this.saveVersion();
            logger.info(`Incremented ${type} cache version to ${this.currentVersion[type]}`);
        }
    }

    getVersionedKey(type, key) {
        const prefix = this.versionPrefixes[type];
        if (!prefix) {
            logger.warn(`No version prefix found for type: ${type}`);
            return key;
        }
        return `${prefix}${key}`;
    }

    async invalidateByType(type) {
        try {
            const prefix = this.versionPrefixes[type];
            if (!prefix) {
                logger.warn(`No version prefix found for type: ${type}`);
                return;
            }

            const keys = await redisService.client.keys(`${prefix}*`);
            if (keys.length > 0) {
                await redisService.client.del(keys);
                logger.info(`Invalidated ${keys.length} cache entries for type: ${type}`);
            }

            await this.incrementVersion(type);
        } catch (error) {
            logger.error(`Error invalidating cache for type ${type}:`, error);
        }
    }

    async invalidateAll() {
        try {
            for (const type of Object.keys(this.versionPrefixes)) {
                await this.invalidateByType(type);
            }
            logger.info('Invalidated all versioned cache entries');
        } catch (error) {
            logger.error('Error invalidating all cache versions:', error);
        }
    }

    getCurrentVersion(type) {
        return this.currentVersion[type];
    }

    async migrateCache(oldVersion, newVersion, type) {
        try {
            const oldPrefix = `v${oldVersion}:${type}:`;
            const newPrefix = `v${newVersion}:${type}:`;

            const keys = await redisService.client.keys(`${oldPrefix}*`);
            for (const key of keys) {
                const value = await redisService.client.get(key);
                if (value) {
                    const newKey = key.replace(oldPrefix, newPrefix);
                    await redisService.client.set(newKey, value);
                    await redisService.client.del(key);
                }
            }

            logger.info(`Migrated ${keys.length} cache entries from v${oldVersion} to v${newVersion} for type: ${type}`);
        } catch (error) {
            logger.error(`Error migrating cache from v${oldVersion} to v${newVersion} for type: ${type}:`, error);
        }
    }
}

module.exports = new CacheVersioningService(); 