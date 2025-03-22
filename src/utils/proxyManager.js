const fs = require('fs').promises;
const path = require('path');
const { logger } = require('./logger');
const fetch = require('node-fetch');

class ProxyManager {
    constructor() {
        this.proxyFile = path.join(process.cwd(), 'proxy.txt');
        this.proxies = [];
        this.failedProxies = new Set();
        this.lastCheck = 0;
        this.checkInterval = 30 * 60 * 1000; // 30 minutes
        this.maxRetries = 3;
        this.timeout = 10000; // 10 seconds
    }

    /**
     * Initialize the proxy manager
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            await this.loadProxies();
            await this.validateProxies();
        } catch (error) {
            logger.error('Error initializing proxy manager:', error);
        }
    }

    /**
     * Load proxies from file
     * @private
     * @returns {Promise<void>}
     */
    async loadProxies() {
        try {
            const content = await fs.readFile(this.proxyFile, 'utf8');
            const lines = content.split('\n').filter(line => line.trim() && !line.startsWith('#'));
            
            this.proxies = lines.map(line => {
                const [host, port, username, password] = line.trim().split(':');
                return {
                    host,
                    port: parseInt(port),
                    username,
                    password,
                    lastUsed: 0,
                    failures: 0,
                    lastCheck: 0
                };
            });

            logger.info(`Loaded ${this.proxies.length} proxies from file`);
        } catch (error) {
            logger.error('Error loading proxies:', error);
            throw error;
        }
    }

    /**
     * Get a working proxy
     * @returns {Promise<Object|null>} Proxy object or null if no working proxies
     */
    async getProxy() {
        // Check if we need to validate proxies
        if (Date.now() - this.lastCheck > this.checkInterval) {
            await this.validateProxies();
        }

        // Filter out failed proxies and sort by last used time
        const availableProxies = this.proxies
            .filter(proxy => !this.failedProxies.has(`${proxy.host}:${proxy.port}`))
            .sort((a, b) => a.lastUsed - b.lastUsed);

        if (availableProxies.length === 0) {
            logger.warn('No working proxies available');
            return null;
        }

        // Get the least recently used proxy
        const proxy = availableProxies[0];
        proxy.lastUsed = Date.now();

        return {
            host: proxy.host,
            port: proxy.port,
            username: proxy.username,
            password: proxy.password
        };
    }

    /**
     * Validate proxies
     * @private
     * @returns {Promise<void>}
     */
    async validateProxies() {
        logger.info('Starting proxy validation...');
        this.lastCheck = Date.now();

        const validationPromises = this.proxies.map(proxy => this.validateProxy(proxy));
        await Promise.all(validationPromises);

        // Remove failed proxies
        this.proxies = this.proxies.filter(proxy => 
            !this.failedProxies.has(`${proxy.host}:${proxy.port}`)
        );

        logger.info(`Proxy validation complete. ${this.proxies.length} working proxies remaining.`);
    }

    /**
     * Validate a single proxy
     * @private
     * @param {Object} proxy Proxy object
     * @returns {Promise<void>}
     */
    async validateProxy(proxy) {
        const proxyUrl = proxy.username && proxy.password
            ? `http://${proxy.username}:${proxy.password}@${proxy.host}:${proxy.port}`
            : `http://${proxy.host}:${proxy.port}`;

        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                const controller = new AbortController();
                const timeout = setTimeout(() => controller.abort(), this.timeout);

                const response = await fetch('https://truthsocial.com', {
                    agent: new (require('https-proxy-agent'))(proxyUrl),
                    signal: controller.signal
                });

                clearTimeout(timeout);

                if (response.ok) {
                    proxy.lastCheck = Date.now();
                    proxy.failures = 0;
                    return;
                }
            } catch (error) {
                retries++;
                if (retries === this.maxRetries) {
                    this.failedProxies.add(`${proxy.host}:${proxy.port}`);
                    logger.warn(`Proxy ${proxy.host}:${proxy.port} failed validation:`, error.message);
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }
        }
    }

    /**
     * Mark a proxy as failed
     * @param {string} host Proxy host
     * @param {number} port Proxy port
     */
    markProxyAsFailed(host, port) {
        const proxy = this.proxies.find(p => p.host === host && p.port === port);
        if (proxy) {
            proxy.failures++;
            if (proxy.failures >= this.maxRetries) {
                this.failedProxies.add(`${host}:${port}`);
                logger.warn(`Proxy ${host}:${port} marked as failed after ${this.maxRetries} failures`);
            }
        }
    }

    /**
     * Get proxy statistics
     * @returns {Object} Proxy statistics
     */
    getStats() {
        return {
            total: this.proxies.length,
            working: this.proxies.length - this.failedProxies.size,
            failed: this.failedProxies.size,
            lastCheck: this.lastCheck
        };
    }
}

module.exports = ProxyManager; 