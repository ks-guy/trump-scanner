const axios = require('axios');
const { logger } = require('../../utils/logger');
const { sleep } = require('../../utils/helpers');

class SourceManager {
    constructor() {
        this.sources = new Map();
        this.activeSources = new Set();
        this.validationInterval = parseInt(process.env.SOURCE_VALIDATION_INTERVAL) || 3600000; // 1 hour
    }

    async initialize() {
        try {
            // Load sources from database or configuration
            await this.loadSources();
            
            // Start source validation
            this.startValidation();
            
            logger.info('Source manager initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize source manager:', error);
            throw error;
        }
    }

    async loadSources() {
        // TODO: Load sources from database
        // For now, using sample sources
        const sampleSources = [
            {
                id: 'twitter',
                name: 'Twitter',
                type: 'text',
                url: 'https://twitter.com/realDonaldTrump',
                active: true,
                lastChecked: new Date(),
                checkInterval: 300000 // 5 minutes
            },
            {
                id: 'truth_social',
                name: 'Truth Social',
                type: 'text',
                url: 'https://truthsocial.com/@realDonaldTrump',
                active: true,
                lastChecked: new Date(),
                checkInterval: 300000 // 5 minutes
            }
        ];

        for (const source of sampleSources) {
            this.sources.set(source.id, source);
            if (source.active) {
                this.activeSources.add(source.id);
            }
        }
    }

    startValidation() {
        setInterval(async () => {
            await this.validateSources();
        }, this.validationInterval);
    }

    async validateSources() {
        for (const [sourceId, source] of this.sources) {
            try {
                const isValid = await this.validateSource(source);
                if (isValid) {
                    this.activeSources.add(sourceId);
                    source.lastChecked = new Date();
                } else {
                    this.activeSources.delete(sourceId);
                    logger.warn(`Source ${sourceId} is no longer valid`);
                }
            } catch (error) {
                logger.error(`Error validating source ${sourceId}:`, error);
                this.activeSources.delete(sourceId);
            }
        }
    }

    async validateSource(source) {
        try {
            // Check if source is due for validation
            const timeSinceLastCheck = Date.now() - source.lastChecked.getTime();
            if (timeSinceLastCheck < source.checkInterval) {
                return this.activeSources.has(source.id);
            }

            // Validate source accessibility
            const response = await axios.head(source.url, {
                timeout: 5000,
                validateStatus: status => status < 400
            });

            return response.status < 400;
        } catch (error) {
            logger.error(`Validation failed for source ${source.id}:`, error);
            return false;
        }
    }

    async getActiveSources() {
        const activeSources = [];
        for (const sourceId of this.activeSources) {
            const source = this.sources.get(sourceId);
            if (source) {
                activeSources.push(source);
            }
        }
        return activeSources;
    }

    async addSource(source) {
        try {
            const isValid = await this.validateSource(source);
            if (isValid) {
                this.sources.set(source.id, source);
                this.activeSources.add(source.id);
                logger.info(`Added new source: ${source.id}`);
                return true;
            }
            return false;
        } catch (error) {
            logger.error(`Error adding source ${source.id}:`, error);
            return false;
        }
    }

    async removeSource(sourceId) {
        try {
            this.sources.delete(sourceId);
            this.activeSources.delete(sourceId);
            logger.info(`Removed source: ${sourceId}`);
            return true;
        } catch (error) {
            logger.error(`Error removing source ${sourceId}:`, error);
            return false;
        }
    }

    async updateSource(sourceId, updates) {
        try {
            const source = this.sources.get(sourceId);
            if (source) {
                const updatedSource = { ...source, ...updates };
                const isValid = await this.validateSource(updatedSource);
                if (isValid) {
                    this.sources.set(sourceId, updatedSource);
                    this.activeSources.add(sourceId);
                    logger.info(`Updated source: ${sourceId}`);
                    return true;
                }
            }
            return false;
        } catch (error) {
            logger.error(`Error updating source ${sourceId}:`, error);
            return false;
        }
    }
}

module.exports = { SourceManager }; 