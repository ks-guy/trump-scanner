import Chart from 'chart.js/auto';
import { createCanvas } from 'canvas';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { logger } from '../../utils/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VisualizationService {
    constructor() {
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

        const canvas = createCanvas(1200, 800);
        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
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
        });

        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(path.join(this.chartsDir, 'engagement-chart.png'), buffer);
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

        const canvas = createCanvas(1200, 800);
        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
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
        });

        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(path.join(this.chartsDir, 'posting-patterns-chart.png'), buffer);
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

        const canvas = createCanvas(1200, 800);
        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
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
        });

        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(path.join(this.chartsDir, 'word-cloud-chart.png'), buffer);
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

        const canvas = createCanvas(1200, 800);
        const ctx = canvas.getContext('2d');

        const chart = new Chart(ctx, {
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
        });

        const buffer = canvas.toBuffer('image/png');
        await fs.writeFile(path.join(this.chartsDir, 'trend-chart.png'), buffer);
    }
}

export default VisualizationService; 