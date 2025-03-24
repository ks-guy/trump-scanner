import { scrapeBreitbart } from './scrapers/breitbart.js';
import { scrapeFoxNews } from './scrapers/foxnews.js';
import { scrapeNewsmax } from './scrapers/newsmax.js';
import { scrapeOANN } from './scrapers/oann.js';
import { scrapeRealClearPolitics } from './scrapers/realclearpolitics.js';
import { scrapeTheGatewayPundit } from './scrapers/thegatewaypundit.js';
import { scrapeTruthSocial } from './scrapers/truthsocial.js';
import { scrapeWashingtonExaminer } from './scrapers/washingtonexaminer.js';
import { scrapeWashingtonTimes } from './scrapers/washingtontimes.js';
import { scrapeWND } from './scrapers/wnd.js';
import { logger } from './utils/logger.js';

async function testScraper(scraper, name) {
    try {
        logger.info(`Testing ${name} scraper...`);
        const articles = await scraper();
        logger.info(`Successfully scraped ${articles.length} articles from ${name}`);
        logger.info('Sample article:', articles[0]);
    } catch (error) {
        logger.error(`Error testing ${name} scraper:`, error);
    }
}

async function testAllScrapers() {
    const scrapers = [
        { name: 'Breitbart', scraper: scrapeBreitbart },
        { name: 'Fox News', scraper: scrapeFoxNews },
        { name: 'Newsmax', scraper: scrapeNewsmax },
        { name: 'OANN', scraper: scrapeOANN },
        { name: 'Real Clear Politics', scraper: scrapeRealClearPolitics },
        { name: 'The Gateway Pundit', scraper: scrapeTheGatewayPundit },
        { name: 'Truth Social', scraper: scrapeTruthSocial },
        { name: 'Washington Examiner', scraper: scrapeWashingtonExaminer },
        { name: 'Washington Times', scraper: scrapeWashingtonTimes },
        { name: 'WND', scraper: scrapeWND }
    ];

    for (const { name, scraper } of scrapers) {
        await testScraper(scraper, name);
        // Add a delay between scrapers to avoid overwhelming the servers
        await new Promise(resolve => setTimeout(resolve, 5000));
    }
}

// Run the tests
testAllScrapers().catch(error => {
    logger.error('Error running scraper tests:', error);
    process.exit(1);
}); 