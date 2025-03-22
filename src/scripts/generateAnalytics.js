const TruthSocialAnalytics = require('../services/analytics/TruthSocialAnalytics');
const VisualizationService = require('../services/analytics/VisualizationService');
const { logger } = require('../utils/logger');

async function generateAnalytics() {
    try {
        const analytics = new TruthSocialAnalytics();
        const visualizationService = new VisualizationService();
        
        // Generate reports for different time periods
        const periods = [
            { name: 'Last 7 days', days: 7 },
            { name: 'Last 30 days', days: 30 },
            { name: 'Last 90 days', days: 90 }
        ];

        for (const period of periods) {
            logger.info(`Generating ${period.name} analytics report...`);
            
            const endDate = new Date();
            const startDate = new Date(endDate - period.days * 24 * 60 * 60 * 1000);

            const report = await analytics.generateReport({
                startDate,
                endDate,
                includeEngagement: true,
                includeTrends: true
            });

            logger.info(`${period.name} report generated successfully`);
            logger.info(`Total posts: ${report.summary.totalPosts}`);
            logger.info(`Average engagement: ${report.summary.averageEngagement.toFixed(2)}`);
            logger.info(`Posts per day: ${report.summary.postsPerDay}`);

            // Generate visualizations for the report
            logger.info('Generating visualizations...');
            await visualizationService.generateVisualizations(report);
            logger.info('Visualizations generated successfully');
        }

    } catch (error) {
        logger.error('Error generating analytics:', error);
        process.exit(1);
    }
}

// Run analytics if script is executed directly
if (require.main === module) {
    generateAnalytics();
}

module.exports = generateAnalytics; 