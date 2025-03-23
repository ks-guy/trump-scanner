import { createLogger } from './logger.js';

const logger = createLogger('VerificationSystem');

class VerificationSystem {
    /**
     * Verify a quote by checking its authenticity and source
     * @param {Object} quote - The quote object to verify
     * @param {string} pageContent - The HTML content of the page
     * @returns {Object} - Verification results
     */
    async verifyQuote(quote, pageContent) {
        try {
            const results = {
                verified: false,
                confidence: 0,
                checks: []
            };

            // Check if quote exists in page content
            const quoteExists = pageContent.includes(quote.quote_text);
            results.checks.push({
                type: 'content_match',
                passed: quoteExists,
                confidence: quoteExists ? 1 : 0
            });

            // Check source credibility
            const sourceCredibility = this.checkSourceCredibility(quote.source_url);
            results.checks.push({
                type: 'source_credibility',
                passed: sourceCredibility.credible,
                confidence: sourceCredibility.score
            });

            // Calculate overall confidence
            const totalConfidence = results.checks.reduce((sum, check) => sum + check.confidence, 0);
            results.confidence = totalConfidence / results.checks.length;
            results.verified = results.confidence >= 0.7;

            logger.info('Quote verification completed', { 
                source: quote.source_url,
                verified: results.verified,
                confidence: results.confidence
            });

            return results;
        } catch (error) {
            logger.error('Error verifying quote:', error);
            throw error;
        }
    }

    /**
     * Check the credibility of a source URL
     * @param {string} url - The source URL to check
     * @returns {Object} - Credibility check results
     */
    checkSourceCredibility(url) {
        // List of credible domains
        const credibleDomains = [
            'reuters.com',
            'apnews.com',
            'bloomberg.com',
            'wsj.com',
            'nytimes.com',
            'washingtonpost.com',
            'politico.com',
            'thehill.com',
            'foxnews.com',
            'cnn.com',
            'nbcnews.com',
            'abcnews.go.com',
            'cbsnews.com',
            'npr.org',
            'bbc.com',
            'bbc.co.uk',
            'realclearpolitics.com'
        ];

        try {
            const domain = new URL(url).hostname.replace('www.', '');
            const isCredible = credibleDomains.some(d => domain.includes(d));
            
            return {
                credible: isCredible,
                score: isCredible ? 0.8 : 0.2
            };
        } catch (error) {
            logger.error('Error checking source credibility:', error);
            return {
                credible: false,
                score: 0
            };
        }
    }
}

export const verificationSystem = new VerificationSystem(); 