import { createLoggerComponent } from '../utils/logger.js';
import { QuoteScraperService } from '../services/scraper/QuoteScraperService.js';

const logger = createLoggerComponent('TestScrapers');

async function testScrapers() {
    try {
        logger.info('Starting scraper tests...');
        
        const scraper = new QuoteScraperService({
            concurrency: 1,
            requestDelay: { min: 2000, max: 5000 },
            maxRequestsPerDomain: 3,
            pageTimeout: 30000,
            maxRetries: 2
        });

        // Initialize the scraper
        await scraper.initialize();
        logger.info('Scraper initialized successfully');

        // Test URLs (using real, accessible pages)
        const testUrls = [
            'https://www.foxnews.com/politics',
            'https://www.breitbart.com/politics',
            'https://www.newsmax.com/politics'
        ];

        for (const url of testUrls) {
            try {
                logger.info(`Testing scraper with URL: ${url}`);
                const quotes = await scraper.scrapeUrl(url);
                logger.info(`Found ${quotes.length} quotes from ${url}`);
                
                if (quotes.length > 0) {
                    logger.info('Sample quote:', quotes[0]);
                }
            } catch (error) {
                logger.error(`Error scraping ${url}:`, error);
            }
            
            // Add delay between URLs
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Cleanup
        await scraper.cleanup();
        logger.info('Scraper tests completed');
    } catch (error) {
        logger.error('Error in test script:', error);
    }
}

// Run the tests
testScrapers().catch(error => {
    logger.error('Fatal error:', error);
    process.exit(1);
}); 