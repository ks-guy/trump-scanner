const userAgents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.107 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:89.0) Gecko/20100101 Firefox/89.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Edge/91.0.864.59',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15'
];

let lastUsedIndex = -1;

/**
 * Get a random user agent from the list
 * @returns {string} A random user agent string
 */
export function getRandomUserAgent() {
    const index = Math.floor(Math.random() * userAgents.length);
    return userAgents[index];
}

/**
 * Get the next user agent in sequence
 * @returns {string} Next user agent string
 */
export const getNextUserAgent = () => {
    lastUsedIndex = (lastUsedIndex + 1) % userAgents.length;
    return userAgents[lastUsedIndex];
};

/**
 * Add a new user agent to the list
 * @param {string} userAgent - User agent string to add
 */
export const addUserAgent = (userAgent) => {
    if (!userAgents.includes(userAgent)) {
        userAgents.push(userAgent);
    }
};

/**
 * Get all available user agents
 * @returns {string[]} Array of user agent strings
 */
export const getAllUserAgents = () => [...userAgents]; 