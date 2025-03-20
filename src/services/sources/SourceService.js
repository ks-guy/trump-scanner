const { createLogger } = require('../../utils/logger');
const { Source, SourceCategory, SourceVerificationRule, SourceVerificationHistory } = require('../../models/sources');
const { Article } = require('../../models/articles');

class SourceService {
    constructor() {
        this.logger = createLogger('SourceService');
    }

    async addSource(sourceData) {
        try {
            // Validate source data
            await this.validateSource(sourceData);

            // Create source with verification level
            const source = await Source.create({
                name: sourceData.name,
                url: sourceData.url,
                category_id: sourceData.category_id,
                verification_level: sourceData.verification_level || 'secondary',
                region: sourceData.region,
                is_official_source: sourceData.is_official_source || false,
                requires_verification: sourceData.requires_verification || true,
                rate_limit_per_hour: sourceData.rate_limit_per_hour || 100
            });

            // Create verification rules if specified
            if (sourceData.verification_rules) {
                await this.setupVerificationRules(source.id, sourceData.verification_rules);
            }

            this.logger.info(`Added new source: ${source.name}`);
            return source;
        } catch (error) {
            this.logger.error(`Error adding source: ${error.message}`);
            throw error;
        }
    }

    async validateSource(sourceData) {
        // Check if URL is valid
        try {
            new URL(sourceData.url);
        } catch (error) {
            throw new Error('Invalid source URL');
        }

        // Check if category exists
        const category = await SourceCategory.findByPk(sourceData.category_id);
        if (!category) {
            throw new Error('Invalid source category');
        }

        // Check if source already exists
        const existingSource = await Source.findOne({
            where: { url: sourceData.url }
        });
        if (existingSource) {
            throw new Error('Source URL already exists');
        }
    }

    async setupVerificationRules(sourceId, rules) {
        try {
            await SourceVerificationRule.create({
                source_id: sourceId,
                verification_type: rules.type || 'hybrid',
                verification_frequency: rules.frequency || 'weekly',
                required_checks: rules.checks || []
            });
        } catch (error) {
            this.logger.error(`Error setting up verification rules: ${error.message}`);
            throw error;
        }
    }

    async verifySource(sourceId) {
        try {
            const source = await Source.findByPk(sourceId);
            if (!source) {
                throw new Error('Source not found');
            }

            const rules = await SourceVerificationRule.findOne({
                where: { source_id: sourceId }
            });

            // Perform verification based on rules
            const verificationResult = await this.performVerification(source, rules);

            // Record verification history
            await SourceVerificationHistory.create({
                source_id: sourceId,
                verification_status: verificationResult.status,
                verification_notes: verificationResult.notes,
                verified_by: 'system'
            });

            return verificationResult;
        } catch (error) {
            this.logger.error(`Error verifying source: ${error.message}`);
            throw error;
        }
    }

    async performVerification(source, rules) {
        // Implement verification logic based on rules
        // This could include:
        // 1. Checking if the source is accessible
        // 2. Validating content structure
        // 3. Checking for recent updates
        // 4. Verifying official status
        // 5. Checking for quote accuracy

        return {
            status: 'passed',
            notes: 'Source verified successfully'
        };
    }

    async getPrimarySources() {
        try {
            return await Source.findAll({
                where: {
                    verification_level: 'primary',
                    is_official_source: true
                },
                include: [{
                    model: SourceCategory,
                    attributes: ['name', 'description']
                }]
            });
        } catch (error) {
            this.logger.error(`Error getting primary sources: ${error.message}`);
            throw error;
        }
    }

    async getSourcesByRegion(region) {
        try {
            return await Source.findAll({
                where: { region },
                include: [{
                    model: SourceCategory,
                    attributes: ['name', 'description']
                }]
            });
        } catch (error) {
            this.logger.error(`Error getting sources by region: ${error.message}`);
            throw error;
        }
    }

    async getSourceStats(sourceId) {
        try {
            const articleCount = await Article.count({
                where: { source_id: sourceId }
            });

            const recentArticles = await Article.count({
                where: {
                    source_id: sourceId,
                    published_date: {
                        [Op.gte]: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
                    }
                }
            });

            const verificationHistory = await SourceVerificationHistory.findAll({
                where: { source_id: sourceId },
                order: [['verification_date', 'DESC']],
                limit: 5
            });

            return {
                total_articles: articleCount,
                recent_articles: recentArticles,
                verification_history: verificationHistory
            };
        } catch (error) {
            this.logger.error(`Error getting source stats: ${error.message}`);
            throw error;
        }
    }

    async updateSourceStatus(sourceId, isActive) {
        try {
            const source = await Source.findByPk(sourceId);
            if (!source) {
                throw new Error('Source not found');
            }

            await source.update({ is_active: isActive });
            this.logger.info(`Updated source ${sourceId} status to ${isActive}`);
        } catch (error) {
            this.logger.error(`Error updating source status: ${error.message}`);
            throw error;
        }
    }
}

module.exports = SourceService; 