import puppeteer from 'puppeteer';
import { delay, retry } from '../../utils/helpers.js';
import { logger } from '../../utils/logger.js';
import { getRandomUserAgent } from '../../utils/userAgents.js';
import { Quote } from '../../models/Quote.js';

export class QuoteScraperService {
    constructor(config = {}) {
        this.config = {
            maxConcurrency: config.concurrency || 50,
            requestDelay: config.requestDelay || { min: 1000, max: 3000 },
            maxRequestsPerDomain: config.maxRequestsPerDomain || 1000,
            userAgent: config.userAgent || getRandomUserAgent(),
            pageTimeout: config.pageTimeout || 60000,
            maxRetries: config.maxRetries || 3
        };
        
        this.domainRequests = new Map();
        this.pagePool = [];
        this.browser = null;
        this.isInitialized = false;

        // Reset domain requests every hour
        setInterval(() => {
            this.domainRequests.clear();
            logger.info('Domain request counters reset');
        }, 3600000); // 1 hour
    }

    async initialize() {
        if (this.isInitialized) return;

        try {
            // Initialize browser with optimized settings
            this.browser = await puppeteer.launch({
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--disable-web-security',
                    '--disable-features=site-per-process',
                    '--disable-features=IsolateOrigins',
                    '--disable-features=site-isolation-trial',
                    '--disable-features=BlockInsecurePrivateNetworkRequests'
                ]
            });

            // Initialize page pool
            await this.initializePagePool();

            // Initialize database
            await Quote.initialize();
            
            this.isInitialized = true;
            logger.info('QuoteScraperService initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize QuoteScraperService:', error);
            throw error;
        }
    }

    async initializePagePool() {
        for (let i = 0; i < this.config.maxConcurrency; i++) {
            const page = await this.createPage();
            this.pagePool.push(page);
        }
    }

    async createPage() {
        const page = await this.browser.newPage();
        
        // Set user agent
        await page.setUserAgent(this.config.userAgent);
        
        // Optimize page settings
        await page.setRequestInterception(true);
        page.on('request', (req) => {
            if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                req.abort();
            } else {
                req.continue();
            }
        });

        // Set default timeout
        page.setDefaultTimeout(this.config.pageTimeout);

        return page;
    }

    async acquirePage() {
        const page = this.pagePool.pop();
        if (page) return page;

        // If no pages available, create a new one
        return await this.createPage();
    }

    async releasePage(page) {
        if (this.pagePool.length < this.config.maxConcurrency) {
            this.pagePool.push(page);
        } else {
            await page.close();
        }
    }

    async scrapeUrl(url, retryCount = 0) {
        let page = null;
        try {
            // Check rate limits
            const domain = new URL(url).hostname;
            const isTestFile = url.includes('test');
            
            if (!isTestFile && this.isDomainLimited(domain)) {
                throw new Error(`Request limit exceeded for domain: ${domain}`);
            }

            // Skip already scraped URLs unless they are test files
            if (!isTestFile && await this.hasBeenScraped(url)) {
                logger.info(`URL ${url} has already been scraped. Skipping...`);
                return [];
            }

            // Get a page from the pool
            page = await this.acquirePage();

            // Random delay between requests
            const delayTime = Math.floor(
                Math.random() * (this.config.requestDelay.max - this.config.requestDelay.min) 
                + this.config.requestDelay.min
            );
            await delay(delayTime);

            try {
                // Navigate to URL with retry logic
                await retry(
                    async () => {
                        const response = await page.goto(url, { 
                            waitUntil: 'networkidle0',
                            timeout: this.config.pageTimeout
                        });
                        
                        if (!response.ok()) {
                            throw new Error(`HTTP ${response.status()}: ${response.statusText()}`);
                        }
                    },
                    this.config.maxRetries,
                    `Failed to load URL: ${url}`
                );
            } catch (navigationError) {
                // Handle navigation errors (404, network issues, etc.)
                if (navigationError.message.includes('net::ERR_ABORTED') || 
                    navigationError.message.includes('HTTP 404')) {
                    throw new Error(`Page not found: ${url}`);
                }
                throw navigationError;
            }

            // Extract quotes
            const quotes = await this.extractQuotes(page, url);

            // Save quotes if not a test
            if (!isTestFile && quotes.length > 0) {
                await Quote.bulkInsert(quotes.map(q => ({
                    source_url: url,
                    quote_text: q.text,
                    context: {
                        timestamp: q.timestamp,
                        ...q.context
                    }
                })));
            }

            // Increment domain request count
            this.incrementDomainRequests(domain);

            return quotes;

        } catch (error) {
            if (retryCount < this.config.maxRetries && 
                !error.message.includes('Page not found') && 
                !error.message.includes('Request limit exceeded')) {
                logger.warn(`Retrying URL ${url} (attempt ${retryCount + 1}/${this.config.maxRetries})`);
                return this.scrapeUrl(url, retryCount + 1);
            }
            throw error;
        } finally {
            if (page) {
                await this.releasePage(page);
            }
        }
    }

    async scrapeQuotes(sourceUrl) {
        await this.initialize();
        const domain = new URL(sourceUrl).hostname;

        // Check if URL has already been scraped
        const existingQuotes = await Quote.findBySourceUrl(sourceUrl);
        if (existingQuotes.length > 0) {
            logger.info(`URL ${sourceUrl} has already been scraped. Skipping...`);
            return existingQuotes;
        }

        // Check domain request limits
        if (this.isDomainLimited(domain)) {
            throw new Error(`Request limit exceeded for domain: ${domain}`);
        }

        try {
            const page = await this.browser.newPage();
            await page.setUserAgent(this.config.userAgent);
            
            // Set request interception to block unnecessary resources
            await page.setRequestInterception(true);
            page.on('request', (req) => {
                if (['image', 'stylesheet', 'font', 'media'].includes(req.resourceType())) {
                    req.abort();
                } else {
                    req.continue();
                }
            });

            // Add domain request count
            this.incrementDomainRequests(domain);

            // Random delay between requests
            const delayTime = Math.floor(
                Math.random() * (this.config.requestDelay.max - this.config.requestDelay.min) 
                + this.config.requestDelay.min
            );
            await delay(delayTime);

            // Navigate to page and wait for content
            await page.goto(sourceUrl, { waitUntil: 'networkidle0', timeout: 60000 });
            
            // Wait for specific elements based on the domain
            if (domain === 'www.c-span.org') {
                await page.waitForSelector('.transcript-line', { timeout: 60000 })
                    .catch(() => logger.warn('Content selector not found'));
            }

            // Log the page title and URL for debugging
            const pageTitle = await page.title();
            logger.info(`Page title: ${pageTitle}`);
            logger.info(`Current URL: ${await page.url()}`);

            // Extract quotes using custom selectors based on source
            const quotes = await this.extractQuotes(page, sourceUrl);
            
            // Store quotes in database
            if (quotes.length > 0) {
                await retry(async () => {
                    await Quote.bulkInsert(quotes.map(q => ({
                        source_url: sourceUrl,
                        text: q.text,
                        context: {
                            timestamp: q.timestamp,
                            metadata: q.metadata,
                            context: q.context
                        }
                    })));
                    logger.info(`Successfully stored ${quotes.length} quotes from ${sourceUrl}`);
                });
            }

            await page.close();
            return quotes;

        } catch (error) {
            logger.error(`Error scraping quotes from ${sourceUrl}:`, error);
            throw error;
        }
    }

    async extractQuotes(page, sourceUrl) {
        try {
            const domain = new URL(sourceUrl).hostname;
            logger.info(`Using selectors for domain ${domain}`);

            const domainSelectors = this.selectors[domain] || this.selectors['localhost'];
            
            // Detect the format based on page content
            const format = await this.detectFormat(page);
            logger.info(`Detected page format: ${format}`);

            const formatSelectors = domainSelectors.formats[format];
            if (!formatSelectors) {
                throw new Error(`No selectors found for format: ${format}`);
            }

            const quotes = [];

            // Extract quotes based on format
            switch (format) {
                case 'transcript': {
                    const elements = await page.$$(formatSelectors.quoteContainer);
                    for (const element of elements) {
                        const speaker = await element.$eval(formatSelectors.speakerSelector, el => el.textContent.trim());
                        if (speaker === formatSelectors.targetSpeaker) {
                            const text = await element.$eval('.text', el => el.textContent.trim());
                            const timestamp = await element.$eval(formatSelectors.timestamp, el => el.textContent.trim());
                            quotes.push({
                                text,
                                timestamp,
                                context: { speaker, format: 'transcript' }
                            });
                        }
                    }
                    break;
                }
                case 'article': {
                    const elements = await page.$$(formatSelectors.quoteContainer);
                    for (const element of elements) {
                        const text = await element.$eval(formatSelectors.quoteText, el => el.textContent.trim());
                        const attribution = await element.$eval(formatSelectors.attribution, el => el.textContent.trim());
                        if (attribution.toLowerCase().includes('trump')) {
                            const timestamp = await page.$eval(formatSelectors.timestamp, el => el.getAttribute('datetime'));
                            quotes.push({
                                text: text.replace(/^["']|["']$/g, ''), // Remove surrounding quotes
                                timestamp,
                                context: { attribution, format: 'article' }
                            });
                        }
                    }
                    break;
                }
                case 'social': {
                    const elements = await page.$$(formatSelectors.quoteContainer);
                    for (const element of elements) {
                        const author = await element.$eval(formatSelectors.author, el => el.textContent.trim());
                        if (author.toLowerCase().includes('trump')) {
                            const text = await element.$eval(formatSelectors.quoteText, el => el.textContent.trim());
                            const timestamp = await element.$eval(formatSelectors.timestamp, el => el.textContent.trim());
                            const stats = await element.$eval(formatSelectors.stats, el => el.textContent.trim());
                            quotes.push({
                                text,
                                timestamp,
                                context: { author, stats, format: 'social' }
                            });
                        }
                    }
                    break;
                }
                default:
                    throw new Error(`Unsupported format: ${format}`);
            }

            logger.info(`Found ${quotes.length} quotes`);
            return quotes;

        } catch (error) {
            logger.error('Error extracting quotes:', error);
            throw error;
        }
    }

    async detectFormat(page) {
        // Check for transcript format
        const hasTranscript = await page.$('.transcript') !== null;
        if (hasTranscript) return 'transcript';

        // Check for article format
        const hasArticle = await page.$('article') !== null;
        if (hasArticle) return 'article';

        // Check for social media format
        const hasSocialFeed = await page.$('.social-feed') !== null;
        if (hasSocialFeed) return 'social';

        throw new Error('Unknown page format');
    }

    get selectors() {
        return {
            'localhost': {
                formats: {
                    transcript: {
                        quoteContainer: '.transcript-line',
                        speakerSelector: '.speaker',
                        targetSpeaker: 'TRUMP:',
                        timestamp: '.timestamp'
                    },
                    article: {
                        quoteContainer: '.quote-block',
                        quoteText: '.quote-text',
                        attribution: '.quote-attribution',
                        timestamp: '.article-meta time'
                    },
                    social: {
                        quoteContainer: '.post',
                        quoteText: '.post-content',
                        timestamp: '.post-timestamp',
                        author: '.post-user',
                        stats: '.post-stats'
                    }
                }
            }
        };
    }

    isDomainLimited(domain) {
        const requests = this.domainRequests.get(domain) || 0;
        const isLimited = requests >= this.config.maxRequestsPerDomain;
        if (isLimited) {
            logger.warn(`Rate limit reached for domain ${domain}: ${requests}/${this.config.maxRequestsPerDomain} requests`);
        }
        return isLimited;
    }

    incrementDomainRequests(domain) {
        const currentCount = this.domainRequests.get(domain) || 0;
        const newCount = currentCount + 1;
        this.domainRequests.set(domain, newCount);
        logger.info(`Domain ${domain} request count: ${newCount}/${this.config.maxRequestsPerDomain}`);
        return newCount;
    }

    async cleanup() {
        // Clear the domain request reset interval
        if (this._resetInterval) {
            clearInterval(this._resetInterval);
        }

        // Close all pages in the pool
        await Promise.all(this.pagePool.map(page => page.close()));
        this.pagePool = [];

        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.isInitialized = false;
        }
    }

    async getStats() {
        return await Quote.getStats();
    }

    async hasBeenScraped(url) {
        const existingQuotes = await Quote.findBySourceUrl(url);
        return existingQuotes.length > 0;
    }
} 