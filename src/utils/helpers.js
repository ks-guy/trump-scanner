/**
 * Helper utilities for scraping and data processing
 */

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise} Promise that resolves after the delay
 */
export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a random delay between min and max milliseconds
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {Promise} Promise that resolves after the random delay
 */
export const randomDelay = (min, max) => {
    const delayTime = Math.floor(Math.random() * (max - min + 1) + min);
    return delay(delayTime);
};

/**
 * Rate limiter class to manage request rates
 */
export class RateLimiter {
    constructor(maxRequests, timeWindow) {
        this.maxRequests = maxRequests;
        this.timeWindow = timeWindow;
        this.requests = [];
    }

    async waitForSlot() {
        const now = Date.now();
        this.requests = this.requests.filter(time => time > now - this.timeWindow);
        
        if (this.requests.length >= this.maxRequests) {
            const oldestRequest = this.requests[0];
            const waitTime = oldestRequest + this.timeWindow - now;
            await delay(waitTime);
        }
        
        this.requests.push(now);
    }
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @param {string} errorMessage - Error message to log
 * @returns {Promise} Promise that resolves with the function result
 */
export const retry = async (fn, maxRetries = 3, errorMessage = '') => {
    let lastError;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            if (attempt < maxRetries - 1) {
                const delayTime = Math.min(1000 * Math.pow(2, attempt), 10000);
                await delay(delayTime);
            }
        }
    }
    throw new Error(`${errorMessage}: ${lastError.message}`);
};

/**
 * Parse a string into a Date object, handling various formats
 * @param {string} dateStr - Date string to parse
 * @returns {Date|null} Parsed Date object or null if invalid
 */
export const parseDate = (dateStr) => {
    if (!dateStr) return null;
    
    // Try parsing with Date.parse first
    const timestamp = Date.parse(dateStr);
    if (!isNaN(timestamp)) {
        return new Date(timestamp);
    }
    
    // Handle relative time strings
    const relativeTime = {
        'just now': 0,
        'a minute ago': 1,
        'an hour ago': 60,
        'yesterday': 1440,
        'a day ago': 1440,
        'a week ago': 10080
    };
    
    const lcDateStr = dateStr.toLowerCase();
    if (relativeTime.hasOwnProperty(lcDateStr)) {
        const minutesAgo = relativeTime[lcDateStr];
        return new Date(Date.now() - minutesAgo * 60000);
    }
    
    // Handle "X minutes/hours/days ago" format
    const timeAgoMatch = lcDateStr.match(/(\d+)\s+(minute|hour|day|week|month|year)s?\s+ago/);
    if (timeAgoMatch) {
        const [, amount, unit] = timeAgoMatch;
        const multipliers = {
            minute: 1,
            hour: 60,
            day: 1440,
            week: 10080,
            month: 43200,
            year: 525600
        };
        return new Date(Date.now() - amount * multipliers[unit] * 60000);
    }
    
    return null;
} 