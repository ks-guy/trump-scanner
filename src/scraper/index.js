import { QuoteScraper } from './quoteScraper.js';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure logging
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: path.join(__dirname, '../../error_logs/scraper_error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(__dirname, '../../error_logs/scraper.log') })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

async function initializeScraper() {
  const quoteScraper = new QuoteScraper();
  
  try {
    // Initialize the quote scraper
    await quoteScraper.initialize();
    
    // Example URLs to scrape (replace with your actual URLs)
    const urls = [
      'https://www.realclearpolitics.com/',
      'https://www.politico.com/',
      'https://www.foxnews.com/politics',
      // Add more URLs as needed
    ];

    // Start scraping
    logger.info('Starting quote scraping process...');
    await quoteScraper.scrapeUrls(urls);
    logger.info('Quote scraping completed successfully.');

  } catch (error) {
    logger.error('Error in scraper:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await quoteScraper.cleanup();
  }
}

// Start the scraper
initializeScraper(); 