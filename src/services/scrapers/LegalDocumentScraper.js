import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';
import { delay, retry } from '../../utils/helpers.js';
import { logger } from '../../utils/logger.js';
import { getRandomUserAgent } from '../../utils/userAgents.js';
import { Quote } from '../../models/Quote.js';
import { createWorker } from 'tesseract.js';
import pdf from 'pdf-parse';
import fs from 'fs/promises';
import path from 'path';
import sqlite3 from 'sqlite3';
import fetch from 'node-fetch';
import { ProxyManager } from '../../utils/proxyManager.js';

// Add stealth plugin and use defaults
puppeteer.use(StealthPlugin());

const defaultConfig = {
    maxConcurrency: 3,
    requestDelay: { min: 5000, max: 10000 },
    maxRequestsPerDomain: 50,
    pageTimeout: 60000,
    downloadPDFs: true,
    extractMetadata: true,
    categorizeByType: true,
    storeFullText: true,
    verifySignatures: true,
    extractSignedBy: true,
    includeAttachments: true,
    validateDocuments: true,
    legal_documents: {
        extractCitations: true,
        extractParties: true,
        extractDates: true,
        extractJudges: true,
        extractCaseNumbers: true,
        extractVenues: true,
        extractCharges: true,
        extractStatutes: true,
        extractExhibits: true,
        extractWitnesses: true,
        maxPDFSize: 100 * 1024 * 1024,
        ocrEnabled: true,
        ocrLanguage: 'eng',
        pdfTextExtraction: 'hybrid'
    }
};

export class LegalDocumentScraper {
    constructor(config = {}) {
        this.config = {
            ...defaultConfig,
            ...config,
            baseUrl: 'https://www.courtlistener.com',
            name: 'CourtListener',
            categoryId: 6 // Legal News category
        };
        
        this.browser = null;
        this.pagePool = [];
        this.domainRequests = new Map();
        this.ocrWorker = null;
        this.pool = null;
        this.sourceId = null;
        this.proxyManager = new ProxyManager();
    }

