import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class ProxyManager {
    constructor() {
        this.proxyFile = path.join(process.cwd(), 'proxies.txt');
        this.proxies = [];
        this.currentIndex = 0;
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
     * @returns {Promise<boolean>} True if proxies were loaded, false otherwise
     */
    async loadProxies() {
        try {
            // Try to read proxies from file
            const content = await fs.readFile(this.proxyFile, 'utf-8');
            this.proxies = content
                .split('\n')
                .map(line => line.trim())
                .filter(line => line && !line.startsWith('#'));

            if (this.proxies.length === 0) {
                logger.warn('No proxies found in proxies.txt');
                return false;
            }

            logger.info(`Loaded ${this.proxies.length} proxies from file`);
            return true;
        } catch (error) {
            if (error.code === 'ENOENT') {
                logger.warn('No proxies.txt file found');
            } else {
                logger.error('Error loading proxies:', error);
            }
            return false;
        }
    }

    /**
     * Get a working proxy
     * @returns {Promise<string|null>} Proxy string or null if no working proxies
     */
    async getProxy() {
        if (this.proxies.length === 0) {
            logger.warn('No proxies available');
            return null;
        }

        const proxy = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        return proxy;
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
            !this.failedProxies.has(proxy)
        );

        logger.info(`Proxy validation complete. ${this.proxies.length} working proxies remaining.`);
    }

    /**
     * Validate a single proxy
     * @private
     * @param {string} proxy Proxy string
     * @returns {Promise<void>}
     */
    async validateProxy(proxy) {
        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                const response = await fetch('https://truthsocial.com', {
                    agent: new HttpsProxyAgent(proxy),
                    timeout: this.timeout
                });

                if (response.ok) {
                    return;
                }
            } catch (error) {
                retries++;
                if (retries === this.maxRetries) {
                    this.failedProxies.add(proxy);
                    logger.warn(`Proxy ${proxy} failed validation:`, error.message);
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }
        }
    }

    /**
     * Mark a proxy as failed
     * @param {string} proxy Proxy string
     */
    markProxyAsFailed(proxy) {
        if (this.failedProxies.has(proxy)) {
            this.failedProxies.delete(proxy);
            logger.warn(`Proxy ${proxy} marked as failed`);
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

    getProxyString() {
        if (this.proxies.length === 0) {
            return null;
        }

        const proxy = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        return proxy;
    }

    getProxyAuthString() {
        const proxy = this.getProxyString();
        if (!proxy) return null;
        
        // If proxy has username:password format
        if (proxy.includes('@')) {
            const [auth, host] = proxy.split('@');
            const [username, password] = auth.split(':');
            return { username, password };
        }
        
        // If proxy is just host:port
        return { username: '', password: '' };
    }

    getProxyList() {
        return [...this.proxies];
    }

    addProxy(proxy) {
        if (!this.proxies.includes(proxy)) {
            this.proxies.push(proxy);
        }
    }

    async saveProxies() {
        try {
            await fs.writeFile(this.proxyFile, this.proxies.join('\n'));
            logger.info('Proxies saved to file');
        } catch (error) {
            logger.error('Error saving proxies:', error);
        }
    }
} 