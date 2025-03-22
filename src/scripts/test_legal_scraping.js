import ora from 'ora';
import { sources, config } from '../config/sources.js';
import { QuoteScraperService } from '../services/scraper/QuoteScraperService.js';
import { Quote } from '../models/Quote.js';
import { logger } from '../utils/logger.js';

let spinner = null;
let scraper = null;  // Move scraper to global scope

async function testLegalScraping() {
    try {
        // Initialize database
        spinner = ora('Initializing database...').start();
        await Quote.initialize();
        spinner.succeed('Database initialized');

        // Initialize scraper with modified config for testing
        const testConfig = {
            ...config,
            maxConcurrent: 2,  // Lower for testing
            requestDelay: { min: 3000, max: 5000 },  // More conservative delays
            maxRequestsPerDomain: 10,  // Lower limit for testing
            pageTimeout: 30000  // 30 second timeout
        };

        spinner = ora('Initializing scraper...').start();
        scraper = new QuoteScraperService(testConfig);  // Assign to global scraper
        await scraper.initialize();
        spinner.succeed('Scraper initialized');

        // Get legal sources
        const legalUrls = sources.legal;
        spinner.info(`Found ${legalUrls.length} legal sources to test`);

        let successCount = 0;
        let failureCount = 0;
        let totalQuotes = 0;

        // Process each legal source
        for (const url of legalUrls) {
            try {
                spinner.start(`Testing ${url}`);
                
                // Test page loading
                spinner.text = `Loading ${url}`;
                const page = await scraper.acquirePage();
                
                // Add additional headers for legal sites
                await page.setExtraHTTPHeaders({
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'DNT': '1'
                });

                // Scrape the URL
                spinner.text = `Scraping ${url}`;
                const quotes = await scraper.scrapeUrl(url);
                
                // Log results
                totalQuotes += quotes.length;
                successCount++;
                
                spinner.succeed(`Successfully scraped ${url}:
                - Quotes found: ${quotes.length}
                - Average quote length: ${quotes.length > 0 ? Math.round(quotes.reduce((acc, q) => acc + q.quote_text.length, 0) / quotes.length) : 0}
                - Types of quotes: ${quotes.length > 0 ? new Set(quotes.map(q => q.context.type)).size : 0} different types`);

                // Sample output of first quote
                if (quotes.length > 0) {
                    logger.info('Sample quote:', {
                        text: quotes[0].quote_text.substring(0, 100) + '...',
                        context: quotes[0].context
                    });
                }

            } catch (error) {
                failureCount++;
                if (error.name === 'TimeoutError') {
                    spinner.fail(`Timeout while scraping ${url}`);
                } else if (error.message.includes('net::ERR_NAME_NOT_RESOLVED')) {
                    spinner.fail(`Could not resolve domain: ${url}`);
                } else if (error.message.includes('net::ERR_CONNECTION_REFUSED')) {
                    spinner.fail(`Connection refused: ${url}`);
                } else if (error.message.includes('404')) {
                    spinner.fail(`Page not found: ${url}`);
                } else {
                    spinner.fail(`Failed to scrape ${url}: ${error.message}`);
                }
                logger.error('Scraping error:', error);
            }

            // Show progress
            const progress = ((successCount + failureCount) / legalUrls.length * 100).toFixed(1);
            spinner = ora(`Progress: ${progress}% (${successCount}/${legalUrls.length} URLs)`).start();

            // Add a delay between requests
            await new Promise(resolve => setTimeout(resolve, 5000));
        }

        // Final summary
        spinner.succeed(`Legal sources testing completed:
        - URLs tested: ${successCount + failureCount}/${legalUrls.length}
        - Successful: ${successCount}
        - Failed: ${failureCount}
        - Total quotes found: ${totalQuotes}
        - Average quotes per successful source: ${successCount > 0 ? (totalQuotes / successCount).toFixed(1) : 0}`);

    } catch (error) {
        if (spinner) spinner.fail(`Testing failed: ${error.message}`);
        logger.error('Testing failed:', error);
        process.exitCode = 1;
    } finally {
        if (scraper) {
            spinner = ora('Cleaning up...').start();
            await scraper.cleanup();
            spinner.succeed('Cleanup completed');
        }
    }
}

// Handle interruptions
process.on('SIGINT', async () => {
    if (spinner) spinner.warn('Received SIGINT. Cleaning up...');
    logger.info('Received SIGINT. Cleaning up...');
    if (scraper) {
        await scraper.cleanup();
    }
    process.exit(0);
});

// Run the test if this file is executed directly
if (import.meta.url === new URL(import.meta.url).href) {
    testLegalScraping().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { testLegalScraping }; 