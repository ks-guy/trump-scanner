import ora from 'ora';
import { TruthSocialScraper } from '../services/scrapers/TruthSocialScraper.js';
import logger from '../utils/logger.js';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname } from 'path';
import puppeteer from 'puppeteer';
import { PrismaClient } from '@prisma/client';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const prisma = new PrismaClient();

// Add more selectors to try
const POST_SELECTORS = [
  'article[data-testid="post"]',
  'div[data-testid="post"]',
  'article[class*="post"]',
  'div[class*="post"]',
  'article[class*="truth"]',
  'div[class*="truth"]',
  'article[class*="tweet"]',
  'div[class*="tweet"]',
  'article[class*="status"]',
  'div[class*="status"]'
];

// Add function to check if element is visible
const isElementVisible = (element) => {
  const style = window.getComputedStyle(element);
  return style.display !== 'none' && style.visibility !== 'hidden' && style.opacity !== '0';
};

// Add function to wait for network idle
const waitForNetworkIdle = async (page) => {
  await page.waitForFunction(() => {
    return window.performance.getEntriesByType('resource')
      .filter(r => r.initiatorType === 'xmlhttprequest' || r.initiatorType === 'fetch')
      .every(r => r.responseEnd !== 0);
  }, { timeout: 10000 });
};

async function savePosts(posts) {
    try {
        for (const post of posts) {
            await prisma.post.upsert({
                where: {
                    text_timestamp: {
                        text: post.text,
                        timestamp: post.timestamp
                    }
                },
                update: {
                    likes: post.likes,
                    reposts: post.reposts,
                    replies: post.replies
                },
                create: {
                    text: post.text,
                    timestamp: post.timestamp,
                    likes: post.likes,
                    reposts: post.reposts,
                    replies: post.replies,
                    platform: post.platform
                }
            });
        }
        console.log(`Successfully saved ${posts.length} posts to database`);
    } catch (error) {
        console.error('Error saving posts to database:', error);
        throw error;
    }
}

async function scrapeTruthSocial() {
    const spinner = ora('Initializing Truth Social scraper...').start();
    const scraper = new TruthSocialScraper({
        maxConcurrent: 3,
        requestDelay: {
            min: 2000,
            max: 5000
        },
        maxRetries: 3
    });

    try {
        spinner.text = 'Initializing browser...';
        await scraper.initialize();
        
        spinner.text = 'Scraping Truth Social profile...';
        const posts = await scraper.scrapeProfile('realDonaldTrump', {
            maxScrollAttempts: 50
        });

        spinner.succeed(`Successfully scraped ${posts.length} posts from Truth Social`);
        return posts;
    } catch (error) {
        spinner.fail('Failed to scrape Truth Social');
        logger.error('Error during scraping:', error);
        throw error;
    } finally {
        await scraper.close();
    }
}

// Run the scraper
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
    scrapeTruthSocial().catch(error => {
        console.error('Fatal error:', error);
        process.exit(1);
    });
}

export { scrapeTruthSocial }; 