import * as cheerio from 'cheerio';
import { createLogger } from '../utils/logger.js';
import { archiveService } from './archiveService.js';

const logger = createLogger('ContextService');

class ContextService {
  constructor() {
    this.contextTypes = {
      SPEECH: 'speech',
      INTERVIEW: 'interview',
      TWEET: 'tweet',
      DOCUMENT: 'document',
      COURT: 'court',
      OTHER: 'other'
    };
  }

  /**
   * Enrich a quote with additional context from the source content
   * @param {Object} quote - The quote object to enrich
   * @param {string} content - The HTML content of the source page
   * @returns {Object} - Enriched context object
   */
  async enrichQuoteContext(quote, content) {
    try {
      const $ = cheerio.load(content);
      const context = {
        timestamp: new Date().toISOString(),
        source_url: quote.source_url,
        surrounding_text: '',
        article_title: '',
        article_date: '',
        article_author: '',
        section: '',
        categories: [],
        type: this.determineContextType(quote, content),
        location: this.extractLocation(content),
        audience: this.extractAudience(content),
        precedingContent: this.extractPrecedingContent(quote, content),
        followingContent: this.extractFollowingContent(quote, content),
        mediaContext: this.extractMediaContext(content),
        politicalContext: this.extractPoliticalContext(content),
        metadata: {
          enrichedAt: new Date().toISOString(),
          enrichmentVersion: '1.0'
        }
      };

      // Find the quote in the content
      const quoteText = quote.quote_text;
      const $elements = $('*:contains(' + quoteText + ')');
      
      if ($elements.length > 0) {
        const $element = $elements.first();

        // Get surrounding paragraphs
        const prevParagraph = $element.prev('p').text().trim();
        const nextParagraph = $element.next('p').text().trim();
        context.surrounding_text = [prevParagraph, quoteText, nextParagraph].filter(Boolean).join('\n\n');

        // Get article title
        context.article_title = $('h1').first().text().trim() || 
                              $('title').text().trim();

        // Get article date
        context.article_date = this.extractDate($);

        // Get article author
        context.article_author = this.extractAuthor($);

        // Get section/category
        context.section = this.extractSection($);
        context.categories = this.extractCategories($);
      }

      // Archive the context
      await archiveService.archiveQuote(quote, context);

      logger.info('Context enriched successfully', {
        source: quote.source_url,
        found_elements: $elements.length
      });

      return context;
    } catch (error) {
      logger.error('Error enriching quote context:', error);
      throw error;
    }
  }

  /**
   * Extract the publication date from the page
   * @param {Object} $ - Cheerio instance
   * @returns {string} - The extracted date
   */
  extractDate($) {
    // Common date selectors
    const dateSelectors = [
      'meta[property="article:published_time"]',
      'meta[name="date"]',
      'time',
      '.date',
      '.article-date',
      '.publish-date'
    ];

    for (const selector of dateSelectors) {
      const $element = $(selector);
      if ($element.length > 0) {
        const date = $element.attr('content') || 
                    $element.attr('datetime') || 
                    $element.text();
        if (date) return date.trim();
      }
    }

    return '';
  }

  /**
   * Extract the author from the page
   * @param {Object} $ - Cheerio instance
   * @returns {string} - The extracted author
   */
  extractAuthor($) {
    // Common author selectors
    const authorSelectors = [
      'meta[name="author"]',
      '.author',
      '.byline',
      '.article-author'
    ];

    for (const selector of authorSelectors) {
      const $element = $(selector);
      if ($element.length > 0) {
        const author = $element.attr('content') || $element.text();
        if (author) return author.trim();
      }
    }

    return '';
  }

  /**
   * Extract the section from the page
   * @param {Object} $ - Cheerio instance
   * @returns {string} - The extracted section
   */
  extractSection($) {
    // Common section selectors
    const sectionSelectors = [
      'meta[property="article:section"]',
      '.section',
      '.category'
    ];

    for (const selector of sectionSelectors) {
      const $element = $(selector);
      if ($element.length > 0) {
        const section = $element.attr('content') || $element.text();
        if (section) return section.trim();
      }
    }

    return '';
  }

  /**
   * Extract categories from the page
   * @param {Object} $ - Cheerio instance
   * @returns {Array} - The extracted categories
   */
  extractCategories($) {
    const categories = new Set();

    // Look for category links
    $('.category a, .categories a, .tags a').each((_, element) => {
      const category = $(element).text().trim();
      if (category) categories.add(category);
    });

    // Look for category meta tags
    $('meta[property="article:tag"]').each((_, element) => {
      const category = $(element).attr('content');
      if (category) categories.add(category);
    });

    return Array.from(categories);
  }

  determineContextType(quote, pageContent) {
    // Implement context type detection logic
    if (pageContent.includes('tweet')) return this.contextTypes.TWEET;
    if (pageContent.includes('speech')) return this.contextTypes.SPEECH;
    if (pageContent.includes('interview')) return this.contextTypes.INTERVIEW;
    if (pageContent.includes('court')) return this.contextTypes.COURT;
    if (pageContent.includes('document')) return this.contextTypes.DOCUMENT;
    return this.contextTypes.OTHER;
  }

  extractLocation(pageContent) {
    // Implement location extraction logic
    return {
      type: 'location',
      value: null,
      confidence: 0
    };
  }

  extractAudience(pageContent) {
    // Implement audience extraction logic
    return {
      type: 'audience',
      value: null,
      confidence: 0
    };
  }

  extractPrecedingContent(quote, pageContent) {
    // Implement preceding content extraction logic
    return {
      type: 'preceding',
      content: null,
      length: 0
    };
  }

  extractFollowingContent(quote, pageContent) {
    // Implement following content extraction logic
    return {
      type: 'following',
      content: null,
      length: 0
    };
  }

  extractMediaContext(pageContent) {
    // Implement media context extraction logic
    return {
      type: 'media',
      content: null,
      metadata: {}
    };
  }

  extractPoliticalContext(pageContent) {
    // Implement political context extraction logic
    return {
      type: 'political',
      content: null,
      metadata: {}
    };
  }

  async validateContext(context) {
    const validation = {
      isValid: true,
      issues: [],
      warnings: []
    };

    // Implement context validation logic
    if (!context.type) {
      validation.isValid = false;
      validation.issues.push('Missing context type');
    }

    if (!context.timestamp) {
      validation.isValid = false;
      validation.issues.push('Missing timestamp');
    }

    return validation;
  }
}

export const contextService = new ContextService(); 