    async initialize() {
        try {
            logger.info('Initializing LegalDocumentScraper...');
            
            // Load proxies
            const proxiesLoaded = await this.proxyManager.loadProxies();
            if (!proxiesLoaded) {
                logger.warn('No proxies loaded, will run without proxy rotation');
            }

            // Get next proxy
            const proxyString = this.proxyManager.getProxyString();
            const proxyArgs = proxyString ? [`--proxy-server=${proxyString}`] : [];

            this.browser = await puppeteer.launch({
                headless: 'new',
                executablePath: executablePath(),
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--window-size=1920x1080',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    ...proxyArgs
                ]
            });
            this.page = await this.browser.newPage();

            // Set a more realistic viewport
            await this.page.setViewport({ width: 1920, height: 1080 });

            // Set user agent to look like a real browser
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

            // Set extra headers
            await this.page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'sec-ch-ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'Sec-Fetch-Dest': 'document',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-User': '?1',
                'Upgrade-Insecure-Requests': '1'
            });

            // Enable JavaScript
            await this.page.setJavaScriptEnabled(true);

            // Create documents directory structure
            await this.createDirectoryStructure();

            // Initialize SQLite database
            await new Promise((resolve, reject) => {
                this.db = new sqlite3.Database('trump_scanner.db', async (err) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    // Create tables if they don't exist
                    this.db.run(`
                        CREATE TABLE IF NOT EXISTS sources (
                            id INTEGER PRIMARY KEY AUTOINCREMENT,
                            name TEXT NOT NULL,
                            url TEXT UNIQUE NOT NULL,
                            category_id INTEGER,
                            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
                        )
                    `, (err) => {
                        if (err) {
                            reject(err);
                            return;
                        }

                        this.db.run(`
                            CREATE TABLE IF NOT EXISTS legal_documents (
                                id INTEGER PRIMARY KEY AUTOINCREMENT,
                                source_id INTEGER,
                                url TEXT UNIQUE,
                                title TEXT,
                                case_number TEXT,
                                court TEXT,
                                filing_date TEXT,
                                content TEXT,
                                metadata TEXT,
                                pdf_urls TEXT,
                                downloaded_pdfs TEXT,
                                pdf_content TEXT,
                                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                                FOREIGN KEY (source_id) REFERENCES sources(id)
                            )
                        `, async (err) => {
                            if (err) {
                                reject(err);
                                return;
                            }

                            try {
                                // Get or create source record
                                const source = await new Promise((resolve, reject) => {
                                    this.db.get(
                                        'SELECT id FROM sources WHERE url = ?',
                                        [this.config.baseUrl],
                                        async (err, row) => {
                                            if (err) {
                                                reject(err);
                                                return;
                                            }

                                            if (row) {
                                                resolve(row);
                                            } else {
                                                this.db.run(
                                                    'INSERT INTO sources (name, url, category_id) VALUES (?, ?, ?)',
                                                    [this.config.name, this.config.baseUrl, this.config.categoryId],
                                                    function(err) {
                                                        if (err) {
                                                            reject(err);
                                                            return;
                                                        }
                                                        resolve({ id: this.lastID });
                                                    }
                                                );
                                            }
                                        }
                                    );
                                });

                                this.sourceId = source.id;
                                resolve();
                            } catch (error) {
                                reject(error);
                            }
                        });
                    });
                });
            });

            logger.info('LegalDocumentScraper initialized successfully');
            return true;
        } catch (error) {
            logger.error('Error initializing LegalDocumentScraper:', error);
            throw error;
        }
    }

    async createDirectoryStructure() {
        const baseDir = path.join(process.cwd(), 'documents');
        const dirs = [
            'legal/criminal_cases',
            'legal/civil_cases',
            'legal/appeals',
            'legal/indictments',
            'legal/pdfs',
            'legal/transcripts'
        ];

        for (const dir of dirs) {
            await fs.mkdir(path.join(baseDir, dir), { recursive: true });
        }
    }

    async scrapeLegalDocument(url) {
        try {
            logger.info(`Scraping legal document from ${url}`);

            // Create a new page for this request
            const page = await this.browser.newPage();
            
            try {
                // Try using ScrapeOps API first
                try {
                    const apiUrl = `https://proxy.scrapeops.io/v1/?api_key=${process.env.SCRAPEOPS_API_KEY}&url=${encodeURIComponent(url)}`;
                    const response = await fetch(apiUrl);
                    const html = await response.text();

                    if (!html.includes('JavaScript is disabled') && !html.includes('Checking if the site connection is secure')) {
                        await page.setContent(html);

                        // Extract data based on the URL
                        let documentData;
                        if (url.includes('courtlistener.com')) {
                            documentData = await this.extractCourtListenerData(page);
                        } else if (url.includes('documentcloud.org')) {
                            documentData = await this.extractDocumentCloudData(page);
                        } else {
                            throw new Error('Unsupported document source');
                        }

                        return documentData;
                    }
                } catch (error) {
                    logger.error('Error using ScrapeOps API:', error);
                }

                // If ScrapeOps fails, try direct access with retry logic
                let retryCount = 0;
                const maxRetries = 3;
                let success = false;

                while (!success && retryCount < maxRetries) {
                    try {
                        // Get next proxy for this attempt
                        const proxyString = this.proxyManager.getProxyString();
                        if (proxyString) {
                            logger.info(`Using proxy: ${proxyString}`);
                            await page.authenticate({
                                username: this.proxyManager.getProxyAuthString(),
                                password: '' // Add password if needed
                            });
                        }

                        await page.goto(url, {
                            waitUntil: 'networkidle0',
                            timeout: 60000
                        });

                        // Check for Cloudflare protection
                        const cloudflareContent = await page.content();
                        if (cloudflareContent.includes('Just a moment') || 
                            cloudflareContent.includes('Checking if the site connection is secure') ||
                            cloudflareContent.includes('JavaScript is disabled')) {
                            logger.info('Detected Cloudflare protection, waiting for challenge to complete...');
                            
                            // Wait for Cloudflare to finish
                            await page.waitForFunction(() => {
                                return !document.querySelector('#challenge-running') &&
                                       !document.querySelector('#challenge-stage') &&
                                       !document.querySelector('#challenge-form');
                            }, { timeout: 30000 });

                            // Additional wait to ensure page is fully loaded
                            await new Promise(resolve => setTimeout(resolve, 5000));
                        }

                        // Wait for main content to load
                        await page.waitForSelector('body', { timeout: 10000 });

                        // Check if we got the actual content
                        const pageContent = await page.content();
                        if (!pageContent.includes('JavaScript is disabled') && 
                            !pageContent.includes('Checking if the site connection is secure')) {
                            success = true;
                        } else {
                            logger.info('Still getting Cloudflare page, retrying with next proxy...');
                            await new Promise(resolve => setTimeout(resolve, 5000));
                            retryCount++;
                        }
                    } catch (error) {
                        logger.error(`Navigation attempt ${retryCount + 1} failed:`, error);
                        if (retryCount < maxRetries - 1) {
                            const waitTime = Math.pow(2, retryCount) * 1000;
                            logger.info(`Waiting ${waitTime}ms before retry...`);
                            await new Promise(resolve => setTimeout(resolve, waitTime));
                        }
                        retryCount++;
                    }
                }

                if (!success) {
                    throw new Error(`Failed to load page after ${maxRetries} attempts`);
                }

                // Take a screenshot for debugging
                await page.screenshot({ path: 'debug/screenshots/debug-screenshot.png' });

                // Extract document data based on the URL
                let documentData;
                if (url.includes('courtlistener.com')) {
                    documentData = await this.extractCourtListenerData(page);
                } else if (url.includes('documentcloud.org')) {
                    documentData = await this.extractDocumentCloudData(page);
                } else {
                    throw new Error('Unsupported document source');
                }

                logger.info('Document data extracted successfully');
                return documentData;

            } finally {
                // Always close the page when we're done
                await page.close();
            }

        } catch (error) {
            logger.error('Error scraping legal document:', error);
            throw error;
        }
    }

    async extractCourtListenerData(page) {
        try {
            logger.info('Extracting data from CourtListener...');

            // Log the page content for debugging
            const pageContent = await page.content();
            logger.info('Page content length:', pageContent.length);
            
            // Wait for any content to load
            await page.waitForSelector('body', { timeout: 30000 });
            logger.info('Body loaded');

            // Log available elements
            const elements = await page.evaluate(() => {
                const all = document.querySelectorAll('*');
                return Array.from(all, el => ({
                    tag: el.tagName.toLowerCase(),
                    id: el.id,
                    classes: Array.from(el.classList)
                }));
            });
            logger.info('Available elements:', JSON.stringify(elements, null, 2));

            // Try different selectors for the title
            const title = await page.evaluate(() => {
                // Try multiple possible selectors
                const selectors = [
                    '.docket-header h2',
                    'h1',
                    'h2',
                    '.docket-title',
                    '.case-title',
                    '.case-name'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.textContent.trim();
                    }
                }
                return null;
            });
            logger.info('Title:', title);

            // Try different selectors for case number
            const caseNumber = await page.evaluate(() => {
                const selectors = [
                    '.docket-number',
                    '.case-number',
                    '[data-case-number]',
                    '.docket-header small'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.textContent.trim();
                    }
                }
                return null;
            });
            logger.info('Case Number:', caseNumber);

            // Try different selectors for court
            const court = await page.evaluate(() => {
                const selectors = [
                    '.court-name',
                    '.court-info',
                    '[data-court]',
                    '.docket-header .court'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.textContent.trim();
                    }
                }
                return null;
            });
            logger.info('Court:', court);

            // Try different selectors for filing date
            const filingDate = await page.evaluate(() => {
                const selectors = [
                    '.filing-date',
                    '.date-filed',
                    '[data-date]',
                    'time[datetime]'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.getAttribute('datetime') || element.textContent.trim();
                    }
                }
                return null;
            });
            logger.info('Filing Date:', filingDate);

            // Try different selectors for PDF links
            const pdfUrls = await page.evaluate(() => {
                const selectors = [
                    'a[href*="/recap/"]',
                    'a[href$=".pdf"]',
                    '.document-link',
                    '.attachment-link'
                ];
                
                const urls = new Set();
                for (const selector of selectors) {
                    const elements = document.querySelectorAll(selector);
                    elements.forEach(el => {
                        if (el.href) {
                            urls.add(el.href);
                        }
                    });
                }
                return Array.from(urls);
            });
            logger.info('PDF URLs:', pdfUrls);

            // Try different selectors for main content
            const content = await page.evaluate(() => {
                const selectors = [
                    '.docket-entries',
                    '.case-content',
                    '.main-content',
                    '#main-content'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.textContent.trim();
                    }
                }
                return null;
            });
            logger.info('Content length:', content?.length || 0);

            // Take a screenshot for debugging
            await page.screenshot({ path: 'debug/screenshots/debug-page.png' });

            // Extract additional metadata
            const metadata = {
                title,
                caseNumber,
                court,
                filingDate,
                url: page.url(),
                dateScraped: new Date().toISOString()
            };

            return {
                title: title || null,
                case_number: caseNumber || null,
                court: court || null,
                filing_date: filingDate || null,
                content: content || null,
                metadata,
                pdfUrls,
                downloadedPdfs: [],
                pdfContent: []
            };

        } catch (error) {
            logger.error('Error extracting CourtListener data:', error);
            throw error;
        }
    }

    async extractDocumentCloudData(page) {
        try {
            logger.info('Extracting data from DocumentCloud...');

            // Wait for the document to load
            await page.waitForSelector('.DC-page', { timeout: 10000 });

            // Extract metadata from meta tags
            const metadata = await page.evaluate(() => {
                const metaTags = document.querySelectorAll('meta[property^="og:"]');
                const data = {};
                metaTags.forEach(tag => {
                    const property = tag.getAttribute('property');
                    const content = tag.getAttribute('content');
                    if (property && content) {
                        data[property] = content;
                    }
                });
                return data;
            });
            logger.info('Metadata:', metadata);

            // Extract PDF URL
            const pdfUrl = await page.$eval('link[type="application/pdf"]', el => el.href)
                .catch(() => null);
            const pdfUrls = pdfUrl ? [pdfUrl] : [];
            logger.info('PDF URLs:', pdfUrls);

            // Extract content
            const content = await page.$eval('.DC-page', el => el.textContent.trim())
                .catch(() => null);
            logger.info('Content length:', content?.length || 0);

            return {
                title: metadata['og:title'] || null,
                case_number: null,
                court: null,
                filing_date: null,
                content: content || null,
                metadata,
                pdfUrls,
                downloadedPdfs: [],
                pdfContent: []
            };

        } catch (error) {
            logger.error('Error extracting DocumentCloud data:', error);
            throw error;
        }
    }

    async downloadPDFs(urls) {
        const downloadedFiles = [];
        for (const url of urls) {
            try {
                const response = await fetch(url);
                if (!response.ok) throw new Error(`HTTP ${response.status}`);

                const buffer = await response.arrayBuffer();
                if (buffer.byteLength > this.config.legal_documents.maxPDFSize) {
                    logger.warn(`Skipping large PDF: ${url}`);
                    continue;
                }

                const filename = `${Date.now()}_${path.basename(url)}`;
                const filepath = path.join(process.cwd(), 'documents/legal/pdfs', filename);
                
                await fs.writeFile(filepath, Buffer.from(buffer));
                downloadedFiles.push(filepath);
                
                logger.info(`Downloaded PDF: ${filename}`);
                
                // Respect rate limits
                await delay(this.config.requestDelay.min);
                
            } catch (error) {
                logger.error(`Error downloading PDF from ${url}:`, error);
            }
        }
        return downloadedFiles;
    }

    async extractPDFContent(filepaths) {
        const contents = [];
        for (const filepath of filepaths) {
            try {
                // Try PDF text extraction first
                const dataBuffer = await fs.readFile(filepath);
                const pdfData = await pdf(dataBuffer);
                let text = pdfData.text;

                // If text extraction yields little content and OCR is enabled, try OCR
                if (this.config.legal_documents.ocrEnabled && 
                    text.length < 1000 && this.ocrWorker) {
                    logger.info(`Attempting OCR on: ${filepath}`);
                    const { data: { text: ocrText } } = await this.ocrWorker.recognize(filepath);
                    
                    // Use OCR text if it yielded more content
                    if (ocrText.length > text.length) {
                        text = ocrText;
                    }
                }

                contents.push({
                    filepath,
                    text,
                    pageCount: pdfData.numpages,
                    metadata: pdfData.metadata
                });

            } catch (error) {
                logger.error(`Error extracting content from PDF ${filepath}:`, error);
            }
        }
        return contents;
    }

    async saveDocument(documentData) {
        try {
            return new Promise((resolve, reject) => {
                // Prepare JSON fields
                const metadata = documentData.metadata ? JSON.stringify(documentData.metadata) : '{}';
                const pdfUrls = documentData.pdfUrls ? JSON.stringify(documentData.pdfUrls) : '[]';
                const downloadedPdfs = documentData.downloadedPdfs ? JSON.stringify(documentData.downloadedPdfs) : '[]';
                const pdfContent = documentData.pdfContent ? JSON.stringify(documentData.pdfContent) : '[]';

                // Insert or update the legal document
                this.db.run(`
                    INSERT OR REPLACE INTO legal_documents (
                        source_id, url, title, case_number, court, 
                        filing_date, content, metadata, pdf_urls,
                        downloaded_pdfs, pdf_content, updated_at
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)`,
                    [
                        this.sourceId || null,
                        documentData.url || null,
                        documentData.title || null,
                        documentData.caseNumber || null,
                        documentData.court || null,
                        documentData.filingDate || null,
                        documentData.content || null,
                        metadata,
                        pdfUrls,
                        downloadedPdfs,
                        pdfContent
                    ],
                    function(err) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        logger.info(`Saved legal document ${this.lastID} to database`);
                        resolve(this.lastID);
                    }
                );
            });
        } catch (error) {
            logger.error('Error saving legal document to database:', error);
            throw error;
        }
    }

    async cleanup() {
        if (this.ocrWorker) {
            await this.ocrWorker.terminate();
        }
        if (this.browser) {
            await this.browser.close();
        }
        if (this.db) {
            await new Promise((resolve, reject) => {
                this.db.close((err) => {
                    if (err) {
                        reject(err);
                    } else {
                        resolve();
                    }
                });
            });
        }
    }
} 