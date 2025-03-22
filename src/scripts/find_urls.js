const puppeteer = require('puppeteer');
const logger = require('../utils/logger');

async function findTrumpSpeeches() {
    const browser = await puppeteer.launch({
        headless: "new",
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    try {
        const page = await browser.newPage();
        
        // Set a realistic user agent
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');
        
        // Navigate to a known Trump speech page first
        const url = 'https://www.presidency.ucsb.edu/documents/remarks-the-2024-iowa-caucus-victory-celebration-des-moines-iowa';
        logger.info(`Navigating to ${url}`);
        
        await page.goto(url, {
            waitUntil: 'networkidle0',
            timeout: 30000
        });

        // Log the page title and content
        const title = await page.title();
        logger.info(`Page title: ${title}`);

        // Get the page content
        const content = await page.evaluate(() => {
            const mainContent = document.querySelector('.field-docs-content');
            return mainContent ? mainContent.textContent : null;
        });

        if (content) {
            logger.info('Found content on the page. Sample:', content.substring(0, 200));
            
            // Update test script with this working URL
            const testUrls = [url];
            logger.info('Updating test script with working URL:', url);
            
            return [{
                url,
                title,
                sample: content.substring(0, 200)
            }];
        } else {
            logger.warn('No content found on the page');
            return [];
        }

    } catch (error) {
        logger.error('Error finding Trump speeches:', error);
        throw error;
    } finally {
        await browser.close();
    }
}

// Run the script
findTrumpSpeeches().catch(console.error); 