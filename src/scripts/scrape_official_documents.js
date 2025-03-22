import ora from 'ora';
import { sources, config } from '../config/sources.js';
import { QuoteScraperService } from '../services/scraper/QuoteScraperService.js';
import { Quote } from '../models/Quote.js';
import { logger } from '../utils/logger.js';
import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let spinner = null;
let scraper = null;

// Function to download PDF with retries
async function downloadPDF(url, filePath, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            await new Promise((resolve, reject) => {
                const request = https.get(url, {
                    timeout: 30000, // 30 second timeout
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                    }
                }, response => {
                    if (response.statusCode !== 200) {
                        reject(new Error(`Failed to download PDF: HTTP ${response.statusCode}`));
                        return;
                    }

                    const contentType = response.headers['content-type'];
                    if (!contentType || !contentType.includes('pdf')) {
                        reject(new Error('Response is not a PDF file'));
                        return;
                    }

                    const fileStream = fs.createWriteStream(filePath);
                    response.pipe(fileStream);

                    fileStream.on('finish', () => {
                        fileStream.close();
                        resolve();
                    });

                    fileStream.on('error', err => {
                        fs.unlink(filePath, () => {});
                        reject(err);
                    });

                    response.on('error', err => {
                        fs.unlink(filePath, () => {});
                        reject(err);
                    });
                });

                request.on('error', err => {
                    fs.unlink(filePath, () => {});
                    reject(err);
                });

                request.on('timeout', () => {
                    request.destroy();
                    fs.unlink(filePath, () => {});
                    reject(new Error('Request timeout'));
                });
            });

            return; // Success - exit retry loop
        } catch (error) {
            if (attempt === maxRetries) {
                throw new Error(`Failed to download PDF after ${maxRetries} attempts: ${error.message}`);
            }
            // Wait before retrying (exponential backoff)
            await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            logger.warn(`Retrying PDF download (attempt ${attempt + 1}/${maxRetries}): ${url}`);
        }
    }
}

async function isValidDocumentPage(url) {
    // Skip search, CSV, and other non-document pages
    const skipPatterns = [
        'search.csv',
        'search.json',
        'search.html',
        'advanced-search',
        'document-search'
    ];
    return !skipPatterns.some(pattern => url.toLowerCase().includes(pattern));
}

