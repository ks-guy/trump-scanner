const ProxyManager = require('../utils/proxyManager');
const { logger } = require('../utils/logger');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs').promises;

class ProxyTester {
    constructor() {
        this.proxyManager = new ProxyManager();
        this.resultsFile = path.join(process.cwd(), 'proxy_results.json');
        this.testUrls = [
            'https://truthsocial.com',
            'https://twitter.com',
            'https://facebook.com'
        ];
        this.timeout = 10000; // 10 seconds
        this.maxRetries = 3;
    }

    /**
     * Run proxy tests
     * @returns {Promise<void>}
     */
    async runTests() {
        try {
            logger.info('Starting proxy tests...');
            await this.proxyManager.initialize();

            const results = {
                timestamp: new Date().toISOString(),
                total: this.proxyManager.proxies.length,
                working: [],
                failed: [],
                stats: {}
            };

            // Test each proxy
            for (const proxy of this.proxyManager.proxies) {
                const proxyKey = `${proxy.host}:${proxy.port}`;
                const testResult = await this.testProxy(proxy);

                if (testResult.working) {
                    results.working.push({
                        host: proxy.host,
                        port: proxy.port,
                        speed: testResult.speed,
                        urls: testResult.workingUrls
                    });
                } else {
                    results.failed.push({
                        host: proxy.host,
                        port: proxy.port,
                        error: testResult.error
                    });
                }
            }

            // Calculate statistics
            results.stats = {
                total: results.total,
                working: results.working.length,
                failed: results.failed.length,
                successRate: ((results.working.length / results.total) * 100).toFixed(2) + '%',
                averageSpeed: this.calculateAverageSpeed(results.working)
            };

            // Save results
            await this.saveResults(results);
            this.printResults(results);

        } catch (error) {
            logger.error('Error running proxy tests:', error);
            throw error;
        }
    }

    /**
     * Test a single proxy
     * @private
     * @param {Object} proxy Proxy object
     * @returns {Promise<Object>} Test results
     */
    async testProxy(proxy) {
        const proxyUrl = proxy.username && proxy.password
            ? `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
            : `http://${proxy.host}:${proxy.port}`;

        const workingUrls = [];
        let totalSpeed = 0;
        let successfulTests = 0;

        for (const url of this.testUrls) {
            let retries = 0;
            while (retries < this.maxRetries) {
                try {
                    const controller = new AbortController();
                    const timeout = setTimeout(() => controller.abort(), this.timeout);

                    const startTime = Date.now();
                    const response = await fetch(url, {
                        agent: new (require('https-proxy-agent'))(proxyUrl),
                        signal: controller.signal
                    });

                    clearTimeout(timeout);

                    if (response.ok) {
                        const speed = Date.now() - startTime;
                        totalSpeed += speed;
                        workingUrls.push({ url, speed });
                        successfulTests++;
                        break;
                    }
                } catch (error) {
                    retries++;
                    if (retries === this.maxRetries) {
                        return {
                            working: false,
                            error: error.message
                        };
                    }
                    await new Promise(resolve => setTimeout(resolve, 1000 * retries));
                }
            }
        }

        if (successfulTests > 0) {
            return {
                working: true,
                speed: Math.round(totalSpeed / successfulTests),
                workingUrls
            };
        }

        return {
            working: false,
            error: 'All tests failed'
        };
    }

    /**
     * Calculate average speed of working proxies
     * @private
     * @param {Array} workingProxies Array of working proxies
     * @returns {number} Average speed in milliseconds
     */
    calculateAverageSpeed(workingProxies) {
        if (workingProxies.length === 0) return 0;
        const totalSpeed = workingProxies.reduce((sum, proxy) => sum + proxy.speed, 0);
        return Math.round(totalSpeed / workingProxies.length);
    }

    /**
     * Save test results to file
     * @private
     * @param {Object} results Test results
     * @returns {Promise<void>}
     */
    async saveResults(results) {
        try {
            await fs.writeFile(
                this.resultsFile,
                JSON.stringify(results, null, 2)
            );
            logger.info(`Results saved to ${this.resultsFile}`);
        } catch (error) {
            logger.error('Error saving results:', error);
            throw error;
        }
    }

    /**
     * Print test results to console
     * @private
     * @param {Object} results Test results
     */
    printResults(results) {
        console.log('\nProxy Test Results:');
        console.log('===================');
        console.log(`Timestamp: ${results.timestamp}`);
        console.log(`Total Proxies: ${results.stats.total}`);
        console.log(`Working Proxies: ${results.stats.working}`);
        console.log(`Failed Proxies: ${results.stats.failed}`);
        console.log(`Success Rate: ${results.stats.successRate}`);
        console.log(`Average Speed: ${results.stats.averageSpeed}ms`);

        console.log('\nWorking Proxies:');
        console.log('----------------');
        results.working.forEach(proxy => {
            console.log(`${proxy.host}:${proxy.port} - ${proxy.speed}ms`);
        });

        console.log('\nFailed Proxies:');
        console.log('---------------');
        results.failed.forEach(proxy => {
            console.log(`${proxy.host}:${proxy.port} - ${proxy.error}`);
        });
    }
}

// Run tests if script is executed directly
if (require.main === module) {
    const tester = new ProxyTester();
    tester.runTests().catch(error => {
        logger.error('Proxy testing failed:', error);
        process.exit(1);
    });
}

module.exports = ProxyTester; 