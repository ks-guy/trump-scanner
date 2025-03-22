const { ChartJSNodeCanvas } = require('chartjs-node-canvas');
const path = require('path');
const fs = require('fs').promises;
const { logger } = require('../../utils/logger');

class VisualizationService {
    constructor() {
        this.chartJSNodeCanvas = new ChartJSNodeCanvas({
            width: 1200,
            height: 800,
            backgroundColour: 'white'
        });
        this.chartsDir = path.join(process.cwd(), 'reports', 'charts');
    }

    /**
     * Generate all visualizations for a report
     * @param {Object} report Analytics report data
     * @returns {Promise<void>}
     */
    async generateVisualizations(report) {
        try {
            await fs.mkdir(this.chartsDir, { recursive: true });

            await Promise.all([
                this.generateEngagementChart(report),
                this.generatePostingPatternsChart(report),
                this.generateWordCloud(report),
                this.generateTrendChart(report)
            ]);

            logger.info('All visualizations generated successfully');
        } catch (error) {
            logger.error('Error generating visualizations:', error);
            throw error;
        }
    }

    /**
     * Generate engagement chart
     * @private
     * @param {Object} report Report data
     * @returns {Promise<void>}
     */
    async generateEngagementChart(report) {
        const { engagementByDay } = report.engagement;
        const dates = engagementByDay.map(d => d.date);
        const likes = engagementByDay.map(d => d.likes);
        const reposts = engagementByDay.map(d => d.reposts);
        const replies = engagementByDay.map(d => d.replies);

        const configuration = {
            type: 'line',
            data: {
                labels: dates,
                datasets: [
                    {
                        label: 'Likes',
                        data: likes,
                        borderColor: 'rgb(75, 192, 192)',
                        tension: 0.1
                    },
                    {
                        label: 'Reposts',
                        data: reposts,
                        borderColor: 'rgb(255, 99, 132)',
                        tension: 0.1
                    },
                    {
                        label: 'Replies',
                        data: replies,
                        borderColor: 'rgb(54, 162, 235)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Daily Engagement Metrics'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };

        const image = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        await fs.writeFile(path.join(this.chartsDir, 'engagement-chart.png'), image);
    }

    /**
     * Generate posting patterns chart
     * @private
     * @param {Object} report Report data
     * @returns {Promise<void>}
     */
    async generatePostingPatternsChart(report) {
        const { postingPatterns } = report.trends;
        const hours = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        const configuration = {
            type: 'bar',
            data: {
                labels: hours,
                datasets: [
                    {
                        label: 'Posts by Hour',
                        data: postingPatterns.byHour,
                        backgroundColor: 'rgba(75, 192, 192, 0.5)'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Posting Patterns by Hour'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };

        const image = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        await fs.writeFile(path.join(this.chartsDir, 'posting-patterns-chart.png'), image);
    }

    /**
     * Generate word cloud chart
     * @private
     * @param {Object} report Report data
     * @returns {Promise<void>}
     */
    async generateWordCloud(report) {
        const { topWords } = report.posts.contentAnalysis;
        const words = topWords.map(w => w.word);
        const counts = topWords.map(w => w.count);

        const configuration = {
            type: 'bar',
            data: {
                labels: words,
                datasets: [
                    {
                        label: 'Word Frequency',
                        data: counts,
                        backgroundColor: 'rgba(54, 162, 235, 0.5)'
                    }
                ]
            },
            options: {
                responsive: true,
                indexAxis: 'y',
                plugins: {
                    title: {
                        display: true,
                        text: 'Top Words in Posts'
                    }
                },
                scales: {
                    x: {
                        beginAtZero: true
                    }
                }
            }
        };

        const image = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        await fs.writeFile(path.join(this.chartsDir, 'word-cloud-chart.png'), image);
    }

    /**
     * Generate trend chart
     * @private
     * @param {Object} report Report data
     * @returns {Promise<void>}
     */
    async generateTrendChart(report) {
        const { engagementTrend } = report.trends;
        const weeks = engagementTrend.map(t => t.week);
        const engagement = engagementTrend.map(t => t.averageEngagement);

        const configuration = {
            type: 'line',
            data: {
                labels: weeks,
                datasets: [
                    {
                        label: 'Average Engagement',
                        data: engagement,
                        borderColor: 'rgb(153, 102, 255)',
                        tension: 0.1
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    title: {
                        display: true,
                        text: 'Weekly Engagement Trends'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        };

        const image = await this.chartJSNodeCanvas.renderToBuffer(configuration);
        await fs.writeFile(path.join(this.chartsDir, 'trend-chart.png'), image);
    }
}

module.exports = VisualizationService; 