import { ProxyTester } from '../utils/proxyTester.js';
import { logger } from '../utils/logger.js';

async function main() {
    try {
        const tester = new ProxyTester();
        const proxiesLoaded = await tester.loadProxies();
        
        if (!proxiesLoaded) {
            logger.error('No proxies found in proxy.txt');
            process.exit(1);
        }

        logger.info('Starting proxy tests...');
        const results = await tester.testAllProxies();

        // Save results to a file
        const fs = await import('fs/promises');
        await fs.writeFile(
            'proxy_test_results.json',
            JSON.stringify(results, null, 2)
        );

        logger.info('Proxy test results saved to proxy_test_results.json');
        process.exit(0);
    } catch (error) {
        logger.error('Error running proxy tests:', error);
        process.exit(1);
    }
}

main(); 