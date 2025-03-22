const { createLogger } = require('../utils/logger');
const logger = createLogger('Auth');

// For development, we'll use a simple middleware that allows all requests
const authenticate = (req, res, next) => {
    // For development, allow all requests
    next();
};

module.exports = {
    authenticate
}; 