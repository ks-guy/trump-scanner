import puppeteer from 'puppeteer';
import { createLoggerComponent } from '../../utils/logger.js';
import { sleep, randomDelay, retry } from '../../utils/helpers.js';
import { Quote } from '../../models/Quote.js';
import { ProxyManager } from '../../utils/proxyManager.js';
import fs from 'fs/promises';

const logger = createLoggerComponent('TruthSocialScraper');

class TruthSocialScraper {
    constructor(config = {}) {
        this.config = {
            maxConcurrent: 3,
            requestDelay: {
                min: 2000,
                max: 5000
            },
            maxRetries: 3,
            defaultUsername: 'realDonaldTrump', // Trump's official Truth Social handle
            maxRequestsPerHour: 100, // Rate limiting
            maxPostsPerRequest: 1000, // Limit posts per request
            requestTimeout: 30000,
            retryDelay: 5000,
            screenshotDir: 'debug/screenshots/truth_social',
            debugDir: 'debug/logs/truth_social',
            ...config
        };
        this.browser = null;
        this.page = null;
        this.requestCount = 0;
        this.lastRequestTime = Date.now();
        this.proxyManager = new ProxyManager();
    }

    async initialize() {
        try {
            this.browser = await puppeteer.launch({
                headless: "new",
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--disable-font-subpixel-positioning',
                    '--disable-web-security',
                    '--disable-features=IsolateOrigins,site-per-process',
                    '--window-size=1920,1080',
                    '--disable-notifications',
                    '--disable-extensions',
                    '--disable-popup-blocking',
                    '--disable-infobars',
                    '--disable-save-password-bubble',
                    '--disable-translate',
                    '--disable-default-apps',
                    '--disable-sync',
                    '--disable-background-networking',
                    '--metrics-recording-only',
                    '--disable-background-timer-throttling',
                    '--disable-backgrounding-occluded-windows',
                    '--disable-breakpad',
                    '--disable-component-extensions-with-background-pages',
                    '--disable-features=TranslateUI,BlinkGenPropertyTrees',
                    '--disable-ipc-flooding-protection',
                    '--enable-features=NetworkService,NetworkServiceInProcess'
                ]
            });
            this.page = await this.browser.newPage();
            
            // Set a more realistic viewport
            await this.page.setViewport({ width: 1920, height: 1080 });
            
            // Set a more recent user agent
            await this.page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
            
            // Enable console logging from the page
            this.page.on('console', msg => {
                const type = msg.type();
                if (type === 'error' || type === 'warning') {
                    logger.error('Browser console:', msg.text());
                } else {
                    logger.info('Browser console:', msg.text());
                }
            });
            
            // Log all failed requests
            this.page.on('requestfailed', request => {
                const resourceType = request.resourceType();
                // Only log non-font resource failures
                if (resourceType !== 'font') {
                    logger.error('Request failed:', {
                        url: request.url(),
                        errorText: request.failure().errorText,
                        method: request.method(),
                        resourceType
                    });
                }
            });

            // Set default navigation timeout
            this.page.setDefaultNavigationTimeout(60000); // Increased timeout

            // Add extra headers to appear more like a real browser
            await this.page.setExtraHTTPHeaders({
                'Accept-Language': 'en-US,en;q=0.9',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
                'sec-ch-ua': '"Chromium";v="122", "Not(A:Brand";v="24", "Google Chrome";v="122"',
                'sec-ch-ua-mobile': '?0',
                'sec-ch-ua-platform': '"Windows"',
                'Upgrade-Insecure-Requests': '1',
                'Sec-Fetch-Site': 'none',
                'Sec-Fetch-Mode': 'navigate',
                'Sec-Fetch-User': '?1',
                'Sec-Fetch-Dest': 'document',
                'Cache-Control': 'no-cache',
                'Pragma': 'no-cache'
            });

            // Enable request interception
            await this.page.setRequestInterception(true);
            this.page.on('request', (request) => {
                const resourceType = request.resourceType();
                // Block fonts and other non-essential resources
                if (resourceType === 'font' || resourceType === 'media' || resourceType === 'image') {
                    request.abort();
                } else if (resourceType === 'document' || resourceType === 'script' || resourceType === 'stylesheet' || resourceType === 'xhr' || resourceType === 'fetch') {
                    request.continue();
                } else {
                    request.abort();
                }
            });

            logger.info('TruthSocialScraper initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize TruthSocialScraper:', error);
            throw error;
        }
    }

    // Add rate limiting check
    async checkRateLimit() {
        const now = Date.now();
        const hourElapsed = now - this.lastRequestTime >= 3600000; // 1 hour in milliseconds

        if (hourElapsed) {
            this.requestCount = 0;
            this.lastRequestTime = now;
        }

        if (this.requestCount >= this.config.maxRequestsPerHour) {
            const waitTime = 3600000 - (now - this.lastRequestTime);
            logger.warn(`Rate limit reached. Waiting ${Math.ceil(waitTime / 1000)} seconds...`);
            await new Promise(resolve => setTimeout(resolve, waitTime));
            this.requestCount = 0;
            this.lastRequestTime = Date.now();
        }

        this.requestCount++;
    }

    async scrapeProfile(username = null, options = {}) {
        const targetUsername = username || this.config.defaultUsername;
        const url = `https://truthsocial.com/@${targetUsername}`;
        let browser = null;
        let retries = 0;

        while (retries < this.config.maxRetries) {
            try {
                await this.checkRateLimit();
                browser = await puppeteer.launch({
                    headless: 'new',
                    args: ['--no-sandbox', '--disable-setuid-sandbox']
                });

                const page = await browser.newPage();
                const proxy = await this.proxyManager.getProxy();
                if (proxy) {
                    await page.authenticate({
                        username: proxy.username,
                        password: proxy.password
                    });
                }

                await page.setViewport({ width: 1920, height: 1080 });
                await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

                // Set timeout for navigation
                await page.setDefaultNavigationTimeout(this.config.requestTimeout);

                // Navigate to profile
                const response = await page.goto(url, {
                    waitUntil: 'networkidle0'
                });

                if (!response.ok()) {
                    throw new Error(`HTTP error! status: ${response.status()}`);
                }

                // Check for rate limiting
                const content = await page.content();
                if (content.includes('rate limit') || content.includes('too many requests')) {
                    throw new Error('Rate limit detected');
                }

                // Wait for profile data to load
                await page.waitForSelector('div[data-testid="profile"]', {
                    timeout: this.config.requestTimeout
                });

                // Extract profile data
                const profile = await page.evaluate(() => {
                    const profileEl = document.querySelector('div[data-testid="profile"]');
                    return {
                        username: profileEl.querySelector('h1')?.textContent?.trim(),
                        displayName: profileEl.querySelector('h2')?.textContent?.trim(),
                        bio: profileEl.querySelector('p[data-testid="bio"]')?.textContent?.trim(),
                        followers: parseInt(profileEl.querySelector('span[data-testid="followers"]')?.textContent?.replace(/[^0-9]/g, '') || '0'),
                        following: parseInt(profileEl.querySelector('span[data-testid="following"]')?.textContent?.replace(/[^0-9]/g, '') || '0'),
                        verified: !!profileEl.querySelector('svg[data-testid="verified-badge"]'),
                        joinedDate: profileEl.querySelector('span[data-testid="joined-date"]')?.textContent?.trim()
                    };
                });

                // Save debug info
                await this.saveDebugInfo('profile', profile);

                return profile;
            } catch (error) {
                retries++;
                logger.error(`Error scraping profile (attempt ${retries}/${this.config.maxRetries}):`, error);

                if (browser) {
                    await browser.close();
                }

                if (retries === this.config.maxRetries) {
                    throw new Error(`Failed to scrape profile after ${this.config.maxRetries} attempts`);
                }

                // Take screenshot on error
                if (browser) {
                    const page = await browser.newPage();
                    await this.takeScreenshot(page, 'profile_error');
                }

                // Wait before retrying
                await new Promise(resolve => setTimeout(resolve, this.config.retryDelay * retries));
            }
        }
    }

    async extractPosts() {
        try {
            return await this.page.evaluate(() => {
                const posts = [];
                // Try multiple possible selectors for posts
                const postElements = Array.from(document.querySelectorAll([
                    'article[data-testid="post"]',
                    'div[data-testid="post"]',
                    'article[class*="post"]',
                    'div[class*="post"]',
                    'article[class*="truth"]',
                    'div[class*="truth"]',
                    'article[class*="tweet"]',
                    'div[class*="tweet"]',
                    'article[class*="status"]',
                    'div[class*="status"]',
                    '.timeline-posts article',
                    '.post',
                    '[data-testid="post"]',
                    '.status-card',
                    '.post-card',
                    '[data-testid="tweet"]',
                    '.tweet'
                ].join(', ')));
                
                console.log(`Found ${postElements.length} post elements`);
                
                for (const element of postElements) {
                    try {
                        // Check if element is visible
                        const style = window.getComputedStyle(element);
                        if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') {
                            continue;
                        }

                        // Get post ID from various possible attributes
                        const postId = element.getAttribute('data-post-id') || 
                                     element.getAttribute('data-testid') || 
                                     element.id ||
                                     element.getAttribute('data-tweet-id') ||
                                     element.getAttribute('data-status-id');

                        // Try multiple selectors for post content
                        const contentElement = element.querySelector([
                            '.post-content',
                            '.status-content',
                            '[data-testid="post-content"]',
                            'article div[lang]',
                            '.tweet-content',
                            '.post-text',
                            '[data-testid="tweetText"]',
                            '.status-text',
                            '.post-body',
                            '.post-message',
                            '.message-content',
                            '[data-testid="message"]'
                        ].join(', '));

                        // Get text content, handling both direct text and nested elements
                        const content = contentElement ? 
                            (contentElement.textContent || 
                             Array.from(contentElement.querySelectorAll('p, span, div'))
                                .map(el => el.textContent)
                                .join(' ')).trim() : '';

                        // Get timestamp from various possible elements
                        const timestampElement = element.querySelector([
                            '.post-timestamp',
                            'time',
                            '[datetime]',
                            '[title*="20"]',
                            '.tweet-timestamp',
                            '.post-date',
                            '.status-date',
                            '[data-testid="timestamp"]'
                        ].join(', '));

                        const timestamp = timestampElement?.getAttribute('datetime') || 
                                        timestampElement?.getAttribute('title') ||
                                        timestampElement?.textContent?.trim();

                        // Get engagement stats
                        const stats = {
                            reTruths: this.getStatValue(element, [
                                '.retruth-count',
                                '[data-testid*="retruth"]',
                                '[aria-label*="retruth"]',
                                '[data-testid*="retweet"]',
                                '[data-testid*="share"]'
                            ]),
                            likes: this.getStatValue(element, [
                                '.like-count',
                                '[data-testid*="like"]',
                                '[aria-label*="like"]',
                                '[data-testid*="favorite"]',
                                '[data-testid*="heart"]'
                            ]),
                            replies: this.getStatValue(element, [
                                '.reply-count',
                                '[data-testid*="reply"]',
                                '[aria-label*="repl"]',
                                '[data-testid*="comment"]',
                                '[data-testid*="message"]'
                            ])
                        };

                        // Get media content
                        const media = Array.from(element.querySelectorAll('img[src], video[src], [data-testid="media"] img, [data-testid="media"] video'))
                            .map(media => ({
                                type: media.tagName.toLowerCase(),
                                url: media.src || media.getAttribute('src'),
                                alt: media.alt || '',
                                width: media.width,
                                height: media.height
                            }))
                            .filter(media => media.url);

                        // Get links
                        const links = Array.from(element.querySelectorAll('a[href]'))
                            .map(link => ({
                                text: link.textContent.trim(),
                                url: link.href,
                                isExternal: link.href.startsWith('http') && !link.href.includes('truthsocial.com')
                            }))
                            .filter(link => link.text && link.url); // Only include links with both text and URL

                        const post = {
                            id: postId,
                            content,
                            timestamp,
                            stats,
                            media,
                            links,
                            hasMedia: media.length > 0,
                            hasLinks: links.length > 0,
                            isThread: element.querySelector('.thread') !== null,
                            isReply: element.querySelector('.reply-to') !== null
                        };

                        // Log the extracted post for debugging
                        console.log('Extracted post:', JSON.stringify(post, null, 2));

                        // Include all posts, even if they only have media
                        if (post.content || post.media.length > 0) {
                            posts.push(post);
                        }
                    } catch (err) {
                        console.error('Error extracting post:', err);
                    }
                }
                
                return posts;
            });
        } catch (error) {
            logger.error('Error extracting posts:', error);
            throw error;
        }
    }

    // Helper function to get stat value
    getStatValue(element, selectors) {
        for (const selector of selectors) {
            const el = element.querySelector(selector);
            if (el) {
                const text = el.textContent.trim();
                // Extract number from text (e.g., "1.2K" -> 1200)
                const match = text.match(/(\d+(?:\.\d+)?)(?:K|M|B)?/);
                if (match) {
                    let value = parseFloat(match[1]);
                    if (text.includes('K')) value *= 1000;
                    if (text.includes('M')) value *= 1000000;
                    if (text.includes('B')) value *= 1000000000;
                    return Math.round(value);
                }
            }
        }
        return 0;
    }

    async savePosts(posts) {
        for (const post of posts) {
            try {
                // Create a searchable text field that includes both content and media descriptions
                const searchableText = [
                    post.content,
                    ...post.media.map(m => m.alt).filter(Boolean),
                    ...post.links.map(l => l.text).filter(Boolean)
                ].join(' ').trim();

                await Quote.insert({
                    quote_text: post.content,
                    searchable_text: searchableText,
                    source_url: `https://truthsocial.com/@realDonaldTrump/status/${post.id}`,
                    context: {
                        type: 'truth_social',
                        post_id: post.id,
                        timestamp: post.timestamp,
                        stats: post.stats,
                        media: post.media,
                        links: post.links,
                        has_media: post.hasMedia,
                        has_links: post.hasLinks,
                        is_thread: post.isThread,
                        is_reply: post.isReply
                    }
                });
            } catch (error) {
                logger.error(`Error saving post ${post.id}:`, error);
            }
            
            // Respect rate limits
            await randomDelay(this.config.requestDelay.min, this.config.requestDelay.max);
        }
    }

    async close() {
        if (this.browser) {
            await this.browser.close();
            this.browser = null;
            this.page = null;
        }
    }

    async takeScreenshot(page, name) {
        try {
            await page.screenshot({
                path: `${this.config.screenshotDir}/${name}_${Date.now()}.png`,
                fullPage: true
            });
        } catch (error) {
            logger.error(`Error taking screenshot ${name}:`, error);
        }
    }

    async saveDebugInfo(name, data) {
        try {
            const debugPath = `${this.config.debugDir}/${name}_${Date.now()}.json`;
            await fs.writeFile(debugPath, JSON.stringify(data, null, 2));
        } catch (error) {
            logger.error(`Error saving debug info ${name}:`, error);
        }
    }
}

export { TruthSocialScraper }; 