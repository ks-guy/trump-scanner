import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { prisma } from '../models/index.js';
import winston from 'winston';
import path from 'path';
import { promises as fs } from 'fs';
import axios from 'axios';
import { randomDelay } from '../utils/helpers.js';
import { verificationSystem } from '../utils/verification.js';
import { archiveService } from '../services/archiveService.js';
import { contextService } from '../services/contextService.js';
import { factCheckService } from '../services/factCheckService.js';
import { fileURLToPath } from 'url';
import pdf from 'pdf-parse';
import { createWorker } from 'tesseract.js';

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
    new winston.transports.File({ filename: path.join(__dirname, '../../error_logs/quote_scraper_error.log'), level: 'error' }),
    new winston.transports.File({ filename: path.join(__dirname, '../../error_logs/quote_scraper.log') })
  ]
});

if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.simple()
  }));
}

export class QuoteScraper {
  constructor(config) {
    this.browser = null;
    this.config = config;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15'
    ];
    this.proxies = [];
    this.concurrency = config.maxConcurrent || 2;
    this.requestDelay = config.requestDelay || { min: 10000, max: 20000 };
    this.ocrWorker = null;
  }

  async initialize() {
    try {
      // Load proxies if proxy rotation is enabled
      if (this.config.proxyRotation) {
        const proxyFile = path.join(__dirname, '../../proxy.txt');
        if (await fs.access(proxyFile).then(() => true).catch(() => false)) {
          this.proxies = (await fs.readFile(proxyFile, 'utf8')).split('\n').filter(proxy => proxy.trim());
        }
      }

      // Initialize browser
      this.browser = await puppeteer.launch({
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-accelerated-2d-canvas',
          '--disable-gpu',
          '--window-size=1920x1080'
        ]
      });

      // Initialize OCR worker if enabled
      if (this.config.official_documents?.legal_documents?.ocrEnabled) {
        this.ocrWorker = await createWorker(this.config.official_documents.legal_documents.ocrLanguage);
      }

      logger.info('Quote scraper initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize quote scraper:', error);
      throw error;
    }
  }

  async scrapePage(url, category, subCategory) {
    try {
      const page = await this.browser.newPage();
      
      // Set random user agent if enabled
      if (this.config.userAgentRotation) {
        const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
        await page.setUserAgent(userAgent);
      }

      // Set proxy if available and enabled
      if (this.config.proxyRotation && this.proxies.length > 0) {
        const proxy = this.proxies[Math.floor(Math.random() * this.proxies.length)];
        await page.authenticate({
          username: proxy.split(':')[0],
          password: proxy.split(':')[1]
        });
      }

      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Check if the page is a PDF
      const contentType = await page.evaluate(() => document.contentType);
      if (contentType === 'application/pdf') {
        return await this.handlePDF(page, url, category, subCategory);
      }
      
      // Get page content
      const content = await page.content();
      const $ = cheerio.load(content);

      // Extract quotes based on category
      const quotes = await this.extractQuotesByCategory($, url, category, subCategory);

      // Process each quote
      const processedQuotes = [];
      for (const quote of quotes) {
        try {
          // Archive the source content
          await archiveService.archiveSource(url, content);

          // Enrich quote context
          const enrichedContext = await contextService.enrichQuoteContext(quote, content);
          quote.context = enrichedContext;

          // For legal documents, extract additional metadata
          if (category === 'legal' || subCategory === 'legal_documents') {
            quote.legal_metadata = await this.extractLegalMetadata(quote, content);
          }

          // Save to database
          const savedQuote = await prisma.quote.create({
            data: {
              text: quote.quote_text,
              source: url,
              speaker: 'Donald Trump',
              context: JSON.stringify({
                ...quote.context,
                category,
                subCategory,
                sourceType: category,
                legal_metadata: quote.legal_metadata
              }),
              metadata: JSON.stringify({
                extractionMethod: quote.extractionMethod,
                legal_metadata: quote.legal_metadata
              })
            }
          });

          processedQuotes.push(savedQuote);
        } catch (error) {
          logger.error(`Error processing quote: ${error.message}`);
        }
      }

      await page.close();
      return processedQuotes;
    } catch (error) {
      logger.error(`Error scraping page ${url}:`, error);
      return [];
    }
  }

  async handlePDF(page, url, category, subCategory) {
    try {
      // Get PDF content
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: { top: '20px', right: '20px', bottom: '20px', left: '20px' }
      });

      // Extract text from PDF
      const pdfData = await pdf(pdfBuffer);
      let text = pdfData.text;

      // If OCR is enabled and text extraction is insufficient, use OCR
      if (this.config.official_documents?.legal_documents?.ocrEnabled && 
          text.length < this.config.official_documents.legal_documents.minTextLength) {
        const { data: { text: ocrText } } = await this.ocrWorker.recognize(pdfBuffer);
        text = ocrText;
      }

      // Extract quotes from PDF text
      const quotes = await this.extractQuotesFromText(text, url, category, subCategory);

      // Process each quote
      const processedQuotes = [];
      for (const quote of quotes) {
        try {
          // Archive the PDF
          await archiveService.archiveSource(url, pdfBuffer);

          // Extract legal metadata
          quote.legal_metadata = await this.extractLegalMetadata(quote, text);

          // Save to database
          const savedQuote = await prisma.quote.create({
            data: {
              text: quote.quote_text,
              source: url,
              speaker: 'Donald Trump',
              context: JSON.stringify({
                ...quote.context,
                category,
                subCategory,
                sourceType: category,
                legal_metadata: quote.legal_metadata
              }),
              metadata: JSON.stringify({
                extractionMethod: 'pdf',
                legal_metadata: quote.legal_metadata
              })
            }
          });

          processedQuotes.push(savedQuote);
        } catch (error) {
          logger.error(`Error processing PDF quote: ${error.message}`);
        }
      }

      await page.close();
      return processedQuotes;
    } catch (error) {
      logger.error(`Error handling PDF ${url}:`, error);
      return [];
    }
  }

  async extractQuotesFromText(text, url, category, subCategory) {
    const quotes = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim());

    for (const sentence of sentences) {
      if (sentence.includes('Trump') && 
          sentence.length >= this.config.minQuoteLength && 
          sentence.length <= this.config.maxQuoteLength) {
        quotes.push(this.createQuote(sentence.trim(), url, 'text_extraction'));
      }
    }

    return quotes;
  }

  async extractLegalMetadata(quote, content) {
    const metadata = {};
    const config = this.config.official_documents.legal_documents;

    if (config.extractCitations) {
      metadata.citations = this.extractCitations(content);
    }
    if (config.extractParties) {
      metadata.parties = this.extractParties(content);
    }
    if (config.extractDates) {
      metadata.dates = this.extractDates(content);
    }
    if (config.extractJudges) {
      metadata.judges = this.extractJudges(content);
    }
    if (config.extractCaseNumbers) {
      metadata.caseNumbers = this.extractCaseNumbers(content);
    }
    if (config.extractVenues) {
      metadata.venues = this.extractVenues(content);
    }
    if (config.extractCharges) {
      metadata.charges = this.extractCharges(content);
    }
    if (config.extractStatutes) {
      metadata.statutes = this.extractStatutes(content);
    }
    if (config.extractExhibits) {
      metadata.exhibits = this.extractExhibits(content);
    }
    if (config.extractWitnesses) {
      metadata.witnesses = this.extractWitnesses(content);
    }

    return metadata;
  }

  // Helper methods for extracting legal metadata
  extractCitations(content) {
    // Implementation for extracting legal citations
    return [];
  }

  extractParties(content) {
    // Implementation for extracting party names
    return [];
  }

  extractDates(content) {
    // Implementation for extracting important dates
    return [];
  }

  extractJudges(content) {
    // Implementation for extracting judge information
    return [];
  }

  extractCaseNumbers(content) {
    // Implementation for extracting case numbers
    return [];
  }

  extractVenues(content) {
    // Implementation for extracting court venues
    return [];
  }

  extractCharges(content) {
    // Implementation for extracting criminal charges
    return [];
  }

  extractStatutes(content) {
    // Implementation for extracting referenced statutes
    return [];
  }

  extractExhibits(content) {
    // Implementation for extracting exhibit information
    return [];
  }

  extractWitnesses(content) {
    // Implementation for extracting witness information
    return [];
  }

  async extractQuotesByCategory($, url, category, subCategory) {
    const quotes = [];
    
    switch(category) {
      case 'legal':
        // Enhanced extraction for legal documents
        $('p, div[class*="document"], div[class*="content"], div[class*="legal"]').each((i, el) => {
          const text = $(el).text().trim();
          if (text.includes('Trump') && text.length >= this.config.minQuoteLength) {
            quotes.push(this.createQuote(text, url, 'legal_document'));
          }
        });
        break;

      case 'official_documents':
        if (subCategory === 'legal_documents') {
          // Enhanced extraction for official legal documents
          $('p, div[class*="document"], div[class*="content"], div[class*="legal"]').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length >= this.config.minQuoteLength) {
              quotes.push(this.createQuote(text, url, 'official_legal'));
            }
          });
        } else {
          // Default extraction for other official documents
          $('p, div[class*="document"], div[class*="content"]').each((i, el) => {
            const text = $(el).text().trim();
            if (text.length >= this.config.minQuoteLength) {
              quotes.push(this.createQuote(text, url, `official_${subCategory}`));
            }
          });
        }
        break;

      default:
        // Default extraction for other categories
        $('p, blockquote, div[class*="content"]').each((i, el) => {
          const text = $(el).text().trim();
          if (text.includes('Trump') && text.length >= this.config.minQuoteLength && text.length <= this.config.maxQuoteLength) {
            quotes.push(this.createQuote(text, url, category));
          }
        });
    }

    return quotes;
  }

  createQuote(text, url, extractionMethod) {
    return {
      quote_text: text,
      source_url: url,
      extractionMethod,
      context: {
        timestamp: new Date().toISOString(),
        extractionMethod
      }
    };
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed successfully');
    }
    if (this.ocrWorker) {
      await this.ocrWorker.terminate();
      logger.info('OCR worker terminated successfully');
    }
  }
} 