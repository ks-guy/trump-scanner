import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';

export class ProxyManager {
    constructor(proxyFilePath = 'proxy.txt') {
        this.proxyFilePath = proxyFilePath;
        this.proxies = [];
        this.currentIndex = 0;
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
                })
                .filter(proxy => this.validateProxy(proxy));

            logger.info(`Loaded ${this.proxies.length} valid proxies from ${this.proxyFilePath}`);
            return this.proxies.length > 0;
        } catch (error) {
            logger.error('Error loading proxies:', error);
            return false;
        }
    }

    validateProxy(proxy) {
        if (!proxy.host || !proxy.port) {
            logger.warn('Invalid proxy format: missing host or port');
            return false;
        }
        if (proxy.port < 1 || proxy.port > 65535) {
            logger.warn('Invalid proxy port:', proxy.port);
            return false;
        }
        if (!/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(proxy.host)) {
            logger.warn('Invalid proxy host format:', proxy.host);
            return false;
        }
        return true;
    }

    getNextProxy() {
        if (this.proxies.length === 0) {
            return null;
        }

        const proxy = this.proxies[this.currentIndex];
        this.currentIndex = (this.currentIndex + 1) % this.proxies.length;
        return proxy;
    }

    getProxyString() {
        const proxy = this.getNextProxy();
        if (!proxy) {
            return null;
        }
        return `http://${proxy.host}:${proxy.port}`;
    }

    getProxyAuthString() {
        const proxy = this.getNextProxy();
        if (!proxy) {
            return null;
        }
        // Mask the proxy details in logs
        logger.debug('Using proxy:', `${proxy.host}:****`);
        return `${proxy.host}:${proxy.port}`;
    }
} 