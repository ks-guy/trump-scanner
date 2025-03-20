const { createLogger } = require('../../utils/logger');
const logger = createLogger('ContentExtractors');

class ContentExtractors {
    static extractors = {
        // Primary Sources
        'White House Press Office': ($) => {
            const selectors = [
                '.body-content .field--name-body',
                '.press-release__body',
                '.press-release__content',
                '.body-content'
            ];
            return this.extractWithSelectors($, selectors);
        },

        'Congress.gov': ($) => {
            const selectors = [
                '.content-body',
                '.legislation-content',
                '.bill-content'
            ];
            return this.extractWithSelectors($, selectors);
        },

        'C-SPAN': ($) => {
            const selectors = [
                '.video-description',
                '.transcript-content',
                '.program-description'
            ];
            return this.extractWithSelectors($, selectors);
        },

        'Truth Social': ($) => {
            const selectors = [
                '.post-content',
                '.post-text',
                '.post-body'
            ];
            return this.extractWithSelectors($, selectors);
        },

        // European News
        'BBC News': ($) => {
            const selectors = [
                'article .story-body__inner',
                '.article__body-content',
                '.article-content'
            ];
            return this.extractWithSelectors($, selectors);
        },

        'Reuters': ($) => {
            const selectors = [
                '.article__content__body',
                '.article-body',
                '.article-content'
            ];
            return this.extractWithSelectors($, selectors);
        },

        'Le Monde': ($) => {
            const selectors = [
                '.article__content',
                '.article-content',
                '.article-body'
            ];
            return this.extractWithSelectors($, selectors);
        },

        // Asian News
        'The Japan Times': ($) => {
            const selectors = [
                '.article-content',
                '.article-body',
                '.article__content'
            ];
            return this.extractWithSelectors($, selectors);
        },

        'The Straits Times': ($) => {
            const selectors = [
                '.article-content',
                '.article-body',
                '.article__content'
            ];
            return this.extractWithSelectors($, selectors);
        },

        // Middle Eastern News
        'Al Jazeera': ($) => {
            const selectors = [
                '.article-content',
                '.article-body',
                '.article__content'
            ];
            return this.extractWithSelectors($, selectors);
        },

        'Haaretz': ($) => {
            const selectors = [
                '.article-content',
                '.article-body',
                '.article__content'
            ];
            return this.extractWithSelectors($, selectors);
        }
    };

    static extractWithSelectors($, selectors) {
        for (const selector of selectors) {
            const content = $(selector).first();
            if (content.length) {
                // Remove unwanted elements
                content.find('script, style, iframe, .advertisement, .social-share, .related-content').remove();
                
                // Get text content
                let text = content.text().trim();
                
                // Clean up the text
                text = this.cleanText(text);
                
                if (text) {
                    return text;
                }
            }
        }
        return null;
    }

    static cleanText(text) {
        return text
            .replace(/\s+/g, ' ')           // Replace multiple spaces with single space
            .replace(/\n+/g, ' ')           // Replace newlines with space
            .replace(/\t+/g, ' ')           // Replace tabs with space
            .replace(/\r+/g, ' ')           // Replace carriage returns with space
            .replace(/\u00A0/g, ' ')        // Replace non-breaking space with space
            .replace(/[^\x20-\x7E]/g, '')   // Remove non-printable characters
            .trim();                        // Trim whitespace
    }

    static extractMetadata($) {
        const metadata = {
            title: this.extractTitle($),
            author: this.extractAuthor($),
            date: this.extractDate($),
            url: this.extractUrl($),
            keywords: this.extractKeywords($)
        };
        return metadata;
    }

    static extractTitle($) {
        const titleSelectors = [
            'h1',
            '.article-title',
            '.headline',
            '.title',
            'meta[property="og:title"]',
            'meta[name="twitter:title"]'
        ];

        for (const selector of titleSelectors) {
            const title = $(selector).first();
            if (title.length) {
                return title.attr('content') || title.text().trim();
            }
        }
        return null;
    }

    static extractAuthor($) {
        const authorSelectors = [
            '.author-name',
            '.byline',
            '.article-author',
            'meta[name="author"]'
        ];

        for (const selector of authorSelectors) {
            const author = $(selector).first();
            if (author.length) {
                return author.attr('content') || author.text().trim();
            }
        }
        return null;
    }

    static extractDate($) {
        const dateSelectors = [
            '.article-date',
            '.published-date',
            '.date',
            'meta[property="article:published_time"]',
            'time[datetime]'
        ];

        for (const selector of dateSelectors) {
            const date = $(selector).first();
            if (date.length) {
                return date.attr('datetime') || date.attr('content') || date.text().trim();
            }
        }
        return null;
    }

    static extractUrl($) {
        const urlSelectors = [
            'meta[property="og:url"]',
            'link[rel="canonical"]'
        ];

        for (const selector of urlSelectors) {
            const url = $(selector).first();
            if (url.length) {
                return url.attr('content') || url.attr('href');
            }
        }
        return null;
    }

    static extractKeywords($) {
        const keywordSelectors = [
            'meta[name="keywords"]',
            'meta[property="article:tag"]'
        ];

        const keywords = [];
        for (const selector of keywordSelectors) {
            const keywordElements = $(selector);
            keywordElements.each((_, element) => {
                const content = $(element).attr('content');
                if (content) {
                    keywords.push(...content.split(',').map(k => k.trim()));
                }
            });
        }
        return [...new Set(keywords)]; // Remove duplicates
    }

    static extractQuotes($) {
        const quotes = [];
        const quoteSelectors = [
            'blockquote',
            '.quote',
            '.quotation',
            'q'
        ];

        for (const selector of quoteSelectors) {
            $(selector).each((_, element) => {
                const quote = $(element).text().trim();
                if (quote) {
                    quotes.push(quote);
                }
            });
        }
        return quotes;
    }

    static extractImages($) {
        const images = [];
        const imageSelectors = [
            'img[src]',
            'meta[property="og:image"]',
            'meta[name="twitter:image"]'
        ];

        for (const selector of imageSelectors) {
            $(selector).each((_, element) => {
                const image = $(element).attr('src') || $(element).attr('content');
                if (image) {
                    images.push(image);
                }
            });
        }
        return [...new Set(images)]; // Remove duplicates
    }
}

module.exports = ContentExtractors; 