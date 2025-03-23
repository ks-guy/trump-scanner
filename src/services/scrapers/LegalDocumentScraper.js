import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { executablePath } from 'puppeteer';
import { delay, retry } from '../../utils/helpers.js';
import { logger } from '../../utils/logger.js';
import { getRandomUserAgent } from '../../utils/userAgents.js';
import { Quote } from '../../models/Quote.js';
import { createWorker } from 'tesseract.js';
import { parsePDF } from '../../utils/pdfParser.js';
import fs from 'fs/promises';
import path from 'path';
import { PrismaClient } from '@prisma/client';
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
        this.prisma = new PrismaClient();
    }

    async initialize() {
        try {
            logger.info('Initializing LegalDocumentScraper...');
            
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
                    '--disable-features=IsolateOrigins,site-per-process'
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

            // Get or create source record
            const source = await this.prisma.source.upsert({
                where: { url: this.config.baseUrl },
                update: {},
                create: {
                    name: this.config.name,
                    url: this.config.baseUrl,
                    categoryId: this.config.categoryId
                }
            });

            this.sourceId = source.id;

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
                // Use ScrapeOps API to get the content
                const apiUrl = `https://proxy.scrapeops.io/v1/?api_key=1e3ddfbb-c565-4464-b425-1d59057c7ad0&url=${encodeURIComponent(url)}`;
                const response = await fetch(apiUrl);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}`);
                }

                const html = await response.text();
                logger.info('Received HTML content from ScrapeOps');

                // Set the content in the page
                await page.setContent(html, {
                    waitUntil: 'networkidle0',
                    timeout: 60000
                });

                // Extract data based on the URL
                let documentData;
                if (url.includes('courtlistener.com')) {
                    documentData = await this.extractCourtListenerData(page);
                } else if (url.includes('documentcloud.org')) {
                    documentData = await this.extractDocumentCloudData(page);
                } else {
                    throw new Error('Unsupported document source');
                }

                // Add URL to document data
                documentData.url = url;
                documentData.metadata.url = url;

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

            // Wait for the main content to load with a longer timeout
            await page.waitForSelector('body', { timeout: 60000 });
            logger.info('Body loaded');

            // Take a screenshot for debugging
            await page.screenshot({ path: 'debug/screenshots/debug-page.png' });

            // Log the page content for debugging
            const pageContent = await page.content();
            logger.info('Page content length:', pageContent.length);

            // Extract title
            const title = await page.evaluate(() => {
                const selectors = [
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

            // Extract case number
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

            // Extract court
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

            // Extract filing date
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

            // Extract PDF URLs
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

            // Extract main content
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
                return document.body.textContent.trim();
            });
            logger.info('Content length:', content?.length || 0);

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

            // Wait for any content to load with a longer timeout
            await page.waitForSelector('body', { timeout: 30000 });

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

            // Try different selectors for PDF URL
            const pdfUrl = await page.evaluate(() => {
                const selectors = [
                    'link[type="application/pdf"]',
                    'a[href$=".pdf"]',
                    '.document-pdf-link',
                    '.pdf-download'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.href;
                    }
                }
                return null;
            });
            const pdfUrls = pdfUrl ? [pdfUrl] : [];
            logger.info('PDF URLs:', pdfUrls);

            // Try different selectors for content
            const content = await page.evaluate(() => {
                const selectors = [
                    '.DC-page',
                    '.document-content',
                    '.document-text',
                    '#document-content',
                    'article',
                    'main'
                ];
                
                for (const selector of selectors) {
                    const element = document.querySelector(selector);
                    if (element) {
                        return element.textContent.trim();
                    }
                }
                return document.body.textContent.trim();
            });
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

    async downloadPDFs(documentData) {
        try {
            logger.info('Downloading PDFs...');
            const pdfs = [];

            for (const pdfUrl of documentData.pdfUrls) {
                try {
                    // Skip non-PDF URLs
                    if (!pdfUrl.toLowerCase().endsWith('.pdf')) {
                        logger.info(`Skipping non-PDF URL: ${pdfUrl}`);
                        continue;
                    }

                    // Use ScrapeOps API for PDF downloads
                    const apiUrl = `https://proxy.scrapeops.io/v1/?api_key=1e3ddfbb-c565-4464-b425-1d59057c7ad0&url=${encodeURIComponent(pdfUrl)}`;
                    const response = await fetch(apiUrl);
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}`);
                    }

                    const buffer = await response.arrayBuffer();
                    const timestamp = Date.now();
                    const filename = `${timestamp}_${pdfUrl.split('/').pop()}`;
                    const filepath = path.join(this.config.directories.pdfs, filename);

                    // Save the PDF
                    await fs.writeFile(filepath, Buffer.from(buffer));
                    logger.info(`Downloaded PDF: ${filename}`);

                    // Parse the PDF
                    const pdfData = await this.parsePDF(filepath);
                    pdfs.push({
                        filename,
                        filepath,
                        ...pdfData
                    });

                } catch (error) {
                    logger.error(`Error downloading PDF from ${pdfUrl}:`, error);
                }
            }

            return pdfs;
        } catch (error) {
            logger.error('Error downloading PDFs:', error);
            throw error;
        }
    }

    async extractPDFContent(filepaths) {
        const contents = [];
        for (const filepath of filepaths) {
            try {
                // Check if file exists
                try {
                    await fs.access(filepath);
                } catch (error) {
                    logger.error(`PDF file not found: ${filepath}`);
                    continue;
                }

                // Try PDF text extraction first
                const dataBuffer = await fs.readFile(filepath);
                let text = '';
                let pageCount = 0;
                let metadata = {};

                try {
                    const pdfData = await parsePDF(dataBuffer);
                    text = pdfData.text;
                    pageCount = pdfData.numpages;
                    metadata = pdfData.metadata;
                } catch (error) {
                    logger.error(`Error parsing PDF ${filepath}:`, error);
                    // Continue with empty text, we'll try OCR if enabled
                }

                // If text extraction yielded little content and OCR is enabled, try OCR
                if (this.config.legal_documents.ocrEnabled && 
                    text.length < 1000) {
                    try {
                        if (!this.ocrWorker) {
                            this.ocrWorker = await createWorker(this.config.legal_documents.ocrLanguage);
                        }
                        logger.info(`Attempting OCR on: ${filepath}`);
                        const { data: { text: ocrText } } = await this.ocrWorker.recognize(filepath);
                        
                        // Use OCR text if it yielded more content
                        if (ocrText.length > text.length) {
                            text = ocrText;
                        }
                    } catch (error) {
                        logger.error(`Error performing OCR on ${filepath}:`, error);
                    }
                }

                contents.push({
                    filepath,
                    text,
                    pageCount,
                    metadata
                });

            } catch (error) {
                logger.error(`Error processing PDF ${filepath}:`, error);
            }
        }
        return contents;
    }

    async saveDocument(documentData) {
        try {
            const savedDoc = await this.prisma.document.upsert({
                where: { url: documentData.url || documentData.metadata?.url || '' },
                update: {
                    content: documentData.content || '',
                    type: 'legal',
                    metadata: JSON.stringify({
                        title: documentData.title,
                        caseNumber: documentData.case_number,
                        court: documentData.court,
                        filingDate: documentData.filing_date,
                        pdfUrls: documentData.pdfUrls,
                        downloadedPdfs: documentData.downloadedPdfs,
                        pdfContent: documentData.pdfContent,
                        url: documentData.url || documentData.metadata?.url
                    })
                },
                create: {
                    url: documentData.url || documentData.metadata?.url || '',
                    content: documentData.content || '',
                    type: 'legal',
                    metadata: JSON.stringify({
                        title: documentData.title,
                        caseNumber: documentData.case_number,
                        court: documentData.court,
                        filingDate: documentData.filing_date,
                        pdfUrls: documentData.pdfUrls,
                        downloadedPdfs: documentData.downloadedPdfs,
                        pdfContent: documentData.pdfContent,
                        url: documentData.url || documentData.metadata?.url
                    })
                }
            });

            logger.info(`Saved legal document ${savedDoc.id} to database`);
            return savedDoc;
        } catch (error) {
            logger.error('Error saving legal document:', error);
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
    }
} 