const axios = require('axios');
const cheerio = require('cheerio');
const { createLogger } = require('../utils/logger');
const { Source, SourceCategory } = require('../models/sources');
const { promisify } = require('util');
const sleep = promisify(setTimeout);

const logger = createLogger('SourceTester');

class SourceTester {
    constructor() {
        this.results = {
            accessible: [],
            inaccessible: [],
            errors: []
        };
    }

    async testAllSources() {
        try {
            // Get all sources grouped by region
            const sources = await Source.findAll({
                include: [{
                    model: SourceCategory,
                    attributes: ['name', 'description']
                }],
                order: [['region', 'ASC']]
            });

            // Group sources by region
            const sourcesByRegion = this.groupSourcesByRegion(sources);

            // Test each region's sources
            for (const [region, regionSources] of Object.entries(sourcesByRegion)) {
                logger.info(`Testing sources from ${region}`);
                await this.testRegionSources(region, regionSources);
            }

            // Generate report
            this.generateReport();
        } catch (error) {
            logger.error(`Error testing sources: ${error.message}`);
        }
    }

    groupSourcesByRegion(sources) {
        return sources.reduce((acc, source) => {
            const region = source.region || 'Uncategorized';
            if (!acc[region]) {
                acc[region] = [];
            }
            acc[region].push(source);
            return acc;
        }, {});
    }

    async testRegionSources(region, sources) {
        for (const source of sources) {
            try {
                logger.info(`Testing source: ${source.name}`);
                const result = await this.testSource(source);
                
                if (result.accessible) {
                    this.results.accessible.push({
                        name: source.name,
                        region,
                        url: source.url,
                        category: source.SourceCategory.name,
                        verification_level: source.verification_level,
                        content_sample: result.content_sample
                    });
                } else {
                    this.results.inaccessible.push({
                        name: source.name,
                        region,
                        url: source.url,
                        category: source.SourceCategory.name,
                        error: result.error
                    });
                }

                // Respect rate limits
                await sleep(1000);
            } catch (error) {
                this.results.errors.push({
                    name: source.name,
                    region,
                    url: source.url,
                    error: error.message
                });
            }
        }
    }

    async testSource(source) {
        try {
            const response = await axios.get(source.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            
            // Extract content sample
            let content_sample = '';
            if (source.verification_level === 'primary') {
                // For primary sources, look for official statements or press releases
                content_sample = this.extractPrimaryContent($);
            } else {
                // For secondary sources, look for news articles
                content_sample = this.extractNewsContent($);
            }

            return {
                accessible: true,
                content_sample
            };
        } catch (error) {
            return {
                accessible: false,
                error: error.message
            };
        }
    }

    extractPrimaryContent($) {
        // Look for common primary source content patterns
        const selectors = [
            'article',
            '.press-release',
            '.statement',
            '.official-statement',
            '.transcript',
            '.speech'
        ];

        for (const selector of selectors) {
            const content = $(selector).first().text().trim();
            if (content) {
                return content.substring(0, 200) + '...';
            }
        }

        return 'No primary content found';
    }

    extractNewsContent($) {
        // Look for common news article patterns
        const selectors = [
            'article',
            '.article-content',
            '.story-content',
            '.news-content',
            '.post-content'
        ];

        for (const selector of selectors) {
            const content = $(selector).first().text().trim();
            if (content) {
                return content.substring(0, 200) + '...';
            }
        }

        return 'No news content found';
    }

    generateReport() {
        logger.info('\n=== Source Testing Report ===\n');
        
        // Summary
        logger.info('Summary:');
        logger.info(`Total Sources Tested: ${this.results.accessible.length + this.results.inaccessible.length}`);
        logger.info(`Accessible Sources: ${this.results.accessible.length}`);
        logger.info(`Inaccessible Sources: ${this.results.inaccessible.length}`);
        logger.info(`Errors: ${this.results.errors.length}\n`);

        // Accessible Sources by Region
        logger.info('Accessible Sources by Region:');
        const accessibleByRegion = this.groupByRegion(this.results.accessible);
        for (const [region, sources] of Object.entries(accessibleByRegion)) {
            logger.info(`\n${region}:`);
            sources.forEach(source => {
                logger.info(`- ${source.name} (${source.verification_level})`);
                logger.info(`  Content Sample: ${source.content_sample}`);
            });
        }

        // Inaccessible Sources
        if (this.results.inaccessible.length > 0) {
            logger.info('\nInaccessible Sources:');
            this.results.inaccessible.forEach(source => {
                logger.info(`- ${source.name} (${source.region})`);
                logger.info(`  Error: ${source.error}`);
            });
        }

        // Errors
        if (this.results.errors.length > 0) {
            logger.info('\nErrors:');
            this.results.errors.forEach(error => {
                logger.info(`- ${error.name} (${error.region})`);
                logger.info(`  Error: ${error.error}`);
            });
        }
    }

    groupByRegion(items) {
        return items.reduce((acc, item) => {
            if (!acc[item.region]) {
                acc[item.region] = [];
            }
            acc[item.region].push(item);
            return acc;
        }, {});
    }
}

// Run the test
const tester = new SourceTester();
tester.testAllSources().catch(error => {
    logger.error(`Failed to complete source testing: ${error.message}`);
}); 