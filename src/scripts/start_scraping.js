const { default: ora } = require('ora');
const { sources, config } = require('../config/sources');
const QuoteScraperService = require('../services/scraper/QuoteScraperService');
const Quote = require('../models/Quote');
const logger = require('../utils/logger');

let spinner = null;

async function startScraping() {
    try {
        // Initialize database
        spinner = ora('Initializing database...').start();
        await Quote.initialize();
        spinner.succeed('Database initialized');

        // Initialize scraper with config
        spinner = ora('Initializing scraper...').start();
        const scraper = new QuoteScraperService(config);
        await scraper.initialize();
        spinner.succeed('Scraper initialized');

        // Get total number of URLs to scrape
        const allUrls = Object.values(sources).flat();
        const totalUrls = allUrls.length;
        
        spinner.info(`Found ${totalUrls} URLs to scrape across ${Object.keys(sources).length} categories`);

        // Start scraping each category
        for (const [category, urls] of Object.entries(sources)) {
            spinner = ora(`Processing ${category} sources (${urls.length} URLs)...`).start();
            
            let successCount = 0;
            let failureCount = 0;
            let quoteCount = 0;

            for (const url of urls) {
                try {
                    spinner.text = `Scraping ${url}`;
                    const quotes = await scraper.scrapeUrl(url);
                    quoteCount += quotes.length;
                    successCount++;
                    spinner.succeed(`Found ${quotes.length} quotes from ${url}`);
                } catch (error) {
                    failureCount++;
                    spinner.fail(`Failed to scrape ${url}: ${error.message}`);
                }

                // Show progress
                const progress = ((successCount + failureCount) / urls.length * 100).toFixed(1);
                spinner = ora(`Progress for ${category}: ${progress}% (${successCount}/${urls.length} URLs)`).start();
            }

            // Category summary
            spinner.succeed(`Completed ${category}:
            - URLs processed: ${successCount + failureCount}/${urls.length}
            - Successful: ${successCount}
            - Failed: ${failureCount}
            - Quotes found: ${quoteCount}`);
        }

        // Get final statistics
        spinner = ora('Gathering final statistics...').start();
        const stats = await Quote.getStats();
        spinner.succeed(`Scraping completed:
        - Total quotes in database: ${stats.totalQuotes}
        - Latest quote from: ${new Date(stats.latestQuote?.timestamp).toLocaleString()}
        - Oldest quote from: ${new Date(stats.oldestQuote?.timestamp).toLocaleString()}`);

    } catch (error) {
        if (spinner) spinner.fail(`Scraping failed: ${error.message}`);
        logger.error('Scraping failed:', error);
        process.exitCode = 1;
    }
}

// Handle interruptions
process.on('SIGINT', () => {
    if (spinner) spinner.warn('Received SIGINT. Cleaning up...');
    logger.info('Received SIGINT. Cleaning up...');
    process.exit(0);
});

// Start scraping
startScraping(); 