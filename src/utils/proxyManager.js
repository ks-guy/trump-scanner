import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { logger } from './logger.js';
import fetch from 'node-fetch';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { createLoggerComponent } from './logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const loggerProxyManager = createLoggerComponent('ProxyManager');

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
            loggerProxyManager.error('Error initializing proxy manager:', error);
        }
    }

    /**
     * Load proxies from file
     * @private
     * @returns {Promise<boolean>} True if proxies were loaded, false otherwise
     */
    async loadProxies() {
        try {
            // Check if file exists first
            try {
                await fs.access(this.proxyFile);
            } catch (error) {
                loggerProxyManager.warn(`Proxy file ${this.proxyFile} does not exist`);
                return false;
            }

            const content = await fs.readFile(this.proxyFile, 'utf-8');
            const newProxies = content
                .split('\n')
                .filter(line => line.trim() && !line.startsWith('#'))
                .map(line => {
                    const [host, port, username, password] = line.split(':');
                    return {
                        host,
                        port: parseInt(port),
                        username,
                        password
                    };
                });

            // Only add proxies that aren't already in the list
            for (const proxy of newProxies) {
                if (!this.proxies.some(p => p.host === proxy.host && p.port === proxy.port)) {
                    this.proxies.push(proxy);
                }
            }

            loggerProxyManager.info(`Loaded ${this.proxies.length} proxies`);
            return true;
        } catch (error) {
            loggerProxyManager.error('Error loading proxies:', error);
            return false;
        }
    }

    /**
     * Get a working proxy
     * @returns {Promise<Object|null>} Proxy object or null if no working proxies
     */
    async getProxy() {
        if (this.proxies.length === 0) {
            const loaded = await this.loadProxies();
            if (!loaded || this.proxies.length === 0) {
                return null;
            }
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
        loggerProxyManager.info('Starting proxy validation...');
        this.lastCheck = Date.now();

        const validationPromises = this.proxies.map(proxy => this.validateProxy(proxy));
        await Promise.all(validationPromises);

        // Remove failed proxies
        this.proxies = this.proxies.filter(proxy => 
            !this.failedProxies.has(proxy)
        );

        loggerProxyManager.info(`Proxy validation complete. ${this.proxies.length} working proxies remaining.`);
    }

    /**
     * Validate a single proxy
     * @private
     * @param {Object} proxy Proxy object
     * @returns {Promise<void>}
     */
    async validateProxy(proxy) {
        let retries = 0;
        while (retries < this.maxRetries) {
            try {
                const proxyUrl = `http://${proxy.host}:${proxy.port}`;
                const response = await fetch('https://truthsocial.com', {
                    agent: new HttpsProxyAgent(proxyUrl),
                    timeout: this.timeout
                });

                if (response.ok) {
                    return;
                }
            } catch (error) {
                retries++;
                if (retries === this.maxRetries) {
                    this.failedProxies.add(proxy);
                    loggerProxyManager.warn(`Proxy ${proxy.host}:${proxy.port} failed validation:`, error.message);
                }
                await new Promise(resolve => setTimeout(resolve, 1000 * retries));
            }
        }
    }

    /**
     * Mark a proxy as failed
     * @param {Object} proxy Proxy object
     */
    async markProxyAsFailed(proxy) {
        // Remove failed proxy from the list
        this.proxies = this.proxies.filter(p => 
            p.host !== proxy.host || p.port !== proxy.port
        );
        
        // If we're running low on proxies, try to reload
        if (this.proxies.length < 5) {
            await this.loadProxies();
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

    /**
     * Add a new proxy
     * @param {Object} proxy Proxy object
     */
    async addProxy(proxy) {
        // Check if proxy already exists
        if (!this.proxies.some(p => p.host === proxy.host && p.port === proxy.port)) {
            this.proxies.push(proxy);
            await this.saveProxies();
        }
    }

    /**
     * Save proxies to file
     * @private
     */
    async saveProxies() {
        try {
            const proxyStrings = this.proxies.map(proxy => 
                `${proxy.host}:${proxy.port}:${proxy.username || ''}:${proxy.password || ''}`
            ).join('\n');
            
            await fs.writeFile(this.proxyFile, proxyStrings);
            loggerProxyManager.info('Proxies saved to file');
        } catch (error) {
            loggerProxyManager.error('Error saving proxies:', error);
        }
    }
} 