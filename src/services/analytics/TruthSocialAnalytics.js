import { PrismaClient } from '@prisma/client';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class TruthSocialAnalytics {
    constructor() {
        this.prisma = new PrismaClient();
        this.reportsDir = path.join(process.cwd(), 'reports');
    }

    /**
     * Calculate average engagement for a time period
     * @private
     * @param {Date} startDate Start date
     * @param {Date} endDate End date
     * @returns {Promise<number>} Average engagement
     */
    async calculateAverageEngagement(startDate, endDate) {
        try {
            console.log('Calculating average engagement...');
            const result = await this.prisma.post.aggregate({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                _avg: {
                    likes: true,
                    reposts: true,
                    replies: true
                }
            });
            console.log('Average engagement result:', result);
            return (result._avg.likes || 0) + (result._avg.reposts || 0) + (result._avg.replies || 0);
        } catch (error) {
            console.error('Error calculating average engagement:', error);
            throw error;
        }
    }

    /**
     * Generate comprehensive analytics report
     * @param {Object} options Report options
     * @returns {Promise<Object>} Report data
     */
    async generateReport(options = {}) {
        try {
            const {
                startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
                endDate = new Date(),
                includeEngagement = true,
                includeTrends = true
            } = options;

            console.log('Generating report with options:', { startDate, endDate, includeEngagement, includeTrends });

            // Test database connection
            try {
                await this.prisma.$connect();
                console.log('Database connection successful');
            } catch (error) {
                console.error('Database connection failed:', error);
                throw error;
            }

            // Count total posts to verify data access
            const totalPosts = await this.prisma.post.count();
            console.log('Total posts in database:', totalPosts);

            const report = {
                timestamp: new Date().toISOString(),
                period: {
                    start: startDate.toISOString(),
                    end: endDate.toISOString()
                },
                summary: await this.generateSummary(startDate, endDate),
                posts: await this.analyzePosts(startDate, endDate),
                engagement: includeEngagement ? await this.analyzeEngagement(startDate, endDate) : null,
                trends: includeTrends ? await this.analyzeTrends(startDate, endDate) : null
            };

            await this.saveReport(report);
            return report;
        } catch (error) {
            console.error('Error generating analytics report:', error);
            throw error;
        } finally {
            await this.prisma.$disconnect();
            console.log('Database connection closed');
        }
    }

    /**
     * Generate summary statistics
     * @private
     * @param {Date} startDate Start date
     * @param {Date} endDate End date
     * @returns {Promise<Object>} Summary statistics
     */
    async generateSummary(startDate, endDate) {
        console.log('Generating summary statistics...');
        const [
            totalPosts,
            totalReplies,
            totalLikes,
            totalReposts,
            averageEngagement
        ] = await Promise.all([
            this.prisma.post.count({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                }
            }),
            this.prisma.post.count({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    },
                    isReply: true
                }
            }),
            this.prisma.post.aggregate({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                _sum: {
                    likes: true
                }
            }),
            this.prisma.post.aggregate({
                where: {
                    createdAt: {
                        gte: startDate,
                        lte: endDate
                    }
                },
                _sum: {
                    reposts: true
                }
            }),
            this.calculateAverageEngagement(startDate, endDate)
        ]);

        const summary = {
            totalPosts,
            totalReplies,
            totalLikes: totalLikes._sum.likes || 0,
            totalReposts: totalReposts._sum.reposts || 0,
            averageEngagement,
            postsPerDay: Math.round(totalPosts / ((endDate - startDate) / (24 * 60 * 60 * 1000)))
        };

        console.log('Summary statistics:', summary);
        return summary;
    }

    /**
     * Analyze post content and patterns
     * @private
     * @param {Date} startDate Start date
     * @param {Date} endDate End date
     * @returns {Promise<Object>} Post analysis
     */
    async analyzePosts(startDate, endDate) {
        const posts = await this.prisma.post.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                content: true,
                likes: true,
                reposts: true,
                replies: true,
                createdAt: true
            }
        });

        // Analyze posting times
        const postingTimes = posts.map(post => post.createdAt.getHours());
        const peakHours = this.calculatePeakHours(postingTimes);

        // Analyze content patterns
        const contentAnalysis = this.analyzeContent(posts.map(post => post.content));

        return {
            peakHours,
            contentAnalysis,
            averageLength: Math.round(
                posts.reduce((sum, post) => sum + post.content.length, 0) / posts.length
            )
        };
    }

    /**
     * Analyze engagement metrics
     * @private
     * @param {Date} startDate Start date
     * @param {Date} endDate End date
     * @returns {Promise<Object>} Engagement analysis
     */
    async analyzeEngagement(startDate, endDate) {
        const posts = await this.prisma.post.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                likes: true,
                reposts: true,
                replies: true,
                createdAt: true
            }
        });

        const engagementByDay = this.calculateEngagementByDay(posts);
        const topPosts = this.findTopPosts(posts);

        return {
            engagementByDay,
            topPosts,
            averageEngagementRate: this.calculateEngagementRate(posts)
        };
    }

    /**
     * Analyze trends over time
     * @private
     * @param {Date} startDate Start date
     * @param {Date} endDate End date
     * @returns {Promise<Object>} Trend analysis
     */
    async analyzeTrends(startDate, endDate) {
        const posts = await this.prisma.post.findMany({
            where: {
                createdAt: {
                    gte: startDate,
                    lte: endDate
                }
            },
            select: {
                content: true,
                likes: true,
                reposts: true,
                replies: true,
                createdAt: true
            }
        });

        return {
            engagementTrend: this.calculateEngagementTrend(posts),
            contentTrends: this.analyzeContentTrends(posts),
            postingPatterns: this.analyzePostingPatterns(posts)
        };
    }

    /**
     * Calculate peak posting hours
     * @private
     * @param {Array<number>} hours Array of posting hours
     * @returns {Array<Object>} Peak hours with counts
     */
    calculatePeakHours(hours) {
        const hourCounts = hours.reduce((acc, hour) => {
            acc[hour] = (acc[hour] || 0) + 1;
            return acc;
        }, {});

        return Object.entries(hourCounts)
            .map(([hour, count]) => ({ hour: parseInt(hour), count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 5);
    }

    /**
     * Analyze content patterns
     * @private
     * @param {Array<string>} contents Array of post contents
     * @returns {Object} Content analysis
     */
    analyzeContent(contents) {
        const words = contents.join(' ').toLowerCase().split(/\s+/);
        const wordCounts = words.reduce((acc, word) => {
            if (word.length > 3) { // Skip short words
                acc[word] = (acc[word] || 0) + 1;
            }
            return acc;
        }, {});

        const topWords = Object.entries(wordCounts)
            .map(([word, count]) => ({ word, count }))
            .sort((a, b) => b.count - a.count)
            .slice(0, 20);

        return {
            topWords,
            averageLength: Math.round(words.length / contents.length)
        };
    }

    /**
     * Calculate engagement by day
     * @private
     * @param {Array<Object>} posts Array of posts
     * @returns {Array<Object>} Daily engagement data
     */
    calculateEngagementByDay(posts) {
        const dailyEngagement = posts.reduce((acc, post) => {
            const date = post.createdAt.toISOString().split('T')[0];
            if (!acc[date]) {
                acc[date] = {
                    date,
                    likes: 0,
                    reposts: 0,
                    replies: 0,
                    total: 0
                };
            }
            acc[date].likes += post.likes;
            acc[date].reposts += post.reposts;
            acc[date].replies += post.replies;
            acc[date].total += post.likes + post.reposts + post.replies;
            return acc;
        }, {});

        return Object.values(dailyEngagement).sort((a, b) => a.date.localeCompare(b.date));
    }

    /**
     * Find top performing posts
     * @private
     * @param {Array<Object>} posts Array of posts
     * @returns {Array<Object>} Top posts by engagement
     */
    findTopPosts(posts) {
        return posts
            .map(post => ({
                ...post,
                totalEngagement: post.likes + post.reposts + post.replies
            }))
            .sort((a, b) => b.totalEngagement - a.totalEngagement)
            .slice(0, 10);
    }

    /**
     * Calculate average engagement rate
     * @private
     * @param {Array<Object>} posts Array of posts
     * @returns {number} Average engagement rate
     */
    calculateEngagementRate(posts) {
        const totalEngagement = posts.reduce((sum, post) => 
            sum + post.likes + post.reposts + post.replies, 0);
        return posts.length > 0 ? totalEngagement / posts.length : 0;
    }

    /**
     * Calculate engagement trend
     * @private
     * @param {Array<Object>} posts Array of posts
     * @returns {Object} Engagement trend data
     */
    calculateEngagementTrend(posts) {
        const weeklyEngagement = posts.reduce((acc, post) => {
            const week = this.getWeekNumber(post.createdAt);
            if (!acc[week]) {
                acc[week] = {
                    week,
                    engagement: 0,
                    posts: 0
                };
            }
            acc[week].engagement += post.likes + post.reposts + post.replies;
            acc[week].posts++;
            return acc;
        }, {});

        return Object.values(weeklyEngagement)
            .map(week => ({
                ...week,
                averageEngagement: week.engagement / week.posts
            }))
            .sort((a, b) => a.week.localeCompare(b.week));
    }

    /**
     * Analyze content trends
     * @private
     * @param {Array<Object>} posts Array of posts
     * @returns {Object} Content trend analysis
     */
    analyzeContentTrends(posts) {
        const weeklyContent = posts.reduce((acc, post) => {
            const week = this.getWeekNumber(post.createdAt);
            if (!acc[week]) {
                acc[week] = {
                    week,
                    contents: []
                };
            }
            acc[week].contents.push(post.content);
            return acc;
        }, {});

        return Object.values(weeklyContent).map(week => ({
            week: week.week,
            topWords: this.analyzeContent(week.contents).topWords
        }));
    }

    /**
     * Analyze posting patterns
     * @private
     * @param {Array<Object>} posts Array of posts
     * @returns {Object} Posting pattern analysis
     */
    analyzePostingPatterns(posts) {
        const patterns = {
            byHour: Array(24).fill(0),
            byDay: Array(7).fill(0),
            byWeek: {}
        };

        posts.forEach(post => {
            patterns.byHour[post.createdAt.getHours()]++;
            patterns.byDay[post.createdAt.getDay()]++;
            
            const week = this.getWeekNumber(post.createdAt);
            if (!patterns.byWeek[week]) {
                patterns.byWeek[week] = 0;
            }
            patterns.byWeek[week]++;
        });

        return patterns;
    }

    /**
     * Get week number for a date
     * @private
     * @param {Date} date Date to get week number for
     * @returns {string} Week number in YYYY-Www format
     */
    getWeekNumber(date) {
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
        const week1 = new Date(d.getFullYear(), 0, 4);
        return `${d.getFullYear()}-W${String(Math.round(((d - week1) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7) + 1).padStart(2, '0')}`;
    }

    /**
     * Save report to file
     * @private
     * @param {Object} report Report data
     * @returns {Promise<void>}
     */
    async saveReport(report) {
        try {
            await fs.mkdir(this.reportsDir, { recursive: true });
            const filename = `analytics-report-${new Date().toISOString().split('T')[0]}.json`;
            await fs.writeFile(
                path.join(this.reportsDir, filename),
                JSON.stringify(report, null, 2)
            );
            console.log(`Analytics report saved to ${filename}`);
        } catch (error) {
            console.error('Error saving analytics report:', error);
            throw error;
        }
    }
}

export default TruthSocialAnalytics; 