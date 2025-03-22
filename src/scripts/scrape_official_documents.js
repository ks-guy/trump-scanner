const { default: ora } = require('ora');
const { sources, config } = require('../config/sources');
const QuoteScraperService = require('../services/scraper/QuoteScraperService');
const Quote = require('../models/Quote');
const logger = require('../utils/logger');
const fs = require('fs');
const path = require('path');
const https = require('https');

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
    return await page.evaluate(() => {
        // Helper function to safely get text content
        const getText = (selector) => {
            const el = document.querySelector(selector);
            return el ? el.textContent.trim() : '';
        };

        // Helper function to get metadata from multiple possible selectors
        const getMetadata = (selectors) => {
            for (const selector of selectors) {
                const text = getText(selector);
                if (text) return text;
            }
            return '';
        };

        // Document format selectors by source
        const formats = {
            federalRegister: {
                content: '.document-content, .body-content, .word-content',
                signature: '.signature, .president-signature, .sig-block',
                number: '.document-number, .executive-order-number, .fr-document-number',
                date: '.document-details .publish-date, .signing-date, .date-filed',
                title: '.title, .document-title, .fr-document-title',
                type: '.document-type, .presidential-document-type'
            },
            presidency: {
                content: '.field-docs-content, .document-content',
                signature: '.signature-block, .president-signature',
                number: '.document-number, .identifier',
                date: '.date-display-single, .doc-date',
                title: '.field-docs-title, .title',
                type: '.field-docs-type, .document-type'
            },
            archives: {
                content: '.document-text, .eo-text, .content-text',
                signature: '.signature-block, .signatory',
                number: '.document-number, .identifier-number',
                date: '.sign-date, .document-date',
                title: '.title-display, .document-title',
                type: '.document-type, .record-type'
            },
            govInfo: {
                content: '.content-body, .document-text, .full-text',
                signature: '.signature-block, .sig',
                number: '.document-id, .doc-number',
                date: '.document-date, .date',
                title: '.document-title, .title',
                type: '.document-type, .doc-type'
            },
            courtListener: {
                content: '.opinion-text, .document-text',
                signature: '.signature, .judge-signature',
                number: '.docket-number, .case-number',
                date: '.date-filed, .decision-date',
                title: '.case-name, .document-title',
                type: '.document-type, .filing-type'
            }
        };

        // Try each format until we find content
        for (const [source, selectors] of Object.entries(formats)) {
            const content = getText(selectors.content);
            if (content) {
                return {
                    text: content,
                    signedBy: getText(selectors.signature),
                    documentNumber: getText(selectors.number),
                    publishDate: getText(selectors.date),
                    title: getText(selectors.title),
                    documentType: getText(selectors.type),
                    source,
                    format: source
                };
            }
        }

        // If no predefined format matches, try generic content extraction
        const mainContent = document.querySelector('main, article, .main-content');
        if (mainContent) {
            // Try to extract metadata from any available elements
            const possibleDateSelectors = [
                '[class*="date"]',
                '[class*="time"]',
                'time',
                '.meta time'
            ];
            const possibleTitleSelectors = [
                'h1',
                '.title',
                '[class*="title"]',
                '[class*="heading"]'
            ];

            return {
                text: mainContent.textContent.trim(),
                signedBy: getMetadata(['[class*="signature"]', '[class*="signed"]', '.author']),
                documentNumber: getMetadata(['[class*="number"]', '[class*="id"]', '.identifier']),
                publishDate: getMetadata(possibleDateSelectors),
                title: getMetadata(possibleTitleSelectors),
                documentType: getMetadata(['[class*="type"]', '[class*="category"]']),
                source: 'generic',
                format: 'generic'
            };
        }

        return null;
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
                    await page.goto(url, { 
                        waitUntil: 'networkidle0',
                        timeout: 60000
                    });

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

                    // Process each document
                    for (const doc of documents) {
                        try {
                            if (!await isValidDocumentPage(doc.url)) {
                                spinner.info(`Skipping non-document page: ${doc.url}`);
                                continue;
                            }

                            // Extract document content and metadata
                            const docPage = await scraper.acquirePage();
                            await docPage.goto(doc.url, { 
                                waitUntil: 'networkidle0',
                                timeout: 60000
                            });
                            
                            const content = await extractDocumentContent(docPage);
                            
                            if (!content || !content.text) {
                                spinner.warn(`No content found in ${doc.url}`);
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