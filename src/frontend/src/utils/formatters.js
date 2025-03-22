/**
 * Format a number as a percentage
 * @param {number} value - The value to format
 * @param {number} decimals - Number of decimal places
 * @returns {string} Formatted percentage
 */
export const formatPercent = (value, decimals = 1) => {
    return `${value.toFixed(decimals)}%`;
};

/**
 * Format bytes into human readable string
 * @param {number} bytes - The number of bytes
 * @returns {string} Formatted string (e.g., "1.5 GB")
 */
export const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';

    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

/**
 * Format seconds into human readable duration
 * @param {number} seconds - Number of seconds
 * @returns {string} Formatted duration string
 */
export const formatDuration = (seconds) => {
    if (seconds < 60) {
        return `${Math.floor(seconds)}s`;
    }

    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) {
        return `${minutes}m ${Math.floor(seconds % 60)}s`;
    }

    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ${minutes % 60}m`;
    }

    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
};

/**
 * Format a date to a readable string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date string
 */
export const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleString();
};

/**
 * Format a number with thousand separators
 * @param {number} value - Number to format
 * @returns {string} Formatted number
 */
export const formatNumber = (value) => {
    return new Intl.NumberFormat().format(value);
};

/**
 * Format a rate (per second) value
 * @param {number} value - The rate value
 * @returns {string} Formatted rate string
 */
export const formatRate = (value) => {
    if (value < 1000) {
        return `${value.toFixed(1)}/s`;
    }
    return `${(value / 1000).toFixed(1)}k/s`;
}; 