async function extractDocumentContent(page) {
    // Wait for content with improved timeout and retry logic
    const waitForContent = async (page, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                await page.waitForSelector([
                    '.fr-box-official',
                    '.document-content',
                    '.body-content',
                    '#fulltext_content_area',
                    'article',
                    '.main-content'
                ].join(','), {
                    timeout: 30000,
                    visible: true
                });
                return true;
            } catch (error) {
                if (attempt === maxRetries) {
                    debug(`Content load failed after ${maxRetries} attempts`, error.message);
                    return false;
                }
                debug(`Retry ${attempt}/${maxRetries} loading content`, null);
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        return false;
    };

    // Enhanced page navigation with retry logic
    const loadPage = async (page, url, maxRetries = 3) => {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const response = await page.goto(url, {
                    waitUntil: ['networkidle0', 'domcontentloaded'],
                    timeout: 60000
                });
                
                if (!response.ok()) {
                    throw new Error(`HTTP ${response.status()}`);
                }
                
                // Wait for any dynamic content
                const contentLoaded = await waitForContent(page);
                if (!contentLoaded && attempt === maxRetries) {
                    debug('Failed to load content after retries', url);
                    return false;
                }
                return true;
            } catch (error) {
                if (attempt === maxRetries) {
                    debug(`Page load failed after ${maxRetries} attempts`, error.message);
                    return false;
                }
                debug(`Retry ${attempt}/${maxRetries} loading page`, url);
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
            }
        }
        return false;
    };

    return await page.evaluate(() => {
        // Debug logging function with timestamp
        const debug = (msg, data) => {
            const timestamp = new Date().toISOString();
            console.log(`[${timestamp}] [Debug] ${msg}:`, data);
        };

        // Enhanced error handling wrapper
        const safeExecute = (fn, fallback = null) => {
            try {
                return fn();
            } catch (error) {
                debug('Error in operation', error.message);
                return fallback;
            }
        };

        // Function to clean text content with improved regex handling
        const cleanText = (text) => {
            if (!text) return '';
            
            // Remove legal disclaimers and navigation elements with proper escaping
            const disclaimers = [
                'Legal Status',
                'This site displays a prototype',
                'This prototype edition',
                'The OFR/GPO partnership',
                'Enter a search term',
                'Document Details',
                'Published Document',
                'Enhanced Content',
                'Public Inspection',
                'Table of Contents',
                'Document Statistics',
                'Other Formats',
                'Public Comments',
                'Billing code',
                'Filed',
                '\\[FR Doc\\.',  // Fixed regex pattern
                'Reader Aids',
                'Background and more details',
                'Published Content',
                'Official Content',
                'Enhanced Content',
                'Page \\d+ of \\d+',  // Page numbers
                '\\d+\\s*FR\\s*\\d+',  // Federal Register citations
                'Federal Register / Vol\\.?\\s*\\d+,?\\s*No\\.?\\s*\\d+'  // FR headers
            ];
            
            return safeExecute(() => {
                let cleanedText = text;
                
                // Clean each disclaimer pattern safely
                for (const disclaimer of disclaimers) {
                    try {
                        const escapedDisclaimer = disclaimer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                        const pattern = new RegExp(`.*${escapedDisclaimer}.*(?:\\r?\\n|$)`, 'gi');
                        cleanedText = cleanedText.replace(pattern, '');
                    } catch (error) {
                        debug(`Error cleaning disclaimer: ${disclaimer}`, error.message);
                    }
                }
                
                // Additional cleaning steps
                cleanedText = cleanedText
                    // Remove extra whitespace
                    .split(/\r?\n/)
                    .map(line => line.trim())
                    // Remove empty lines and lines with only numbers/spaces
                    .filter(line => line && !/^[\s\d]*$/.test(line))
                    // Remove duplicate spaces
                    .map(line => line.replace(/\s+/g, ' '))
                    // Join with newlines
                    .join('\n')
                    // Remove multiple consecutive newlines
                    .replace(/\n{3,}/g, '\n\n')
                    // Trim final result
                    .trim();
                
                return cleanedText;
            }, text);  // Return original text as fallback
        };

        // Helper function to safely get text content with better error handling
        const getText = (selectors, context = document) => {
            if (!context) {
                debug('Null context provided for selectors', selectors);
                return '';
            }

            const selectorArray = Array.isArray(selectors) ? selectors : [selectors];
            
            return safeExecute(() => {
                for (const selector of selectorArray) {
                    try {
                        const elements = context.querySelectorAll(selector);
                        if (elements && elements.length > 0) {
                            const text = Array.from(elements)
                                .map(el => el?.textContent?.trim() || '')
                                .filter(Boolean)
                                .join('\n');
                            
                            if (text) {
                                debug(`Found text using selector: ${selector}`, { length: text.length });
                                return text;
                            }
                        }
                    } catch (selectorError) {
                        debug(`Error with selector "${selector}"`, selectorError.message);
                    }
                }
                return '';
            }, '');
        };

        // Try to find the main document content with more robust error handling
        const mainContentSelectors = [
            // Federal Register specific selectors for executive orders
            '#fulltext_content_area',
            '.executive-order-content',
            '.document-content-area .fr-box-official .content-wrapper',
            '.document-content-area .printed-page-content',
            // Generic document selectors
            '.document-content',
            '.body-content',
            '.word-content',
            // Fallback selectors
            'article',
            '.main-content',
            '#main-content'
        ];

        let mainContent = null;
        let usedSelector = '';
        
        try {
            for (const selector of mainContentSelectors) {
                const elements = document.querySelectorAll(selector);
                if (elements && elements.length > 0) {
                    mainContent = Array.from(elements);
                    usedSelector = selector;
                    debug('Found content using selector', `${selector} (${elements.length} elements)`);
                    break;
                }
            }

            // If no content found with specific selectors, try body as last resort
            if (!mainContent) {
                mainContent = [document.body];
                usedSelector = 'body';
                debug('Using body as fallback for content', null);
            }
        } catch (error) {
            debug('Error finding main content', error.message);
            return null;
        }

        // Get document metadata from multiple possible locations
        const metadataContainers = [
            '.metadata-section',
            '.document-metadata',
            '.document-details',
            '.document-content-area header'
        ];

        let metadataSection = null;
        for (const selector of metadataContainers) {
            metadataSection = document.querySelector(selector);
            if (metadataSection) break;
        }

        debug('Metadata section found', metadataSection ? 'Yes' : 'No');

        // Get title from multiple possible locations
        const title = getText([
            '.document-title h1',
            '.title h1',
            'h1.title',
            '.title',
            'header h1',
            'h1'
        ]);

        // Get document number from multiple possible locations
        const documentNumber = getText([
            '.fr-document-number',
            '.document-number',
            '.executive-order-number',
            '[class*="document-number"]',
            '[class*="eo-number"]',
            'header [class*="number"]'
        ], metadataSection);

        // Get publish date from multiple possible locations
        const publishDate = getText([
            '.document-details time',
            '.publish-date',
            '.signing-date',
            '.date-filed',
            '[class*="date"]',
            'time',
            'header time'
        ], metadataSection);

        // Get document type from multiple possible locations
        const documentType = getText([
            '.document-type',
            '.presidential-document-type',
            '[class*="document-type"]',
            '[class*="doc-type"]',
            'header [class*="type"]'
        ], metadataSection);

        // Get signature from multiple possible locations
        const signedBy = getText([
            '.signature-box',
            '.president-signature',
            '.sig-block',
            '.signature',
            '[class*="signature"]',
            '.document-footer [class*="signature"]'
        ]);

        // Extract and clean the main content text
        const rawText = mainContent
            .map(el => el.textContent || '')
            .join('\n');
        
        const cleanedText = cleanText(rawText);
        debug('Text content length', { raw: rawText.length, cleaned: cleanedText.length });

        // Only return content if we have meaningful text
        if (!cleanedText || cleanedText.length < 100) {
            debug('Insufficient content length', cleanedText.length);
            return null;
        }

        return {
            text: cleanedText,
            title: title || null,
            documentNumber: documentNumber || null,
            publishDate: publishDate || null,
            documentType: documentType || null,
            signedBy: signedBy || null,
            debug: {
                contentLength: cleanedText.length,
                hasTitle: Boolean(title),
                hasDocNumber: Boolean(documentNumber),
                hasDate: Boolean(publishDate),
                hasType: Boolean(documentType),
                hasSignature: Boolean(signedBy)
            }
        };
    });
}

