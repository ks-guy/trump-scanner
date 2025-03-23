import { LegalDocumentScraper } from '../services/scrapers/LegalDocumentScraper.js';
import winston from 'winston';
import path from 'path';
import { fileURLToPath } from 'url';
import { sources, config } from '../config/sources.js';

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
    new winston.transports.File({ filename: path.join(__dirname, '../../error_logs/legal_scraper_error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(__dirname, '../../error_logs/legal_scraper.log') })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

function getAllLegalUrls() {
  const urls = [];
  
  // Add legal documents from sources.legal
  if (Array.isArray(sources.legal)) {
    urls.push(...sources.legal);
  }

  // Add legal documents from official_documents
  if (sources.official_documents?.legal_documents) {
    urls.push(...sources.official_documents.legal_documents);
  }

  return urls;
}

async function initializeLegalScraper() {
  const legalScraper = new LegalDocumentScraper(config);
  const startTime = Date.now();
  let documentsProcessed = 0;
  
  try {
    // Initialize the legal document scraper
    await legalScraper.initialize();
    
    // Get all legal document URLs
    const urls = getAllLegalUrls();
    logger.info(`Total legal documents to scrape: ${urls.length}`);

    // Start scraping
    logger.info('Starting legal document scraping process...');
    
    // Set up progress tracking
    const progressInterval = setInterval(() => {
      const elapsedMinutes = (Date.now() - startTime) / 60000;
      logger.info(`Progress: ${documentsProcessed} documents processed in ${elapsedMinutes.toFixed(1)} minutes`);
    }, 60000); // Log progress every minute

    // Process each URL
    for (const url of urls) {
      try {
        // Scrape the legal document
        const documentData = await legalScraper.scrapeLegalDocument(url);
        
        // Download PDFs if any
        if (documentData.pdfUrls && documentData.pdfUrls.length > 0) {
          documentData.downloadedPdfs = await legalScraper.downloadPDFs(documentData.pdfUrls);
          
          // Extract content from PDFs
          if (documentData.downloadedPdfs.length > 0) {
            documentData.pdfContent = await legalScraper.extractPDFContent(documentData.downloadedPdfs);
          }
        }

        // Save the document to database
        await legalScraper.saveDocument(documentData);
        documentsProcessed++;
        
        logger.info(`Successfully processed document from ${url}`);
      } catch (error) {
        logger.error(`Error processing document from ${url}:`, error);
      }

      // Respect rate limiting from config
      await new Promise(resolve => setTimeout(resolve, 
        Math.floor(Math.random() * (config.requestDelay.max - config.requestDelay.min)) + config.requestDelay.min
      ));
    }

    clearInterval(progressInterval);
    const totalMinutes = (Date.now() - startTime) / 60000;
    logger.info(`Scraping completed. Processed ${documentsProcessed} documents in ${totalMinutes.toFixed(1)} minutes`);
    logger.info(`Average rate: ${(documentsProcessed / totalMinutes).toFixed(1)} documents per minute`);

  } catch (error) {
    logger.error('Error in legal scraper:', error);
    process.exit(1);
  } finally {
    // Cleanup
    await legalScraper.cleanup();
  }
}

// Start the legal document scraper
initializeLegalScraper(); 