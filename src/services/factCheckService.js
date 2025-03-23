import axios from 'axios';
import { createLogger } from '../utils/logger.js';
import { archiveService } from './archiveService.js';

const logger = createLogger('FactCheckService');

class FactCheckService {
  constructor() {
    this.sources = {
      factcheck: 'https://www.factcheck.org/search',
      politifact: 'https://www.politifact.com/search',
      wapo: 'https://www.washingtonpost.com/fact-checker/search'
    };
  }

  /**
   * Verify a claim by checking against fact-checking sources
   * @param {Object} quote - The quote object containing the claim
   * @returns {Object} - Fact check results
   */
  async verifyClaim(quote) {
    try {
      const claims = this.extractClaims(quote.quote_text);
      const results = {
        timestamp: new Date().toISOString(),
        claims: [],
        sources_checked: Object.keys(this.sources),
        overall_rating: null
      };

      for (const claim of claims) {
        const claimResults = await this.checkClaimAgainstSources(claim);
        results.claims.push({
          claim_text: claim,
          ...claimResults
        });
      }

      // Calculate overall rating based on individual claim ratings
      results.overall_rating = this.calculateOverallRating(results.claims);

      logger.info('Fact check completed', {
        source: quote.source_url,
        claims_count: claims.length,
        overall_rating: results.overall_rating
      });

      return results;
    } catch (error) {
      logger.error('Error verifying claim:', error);
      throw error;
    }
  }

  /**
   * Extract individual claims from a quote
   * @param {string} text - The quote text
   * @returns {Array} - Array of extracted claims
   */
  extractClaims(text) {
    // Split text into sentences
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    
    // Filter sentences that are likely to be claims
    return sentences.filter(sentence => {
      const s = sentence.toLowerCase().trim();
      return (
        s.includes('i') ||
        s.includes('we') ||
        s.includes('they') ||
        s.includes('he') ||
        s.includes('she') ||
        s.includes('it') ||
        s.includes('there') ||
        s.includes('this') ||
        s.includes('that')
      );
    });
  }

  /**
   * Check a claim against fact-checking sources
   * @param {string} claim - The claim to check
   * @returns {Object} - Results from fact-checking sources
   */
  async checkClaimAgainstSources(claim) {
    const results = {
      matches: [],
      rating: null,
      confidence: 0
    };

    try {
      // Search each fact-checking source
      for (const [source, url] of Object.entries(this.sources)) {
        const sourceResults = await this.searchSource(source, url, claim);
        if (sourceResults.matches.length > 0) {
          results.matches.push(...sourceResults.matches);
          results.confidence = Math.max(results.confidence, sourceResults.confidence);
        }
      }

      // Determine overall rating based on matches
      if (results.matches.length > 0) {
        results.rating = this.determineRating(results.matches);
      }

    } catch (error) {
      logger.error('Error checking claim against sources:', error);
    }

    return results;
  }

  /**
   * Search a specific fact-checking source
   * @param {string} source - The source name
   * @param {string} url - The source URL
   * @param {string} claim - The claim to search for
   * @returns {Object} - Search results
   */
  async searchSource(source, url, claim) {
    try {
      // Note: This is a mock implementation
      // In a real implementation, you would need to:
      // 1. Properly handle rate limiting
      // 2. Parse the actual HTML response
      // 3. Extract fact check results
      // 4. Handle pagination
      return {
        matches: [],
        confidence: 0
      };
    } catch (error) {
      logger.error(`Error searching source ${source}:`, error);
      return {
        matches: [],
        confidence: 0
      };
    }
  }

  /**
   * Calculate the overall rating based on individual claim ratings
   * @param {Array} claims - Array of claim results
   * @returns {string} - Overall rating
   */
  calculateOverallRating(claims) {
    const validRatings = claims
      .map(claim => claim.rating)
      .filter(Boolean);

    if (validRatings.length === 0) {
      return null;
    }

    // Count occurrences of each rating
    const ratingCounts = validRatings.reduce((acc, rating) => {
      acc[rating] = (acc[rating] || 0) + 1;
      return acc;
    }, {});

    // Return the most common rating
    return Object.entries(ratingCounts)
      .sort(([,a], [,b]) => b - a)[0][0];
  }

  /**
   * Determine rating based on fact check matches
   * @param {Array} matches - Array of fact check matches
   * @returns {string} - Determined rating
   */
  determineRating(matches) {
    // This is a simplified rating system
    // In a real implementation, you would need more sophisticated logic
    const ratings = matches.map(match => match.rating).filter(Boolean);
    
    if (ratings.length === 0) {
      return null;
    }

    // Return the most severe rating
    const ratingOrder = ['false', 'mostly_false', 'half_true', 'mostly_true', 'true'];
    return ratings.sort((a, b) => 
      ratingOrder.indexOf(a) - ratingOrder.indexOf(b)
    )[0];
  }

  async trackStatementEvolution(quote) {
    const evolution = {
      quoteId: quote.id,
      timestamp: new Date().toISOString(),
      previousStatements: [],
      changes: [],
      metadata: {
        trackingStatus: 'active'
      }
    };

    // Implement statement evolution tracking logic
    // This could involve:
    // 1. Finding similar statements over time
    // 2. Detecting changes in wording
    // 3. Tracking context changes

    return evolution;
  }

  async generateFactCheckReport(quote) {
    const report = {
      quoteId: quote.id,
      timestamp: new Date().toISOString(),
      summary: '',
      details: [],
      sources: [],
      recommendations: [],
      metadata: {
        reportVersion: '1.0',
        generationStatus: 'complete'
      }
    };

    // Implement report generation logic
    // This could involve:
    // 1. Summarizing fact-check results
    // 2. Providing detailed analysis
    // 3. Citing sources
    // 4. Making recommendations

    return report;
  }
}

export const factCheckService = new FactCheckService(); 