async function scrapeOfficialDocuments() {
    try {
        // Create documents directory if it doesn't exist
        const docsDir = path.join(__dirname, '../../documents');
        await fs.promises.mkdir(docsDir, { recursive: true });

        // Initialize database
        spinner = ora('Initializing database...').start();
        await Quote.initialize();
        spinner.succeed('Database initialized');

        // Initialize scraper with modified config for official documents
        const testConfig = {
            ...config,
            maxConcurrent: 2,
            requestDelay: { min: 5000, max: 10000 }, // More conservative for government sites
            maxRequestsPerDomain: 30,
            pageTimeout: 60000 // Longer timeout for document downloads
        };

        spinner = ora('Initializing scraper...').start();
        scraper = new QuoteScraperService(testConfig);
        await scraper.initialize();
        spinner.succeed('Scraper initialized');

        // Process each document type
        const { official_documents } = sources;
        for (const [docType, urls] of Object.entries(official_documents)) {
            spinner.info(`\nProcessing ${docType}...`);
            
            // Create directory for this document type
            const typeDir = path.join(docsDir, docType);
            const pdfsDir = path.join(typeDir, 'pdfs');
            await fs.promises.mkdir(typeDir, { recursive: true });
            await fs.promises.mkdir(pdfsDir, { recursive: true });

            let successCount = 0;
            let failureCount = 0;
            let totalDocs = 0;

            // Process each URL
            for (const url of urls) {
                try {
                    spinner.start(`Scraping ${url}`);
                    
                    // Get document listings
                    const page = await scraper.acquirePage();
                    
                    // Set a longer timeout and wait for content
                    page.setDefaultTimeout(60000);
                    
                    await page.goto(url, { 
                        waitUntil: ['networkidle0', 'domcontentloaded'],
                        timeout: 60000
                    });

                    // Wait for any dynamic content to load
                    await page.waitForSelector('a[href*="/documents/"], a[href*="/executive-order/"]', { timeout: 30000 })
                        .catch(() => console.log('Timeout waiting for document links'));

                    // Extract document links based on source type
                    const documents = await page.evaluate(() => {
                        // Helper function to get closest date
                        const getClosestDate = (element) => {
                            const dateSelectors = [
                                '[class*="date"]',
                                'time',
                                '.meta time',
                                '[datetime]'
                            ];
                            for (const selector of dateSelectors) {
                                const dateEl = element.closest('tr, article, .document-row')?.querySelector(selector);
                                if (dateEl) return dateEl.textContent.trim();
                            }
                            return '';
                        };

                        // Different link patterns for different sources
                        const linkPatterns = [
                            'a[href*="/documents/"]',
                            'a[href*="/executive-order/"]',
                            'a[href*="/proclamation/"]',
                            'a[href*="/memorandum/"]',
                            'a[href*="/notice/"]',
                            'a[href*="/determination/"]',
                            'a[href*="/directive/"]',
                            'a[href*="/order/"]',
                            'a[href*="/statement/"]',
                            'a[href*="/letter/"]',
                            'a[href*="/message/"]',
                            'a[href*=".pdf"]'
                        ];

                        const links = Array.from(document.querySelectorAll(linkPatterns.join(',')));
                        return links.map(link => {
                            const row = link.closest('tr, article, .document-row, .list-item');
                            return {
                                url: link.href,
                                title: link.textContent.trim(),
                                date: getClosestDate(link),
                                pdfUrl: link.href.endsWith('.pdf') ? link.href : row?.querySelector('a[href$=".pdf"]')?.href
                            };
                        }).filter(doc => doc.url && !doc.url.includes('search'));
                    });

                    spinner.text = `Found ${documents.length} documents on ${url}`;

                    // Process each document with improved error handling
                    for (const doc of documents) {
                        try {
                            if (!await isValidDocumentPage(doc.url)) {
                                spinner.info(`Skipping non-document page: ${doc.url}`);
                                continue;
                            }

                            // Extract document content and metadata with retries
                            const docPage = await scraper.acquirePage();
                            docPage.setDefaultTimeout(60000);
                            
                            const pageLoaded = await loadPage(docPage, doc.url);
                            if (!pageLoaded) {
                                spinner.warn(`Failed to load page: ${doc.url}`);
                                continue;
                            }

                            const content = await extractDocumentContent(docPage);
                            
                            if (!content || !content.text) {
                                spinner.warn(`No content found in ${doc.url} (Debug: ${JSON.stringify(content?.debug)})`);
                                continue;
                            }

                            // Download PDF if available
                            const pdfUrl = doc.pdfUrl || await docPage.evaluate(() => {
                                const pdfLink = document.querySelector('a[href$=".pdf"]');
                                return pdfLink?.href;
                            });

                            let pdfPath = null;
                            if (pdfUrl) {
                                try {
                                    const pdfFileName = `${content.documentNumber || new Date().getTime()}.pdf`;
                                    pdfPath = path.join(pdfsDir, pdfFileName);
                                    spinner.text = `Downloading PDF: ${pdfFileName}`;
                                    await downloadPDF(pdfUrl, pdfPath);
                                    spinner.succeed(`Downloaded PDF: ${pdfFileName}`);
                                } catch (pdfError) {
                                    spinner.warn(`Failed to download PDF: ${pdfError.message}`);
                                    logger.error('PDF download error:', pdfError);
                                }
                            }

                            // Save document metadata and content
                            const docData = {
                                ...doc,
                                ...content,
                                type: docType,
                                pdfPath: pdfPath ? path.relative(docsDir, pdfPath) : null,
                                scrapedAt: new Date().toISOString(),
                                metadata: {
                                    source: content.source,
                                    documentType: content.documentType,
                                    url: doc.url,
                                    pdfUrl: pdfUrl
                                }
                            };

                            const docFileName = `${docData.documentNumber || new Date().getTime()}.json`;
                            await fs.promises.writeFile(
                                path.join(typeDir, docFileName),
                                JSON.stringify(docData, null, 2)
                            );

                            // Store in quotes database if it contains Trump content
                            if (content.signedBy?.includes('Trump') || content.text.includes('Trump')) {
                                await Quote.insert({
                                    quote_text: content.text,
                                    source_url: doc.url,
                                    context: {
                                        type: 'official_document',
                                        document_type: docType,
                                        document_number: content.documentNumber,
                                        signed_date: content.publishDate,
                                        title: content.title,
                                        pdf_path: docData.pdfPath,
                                        signed_by: content.signedBy,
                                        source: content.source
                                    }
                                });
                            }

                            totalDocs++;
                            successCount++;
                            spinner.succeed(`Processed document: ${doc.title}`);

                        } catch (error) {
                            failureCount++;
                            spinner.fail(`Failed to process document: ${doc.title} - ${error.message}`);
                            logger.error('Document processing error:', error);
                        }

                        // Delay between documents
                        await new Promise(resolve => setTimeout(resolve, 3000));
                    }

                } catch (error) {
                    failureCount++;
                    spinner.fail(`Failed to scrape ${url}: ${error.message}`);
                    logger.error('Scraping error:', error);
                }

                // Show progress
                const progress = ((successCount + failureCount) / urls.length * 100).toFixed(1);
                spinner = ora(`Progress for ${docType}: ${progress}% complete`).start();
            }

            // Document type summary
            spinner.succeed(`Completed ${docType}:
            - URLs processed: ${successCount + failureCount}/${urls.length}
            - Documents found: ${totalDocs}
            - Successful: ${successCount}
            - Failed: ${failureCount}`);
        }

        // Final statistics
        spinner = ora('Gathering final statistics...').start();
        const stats = await Quote.getStats();
        spinner.succeed(`Official documents scraping completed:
        - Total documents in database: ${stats.totalQuotes}
        - Latest document from: ${new Date(stats.latestQuote?.timestamp).toLocaleString()}
        - Oldest document from: ${new Date(stats.oldestQuote?.timestamp).toLocaleString()}`);

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

// Handle interruptions
process.on('SIGINT', async () => {
    if (spinner) spinner.warn('Received SIGINT. Cleaning up...');
    logger.info('Received SIGINT. Cleaning up...');
    if (scraper) {
        await scraper.cleanup();
    }
    process.exit(0);
});

// Start scraping
scrapeOfficialDocuments(); 