import { logger } from '../../utils/logger.js';

class CacheAnalyticsService {
    constructor() {
        this.stats = {
            hits: 0,
            misses: 0,
            errors: 0,
            compression: {
                totalOriginalSize: 0,
                totalCompressedSize: 0,
                compressedCount: 0,
                uncompressedCount: 0
            }
        };
        this.updateInterval = null;
    }

    startPeriodicUpdate() {
        this.updateInterval = setInterval(() => {
            this.logStats();
        }, 300000); // Log every 5 minutes
    }

    stopPeriodicUpdate() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    }

    trackHit() {
        this.stats.hits++;
    }

    trackMiss() {
        this.stats.misses++;
    }

    trackError() {
        this.stats.errors++;
    }

    trackCompression(originalSize, compressedSize) {
        this.stats.compression.totalOriginalSize += originalSize;
        this.stats.compression.totalCompressedSize += compressedSize;
        this.stats.compression.compressedCount++;
    }

    trackUncompressed() {
        this.stats.compression.uncompressedCount++;
    }

    logStats() {
        const hitRate = this.stats.hits / (this.stats.hits + this.stats.misses) * 100;
        const compressionRatio = this.stats.compression.totalOriginalSize > 0
            ? ((this.stats.compression.totalOriginalSize - this.stats.compression.totalCompressedSize) 
               / this.stats.compression.totalOriginalSize * 100).toFixed(2)
            : 0;

        logger.info('Cache Analytics:', {
            hitRate: `${hitRate.toFixed(2)}%`,
            hits: this.stats.hits,
            misses: this.stats.misses,
            errors: this.stats.errors,
            compression: {
                ratio: `${compressionRatio}%`,
                compressedCount: this.stats.compression.compressedCount,
                uncompressedCount: this.stats.compression.uncompressedCount
            }
        });
    }

    getStats() {
        return { ...this.stats };
    }
}

export const cacheAnalyticsService = new CacheAnalyticsService(); 