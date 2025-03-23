import puppeteer from 'puppeteer';
import * as cheerio from 'cheerio';
import { Quote } from '../models/Quote.js';
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
  constructor() {
    this.browser = null;
    this.userAgents = [
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:124.0) Gecko/20100101 Firefox/124.0',
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15'
    ];
    this.proxies = [];
    this.concurrency = 50;
    this.requestDelay = randomDelay(1000, 3000);
  }

  async initialize() {
    try {
      // Load proxies
      const proxyFile = path.join(__dirname, '../../proxy.txt');
      if (await fs.access(proxyFile).then(() => true).catch(() => false)) {
        this.proxies = (await fs.readFile(proxyFile, 'utf8')).split('\n').filter(proxy => proxy.trim());
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

      logger.info('Quote scraper initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize quote scraper:', error);
      throw error;
    }
  }

  async scrapePage(url) {
    try {
      const page = await this.browser.newPage();
      
      // Set random user agent
      const userAgent = this.userAgents[Math.floor(Math.random() * this.userAgents.length)];
      await page.setUserAgent(userAgent);

      // Set proxy if available
      if (this.proxies.length > 0) {
        const proxy = this.proxies[Math.floor(Math.random() * this.proxies.length)];
        await page.authenticate({
          username: proxy.split(':')[0],
          password: proxy.split(':')[1]
        });
      }

      // Navigate to page
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
      
      // Get page content
      const content = await page.content();
      const $ = cheerio.load(content);

      // Extract quotes
      const quotes = [];
      $('p, blockquote, .quote, .tweet-text').each((i, el) => {
        const text = $(el).text().trim();
        if (text.includes('Trump') || text.includes('Donald')) {
          quotes.push({
            quote_text: text,
            source_url: url,
            context: {
              element_type: el.name,
              surrounding_text: $(el).parent().text().trim()
            }
          });
        }
      });

      // Process each quote
      for (const quote of quotes) {
        try {
          // Archive the source content
          await archiveService.archiveSource(url, content);

          // Enrich quote context
          const enrichedContext = await contextService.enrichQuoteContext(quote, content);
          quote.context = enrichedContext;

          // Verify the quote
          await verificationSystem.verifyQuote(quote, content);

          // Fact check the quote
          const factCheck = await factCheckService.verifyClaim(quote);
          quote.fact_check = factCheck;

          // Archive the quote
          await archiveService.archiveQuote(quote, content);
        } catch (error) {
          logger.error(`Error processing quote: ${error.message}`);
        }
      }

      await page.close();
      return quotes;
    } catch (error) {
      logger.error(`Error scraping page ${url}:`, error);
      return [];
    }
  }

  async scrapeUrls(urls) {
    const chunks = [];
    for (let i = 0; i < urls.length; i += this.concurrency) {
      chunks.push(urls.slice(i, i + this.concurrency));
    }

    for (const chunk of chunks) {
      const promises = chunk.map(async (url) => {
        await this.requestDelay();
        return this.scrapePage(url);
      });

      const results = await Promise.all(promises);
      const quotes = results.flat();

      if (quotes.length > 0) {
        try {
          await Quote.bulkInsert(quotes);
          logger.info(`Inserted ${quotes.length} quotes from chunk`);
        } catch (error) {
          logger.error('Failed to insert quotes:', error);
        }
      }
    }
  }

  async cleanup() {
    if (this.browser) {
      await this.browser.close();
      logger.info('Browser closed successfully');
    }
  }
} 