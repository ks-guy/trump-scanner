import TruthSocialAnalytics from '../services/analytics/TruthSocialAnalytics.js';
import VisualizationService from '../services/analytics/VisualizationService.js';
import fs from 'fs/promises';
import path from 'path';

async function generateAnalytics() {
    try {
        console.log('Starting analytics generation...');
        
        // Create reports directory if it doesn't exist
        const reportsDir = path.join(process.cwd(), 'reports');
        await fs.mkdir(reportsDir, { recursive: true });
        console.log('Reports directory created/verified');

        const analytics = new TruthSocialAnalytics();
        const visualizationService = new VisualizationService();
        
        // Generate report for all time
        console.log('Generating all-time analytics report...');
        
        const endDate = new Date();
        const startDate = new Date(0); // Start from Unix epoch

        console.log(`Time period: ${startDate.toISOString()} to ${endDate.toISOString()}`);

        const report = await analytics.generateReport({
            startDate,
            endDate,
            includeEngagement: true,
            includeTrends: true
        });

        console.log('All-time report generated successfully');
        console.log('Report summary:', {
            totalPosts: report.summary.totalPosts,
            averageEngagement: report.summary.averageEngagement.toFixed(2),
            postsPerDay: report.summary.postsPerDay
        });

        // Generate visualizations for the report
        console.log('Generating visualizations...');
        await visualizationService.generateVisualizations(report);
        console.log('Visualizations generated successfully');

        console.log('Analytics generation completed successfully');

    } catch (error) {
        console.error('Error generating analytics:', error);
        process.exit(1);
    }
}

// Run analytics using IIFE
(async () => {
    try {
        await generateAnalytics();
    } catch (error) {
        console.error('Unhandled error:', error);
        process.exit(1);
    }
})();

export default generateAnalytics; 