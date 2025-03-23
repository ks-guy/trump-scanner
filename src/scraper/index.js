import { QuoteScraper } from '../services/scrapers/QuoteScraper.js';
import { logger } from '../utils/logger.js';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function initializeScraper() {
    try {
        const scraper = new QuoteScraper();
        await scraper.initialize();
        return scraper;
    } catch (error) {
        logger.error('Error initializing scraper:', error);
        throw error;
    }
}

async function getAllUrls() {
    // Get URLs from various sources
    const urls = [
        // News sources
        'https://www.reuters.com/search/?q=trump',
        'https://www.bbc.com/search?q=trump',
        'https://www.nytimes.com/search?query=trump',
        'https://www.washingtonpost.com/search/?query=trump',
        
        // Social media
        'https://truthsocial.com/@realDonaldTrump',
        'https://twitter.com/realDonaldTrump',
        
        // Campaign websites
        'https://www.donaldjtrump.com/',
        'https://www.trump2024.com/',
        
        // Transcripts
        'https://www.rev.com/blog/transcript-category/donald-trump',
        'https://www.factbase.com/trump',
        
        // Legal proceedings
        'https://www.courtlistener.com/search/?q=trump',
        'https://www.justice.gov/search?query=trump',
        
        // Official documents
        'https://www.whitehouse.gov/administration/trump/',
        'https://www.archives.gov/research/trump'
    ];

    return urls;
}

async function main() {
    try {
        logger.info('Starting quote scraping process...');
        
        const scraper = await initializeScraper();
        const urls = await getAllUrls();
        
        logger.info(`Found ${urls.length} URLs to scrape`);
        
        for (const url of urls) {
            try {
                logger.info(`Scraping quotes from ${url}`);
                const quotes = await scraper.scrapePage(url);
                
                // Save quotes to database
                for (const quote of quotes) {
                    await prisma.quote.create({
                        data: {
                            text: quote.text,
                            speaker: quote.speaker,
                            source: quote.source,
                            date: quote.date,
                            context: quote.context,
                            metadata: JSON.stringify(quote.metadata)
                        }
                    });
                }
                
                logger.info(`Saved ${quotes.length} quotes from ${url}`);
                
                // Respect rate limits
                await new Promise(resolve => setTimeout(resolve, 5000));
                
            } catch (error) {
                logger.error(`Error scraping ${url}:`, error);
            }
        }
        
        logger.info('Quote scraping completed');
        
    } catch (error) {
        logger.error('Error in main scraping process:', error);
    } finally {
        await prisma.$disconnect();
    }
}

main(); 