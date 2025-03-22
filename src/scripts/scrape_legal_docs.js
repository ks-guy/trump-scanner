import ora from 'ora';
import { sources, config } from '../config/sources.js';
import { LegalDocumentScraper } from '../services/scrapers/LegalDocumentScraper.js';
import { logger } from '../utils/logger.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../../.env') });

let spinner = null;
let scraper = null;

async function scrapeLegalDocuments() {
    try {
        // Initialize scraper
        spinner = ora('Initializing legal document scraper...').start();
        scraper = new LegalDocumentScraper(config);
        await scraper.initialize();
        spinner.succeed('Legal document scraper initialized');

        // Get all legal sources
        const legalUrls = [
            ...sources.legal,
            ...sources.official_documents.legal_documents
        ];

        spinner.info(`Found ${legalUrls.length} legal sources to scrape`);

        let successCount = 0;
        let failureCount = 0;
        let totalDocuments = 0;

        // Process each legal source
        for (const url of legalUrls) {
            try {
                spinner.start(`Processing ${url}`);
                
                const documentData = await scraper.scrapeLegalDocument(url);
                
                // Log results
                totalDocuments++;
                successCount++;
                
                spinner.succeed(`Successfully scraped ${url}:
                - Title: ${documentData.title || 'N/A'}
                - Case Number: ${documentData.caseNumber || 'N/A'}
                - Court: ${documentData.court || 'N/A'}
                - Filing Date: ${documentData.filingDate || 'N/A'}
                - PDFs Downloaded: ${documentData.downloadedPdfs?.length || 0}
                - PDF Content Extracted: ${documentData.pdfContent?.length || 0} pages`);

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
            await new Promise(resolve => setTimeout(resolve, config.requestDelay.min));
        }

        // Final summary
        spinner.succeed(`Legal document scraping completed:
        - URLs processed: ${successCount + failureCount}/${legalUrls.length}
        - Successful: ${successCount}
        - Failed: ${failureCount}
        - Total documents: ${totalDocuments}`);

    } catch (error) {
        if (spinner) spinner.fail(`Scraping failed: ${error.message}`);
        logger.error('Scraping failed:', error);
        process.exitCode = 1;
    } finally {
        if (scraper) {
            spinner = ora('Cleaning up...').start();
            await scraper.cleanup();
            spinner.succeed('Cleanup completed');
        }
    }
}

// Run the scraper
scrapeLegalDocuments().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
}); 