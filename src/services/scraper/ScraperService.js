const puppeteer = require('puppeteer');
const { logger } = require('../../utils/logger');
const { sleep } = require('../../utils/helpers');

class ScraperService {
    constructor(queueManager, sourceManager) {
        this.queueManager = queueManager;
        this.sourceManager = sourceManager;
        this.browser = null;
        this.isRunning = false;
        this.maxConcurrentScrapes = parseInt(process.env.MAX_CONCURRENT_SCRAPES) || 50;
        this.requestDelay = parseInt(process.env.REQUEST_DELAY) || 2000;
    }

    async start() {
        try {
            this.isRunning = true;
            this.browser = await puppeteer.launch({
                executablePath: process.env.PUPPETEER_EXECUTABLE_PATH,
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            // Start processing queue
            await this.processQueue();
            
            // Start source monitoring
            await this.monitorSources();
        } catch (error) {
            logger.error('Failed to start scraper service:', error);
            throw error;
        }
    }

    async stop() {
        this.isRunning = false;
        if (this.browser) {
            await this.browser.close();
        }
    }

    async processQueue() {
        while (this.isRunning) {
            try {
                const job = await this.queueManager.getNextJob();
                if (job) {
                    await this.processJob(job);
                } else {
                    await sleep(1000); // Wait before checking queue again
                }
            } catch (error) {
                logger.error('Error processing queue:', error);
                await sleep(5000); // Wait longer on error
            }
        }
    }

    async processJob(job) {
        const { source, type, url } = job.data;
        
        try {
            const page = await this.browser.newPage();
            
            // Set up page configuration
            await this.configurePage(page);
            
            // Navigate to URL
            await page.goto(url, { waitUntil: 'networkidle0' });
            
            // Extract content based on type
            const content = await this.extractContent(page, type);
            
            // Process and store content
            await this.processContent(content, source, type);
            
            await page.close();
        } catch (error) {
            logger.error(`Error processing job for ${url}:`, error);
            await this.queueManager.retryJob(job);
        }
    }

    async configurePage(page) {
        // Set viewport
        await page.setViewport({ width: 1920, height: 1080 });
        
        // Set user agent
        await page.setUserAgent(await this.getRandomUserAgent());
        
        // Set request interception for rate limiting
        await page.setRequestInterception(true);
        page.on('request', request => {
            request.continue();
        });
    }

    async extractContent(page, type) {
        switch (type) {
            case 'text':
                return await this.extractText(page);
            case 'video':
                return await this.extractVideo(page);
            case 'image':
                return await this.extractImage(page);
            default:
                throw new Error(`Unsupported content type: ${type}`);
        }
    }

    async extractText(page) {
        // Extract text content using page.evaluate
        return await page.evaluate(() => {
            // Add your text extraction logic here
            return document.body.innerText;
        });
    }

    async extractVideo(page) {
        // Extract video content
        return await page.evaluate(() => {
            const videos = Array.from(document.querySelectorAll('video'));
            return videos.map(video => ({
                src: video.src,
                type: video.type,
                duration: video.duration
            }));
        });
    }

    async extractImage(page) {
        // Extract image content
        return await page.evaluate(() => {
            const images = Array.from(document.querySelectorAll('img'));
            return images.map(img => ({
                src: img.src,
                alt: img.alt,
                width: img.width,
                height: img.height
            }));
        });
    }

    async processContent(content, source, type) {
        // Process and store content based on type
        await this.queueManager.addToProcessingQueue({
            content,
            source,
            type,
            timestamp: new Date()
        });
    }

    async monitorSources() {
        while (this.isRunning) {
            try {
                const sources = await this.sourceManager.getActiveSources();
                for (const source of sources) {
                    await this.queueManager.addSourceToQueue(source);
                }
                await sleep(60000); // Check sources every minute
            } catch (error) {
                logger.error('Error monitoring sources:', error);
                await sleep(30000); // Wait 30 seconds on error
            }
        }
    }

    async getRandomUserAgent() {
        // Implement user agent rotation
        const userAgents = [
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0'
        ];
        return userAgents[Math.floor(Math.random() * userAgents.length)];
    }
}

module.exports = { ScraperService }; 