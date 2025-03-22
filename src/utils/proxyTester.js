import fetch from 'node-fetch';
import { logger } from './logger.js';
import fs from 'fs/promises';

export class ProxyTester {
    constructor(proxyFilePath = 'proxy.txt') {
        this.proxyFilePath = proxyFilePath;
        this.proxies = [];
        this.testResults = [];
    }

    async loadProxies() {
        try {
            const content = await fs.readFile(this.proxyFilePath, 'utf-8');
            this.proxies = content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'))
                .map(line => {
                    const [host, port] = line.split(':');
                    return { host, port: parseInt(port, 10) };
                });

            logger.info(`Loaded ${this.proxies.length} proxies from ${this.proxyFilePath}`);
            return this.proxies.length > 0;
        } catch (error) {
            logger.error('Error loading proxies:', error);
            return false;
        }
    }

    async testProxy(proxy) {
        const startTime = Date.now();
        const proxyUrl = `http://${proxy.host}:${proxy.port}`;
        const testUrls = [
            'https://www.courtlistener.com',
            'https://api.ipify.org?format=json',
            'https://httpbin.org/ip'
        ];

        const results = {
            proxy: proxyUrl,
            status: 'failed',
            responseTime: 0,
            anonymity: 'unknown',
            errors: [],
            ip: null
        };

        try {
            // Test connectivity to CourtListener
            const courtListenerResponse = await fetch('https://www.courtlistener.com', {
                agent: new (require('https-proxy-agent'))(proxyUrl),
                timeout: 10000
            });

            if (!courtListenerResponse.ok) {
                throw new Error(`CourtListener returned ${courtListenerResponse.status}`);
            }

            // Test IP detection
            const ipResponse = await fetch('https://api.ipify.org?format=json', {
                agent: new (require('https-proxy-agent'))(proxyUrl),
                timeout: 10000
            });

            if (ipResponse.ok) {
                const ipData = await ipResponse.json();
                results.ip = ipData.ip;
            }

            // Test anonymity
            const httpbinResponse = await fetch('https://httpbin.org/ip', {
                agent: new (require('https-proxy-agent'))(proxyUrl),
                timeout: 10000
            });

            if (httpbinResponse.ok) {
                const httpbinData = await httpbinResponse.json();
                results.anonymity = this.determineAnonymityLevel(httpbinData);
            }

            results.status = 'success';
            results.responseTime = Date.now() - startTime;

        } catch (error) {
            results.errors.push(error.message);
        }

        return results;
    }

    determineAnonymityLevel(httpbinData) {
        const headers = httpbinData.headers || {};
        const revealingHeaders = [
            'X-Forwarded-For',
            'X-Real-IP',
            'Via',
            'Proxy-Connection'
        ];

        const hasRevealingHeaders = revealingHeaders.some(header => 
            headers[header] && headers[header].includes(httpbinData.origin)
        );

        if (hasRevealingHeaders) {
            return 'transparent';
        } else if (headers['X-Forwarded-For']) {
            return 'anonymous';
        } else {
            return 'elite';
        }
    }

    async testAllProxies() {
        logger.info('Starting proxy tests...');
        
        for (const proxy of this.proxies) {
            logger.info(`Testing proxy: ${proxy.host}:${proxy.port}`);
            const result = await this.testProxy(proxy);
            this.testResults.push(result);

            // Log the result
            if (result.status === 'success') {
                logger.info(`Proxy ${proxy.host}:${proxy.port} is working:
                    Response time: ${result.responseTime}ms
                    Anonymity: ${result.anonymity}
                    IP: ${result.ip}`);
            } else {
                logger.error(`Proxy ${proxy.host}:${proxy.port} failed:
                    Errors: ${result.errors.join(', ')}`);
            }

            // Add delay between tests to avoid overwhelming proxies
            await new Promise(resolve => setTimeout(resolve, 2000));
        }

        // Generate summary
        const workingProxies = this.testResults.filter(r => r.status === 'success');
        const eliteProxies = workingProxies.filter(r => r.anonymity === 'elite');
        const anonymousProxies = workingProxies.filter(r => r.anonymity === 'anonymous');
        const transparentProxies = workingProxies.filter(r => r.anonymity === 'transparent');

        logger.info(`
Proxy Test Summary:
------------------
Total proxies tested: ${this.proxies.length}
Working proxies: ${workingProxies.length}
Failed proxies: ${this.proxies.length - workingProxies.length}

Anonymity Levels:
Elite: ${eliteProxies.length}
Anonymous: ${anonymousProxies.length}
Transparent: ${transparentProxies.length}

Average response time: ${workingProxies.reduce((acc, r) => acc + r.responseTime, 0) / workingProxies.length}ms
        `);

        return this.testResults;
    }
} 