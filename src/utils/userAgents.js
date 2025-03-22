const USER_AGENTS = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 Edg/122.0.0.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Safari/605.1.15',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36 OPR/108.0.0.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3.1 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36'
];

let lastUsedIndex = -1;

/**
 * Get a random user agent from the list
 * @returns {string} Random user agent string
 */
export const getRandomUserAgent = () => {
    const index = Math.floor(Math.random() * USER_AGENTS.length);
    return USER_AGENTS[index];
};

/**
 * Get the next user agent in sequence
 * @returns {string} Next user agent string
 */
export const getNextUserAgent = () => {
    lastUsedIndex = (lastUsedIndex + 1) % USER_AGENTS.length;
    return USER_AGENTS[lastUsedIndex];
};

/**
 * Add a new user agent to the list
 * @param {string} userAgent - User agent string to add
 */
export const addUserAgent = (userAgent) => {
    if (!USER_AGENTS.includes(userAgent)) {
        USER_AGENTS.push(userAgent);
    }
};

/**
 * Get all available user agents
 * @returns {string[]} Array of user agent strings
 */
export const getAllUserAgents = () => [...USER_AGENTS]; 