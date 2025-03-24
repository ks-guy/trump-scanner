/**
 * Helper utilities for scraping and data processing
 */

/**
 * Sleep for a specified number of milliseconds
 * @param {number} ms - Number of milliseconds to sleep
 * @returns {Promise<void>}
 */
export const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Generate a random delay between min and max milliseconds
 * @param {number} min - Minimum delay in milliseconds
 * @param {number} max - Maximum delay in milliseconds
 * @returns {Promise<void>}
 */
export const randomDelay = async (min, max) => {
    const delay = Math.floor(Math.random() * (max - min) + min);
    await sleep(delay);
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
            await sleep(waitTime);
        }
        
        this.requests.push(now);
    }
}

/**
 * Retry a function with exponential backoff
 * @param {Function} fn - Function to retry
 * @param {Object} options - Retry options
 * @param {number} options.maxRetries - Maximum number of retries (default: 3)
 * @param {number} options.initialDelay - Initial delay in milliseconds (default: 1000)
 * @param {Function} options.shouldRetry - Function to determine if retry should be attempted (default: always retry)
 * @returns {Promise<any>}
 */
export const retry = async (fn, options = {}) => {
    const {
        maxRetries = 3,
        initialDelay = 1000,
        shouldRetry = () => true
    } = options;

    let lastError;
    
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error) {
            lastError = error;
            
            if (attempt === maxRetries - 1 || !shouldRetry(error)) {
                throw error;
            }

            const delay = initialDelay * Math.pow(2, attempt);
            await sleep(delay);
        }
    }

    throw lastError;
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