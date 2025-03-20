const { exec } = require('child_process');
const { createLogger } = require('../utils/logger');
const logger = createLogger('AutoAccept');

class AutoAccept {
    static async acceptAllChanges() {
        try {
            // Accept all changes in git
            await this.acceptGitChanges();
            
            // Accept all changes in npm
            await this.acceptNpmChanges();
            
            logger.info('All changes have been accepted successfully');
        } catch (error) {
            logger.error(`Error accepting changes: ${error.message}`);
            throw error;
        }
    }

    static acceptGitChanges() {
        return new Promise((resolve, reject) => {
            exec('git add . && git commit -m "Auto-accepted changes"', (error) => {
                if (error) {
                    logger.warn('No git changes to accept');
                } else {
                    logger.info('Accepted all git changes');
                }
                resolve();
            });
        });
    }

    static acceptNpmChanges() {
        return new Promise((resolve, reject) => {
            exec('npm install --yes', (error) => {
                if (error) {
                    logger.warn('No npm changes to accept');
                } else {
                    logger.info('Accepted all npm changes');
                }
                resolve();
            });
        });
    }
}

module.exports = AutoAccept; 