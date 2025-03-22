const express = require('express');
const path = require('path');
const { default: ora } = require('ora');
const QuoteScraperService = require('../services/scraper/QuoteScraperService');
const Quote = require('../models/Quote');
const logger = require('../utils/logger');

// Create a spinner for progress indication
let spinner = null;

async function measurePerformance(name, fn) {
    spinner = ora(`Running: ${name}`).start();
    const start = process.hrtime.bigint();
    const result = await fn();
    const end = process.hrtime.bigint();
    const duration = Number(end - start) / 1e6; // Convert to milliseconds
    spinner.succeed(`${name} completed in ${duration.toFixed(2)}ms`);
    return result;
}

async function runTests() {
    let server;
    let scraper;
    const testResults = {
        passed: 0,
        failed: 0,
        total: 0
    };

    function recordTestResult(testName, passed, error = null) {
        testResults.total++;
        if (passed) {
            testResults.passed++;
            spinner.succeed(`Test passed: ${testName}`);
        } else {
            testResults.failed++;
            spinner.fail(`Test failed: ${testName}${error ? ` - ${error.message}` : ''}`);
        }
    }

    try {
        // Start test server
        spinner = ora('Starting test server...').start();
        const app = express();
        app.use(express.static(path.join(__dirname, '../test')));
        
        await new Promise((resolve, reject) => {
            server = app.listen(3000, () => {
                spinner.succeed('Test server running at http://localhost:3000');
                resolve();
            });
            server.on('error', reject);
        });

        // Initialize Quote model and scraper
        await measurePerformance('Database initialization', async () => {
            await Quote.initialize();
        });

        spinner = ora('Creating scraper instance...').start();
        scraper = new QuoteScraperService({
            concurrency: 2, // Lower for testing
            requestDelay: { min: 100, max: 300 }, // Shorter delays for testing
            maxRequestsPerDomain: 5
        });

        await measurePerformance('Scraper initialization', async () => {
            await scraper.initialize();
        });

        // Clear previous test data
        spinner = ora('Clearing previous test data...').start();
        await Quote.query().delete().where('source_url', 'like', '%test%');
        spinner.succeed('Previous test data cleared');

        // Test 1: Basic format detection and quote extraction
        spinner = ora('\n=== Testing Basic Quote Extraction ===\n').start();
        spinner.info();
        
        // Test transcript format
        const transcriptQuotes = await measurePerformance('Transcript scraping', async () => {
            return await scraper.scrapeUrl('http://localhost:3000/test.html');
        });
        recordTestResult('Transcript format extraction', 
            transcriptQuotes.length === 2 && 
            transcriptQuotes[0].context.speaker === 'TRUMP:');

        // Test article format
        const articleQuotes = await measurePerformance('Article scraping', async () => {
            return await scraper.scrapeUrl('http://localhost:3000/test_news_article.html');
        });
        recordTestResult('Article format extraction', 
            articleQuotes.length === 3 && 
            articleQuotes[0].context.format === 'article');

        // Test social media format
        const socialQuotes = await measurePerformance('Social media scraping', async () => {
            return await scraper.scrapeUrl('http://localhost:3000/test_social_media.html');
        });
        recordTestResult('Social media format extraction', 
            socialQuotes.length === 3 && 
            socialQuotes[0].context.format === 'social');

        // Test 2: Error handling
        spinner = ora('\n=== Testing Error Handling ===\n').start();
        spinner.info();
        
        try {
            await scraper.scrapeUrl('http://localhost:3000/nonexistent.html');
            recordTestResult('404 error handling', false);
        } catch (error) {
            recordTestResult('404 error handling', error.message.includes('net::ERR_ABORTED'));
        }

        // Test 3: Rate limiting
        spinner = ora('\n=== Testing Rate Limiting ===\n').start();
        spinner.info();
        
        const rateLimitPromises = Array(6).fill().map(() => 
            scraper.scrapeUrl('http://localhost:3000/test.html')
        );
        
        try {
            await Promise.all(rateLimitPromises);
            recordTestResult('Rate limiting', false);
        } catch (error) {
            recordTestResult('Rate limiting', error.message.includes('Request limit exceeded'));
        }

        // Test 4: Concurrent scraping
        spinner = ora('\n=== Testing Concurrent Scraping ===\n').start();
        spinner.info();
        
        const urls = [
            'http://localhost:3000/test.html',
            'http://localhost:3000/test_news_article.html',
            'http://localhost:3000/test_social_media.html'
        ];

        const concurrentResults = await measurePerformance('Concurrent scraping', async () => {
            return await Promise.all(urls.map(url => scraper.scrapeUrl(url)));
        });

        recordTestResult('Concurrent scraping', 
            concurrentResults.every(quotes => quotes.length > 0));

        // Test 5: Database operations
        spinner = ora('\n=== Testing Database Operations ===\n').start();
        spinner.info();
        
        const dbStats = await Quote.query().count('* as count').first();
        recordTestResult('Database storage', parseInt(dbStats.count) > 0);

        // Print test summary
        spinner = ora('\n=== Test Summary ===\n').start();
        spinner.info();
        spinner.succeed(`Total tests: ${testResults.total}`);
        spinner.succeed(`Passed: ${testResults.passed}`);
        spinner.warn(`Failed: ${testResults.failed}`);
        spinner.info(`Success rate: ${((testResults.passed / testResults.total) * 100).toFixed(2)}%`);

    } catch (error) {
        if (spinner) spinner.fail(`Test suite failed: ${error.message}`);
        logger.error('Test suite failed:', error);
        process.exitCode = 1;
    } finally {
        // Cleanup
        if (scraper) {
            spinner = ora('Cleaning up scraper...').start();
            await scraper.cleanup();
            spinner.succeed('Scraper cleaned up');
        }
        
        if (server) {
            spinner = ora('Stopping test server...').start();
            await new Promise(resolve => server.close(resolve));
            spinner.succeed('Test server stopped');
        }
    }
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
    if (spinner) spinner.fail(`Unhandled rejection: ${error.message}`);
    logger.error('Unhandled rejection:', error);
    process.exit(1);
});

// Handle SIGINT
process.on('SIGINT', () => {
    if (spinner) spinner.warn('Received SIGINT. Cleaning up...');
    logger.info('Received SIGINT. Cleaning up...');
    process.exit(0);
});

runTests(); 