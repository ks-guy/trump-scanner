const axios = require('axios');
const { logger } = require('../utils/logger');
const archiveService = require('./archiveService');
const contextService = require('./contextService');
const factCheckService = require('./factCheckService');

class SocialMediaService {
  constructor() {
    this.platforms = {
      TRUTH_SOCIAL: 'truth_social',
      TWITTER: 'twitter',
      FACEBOOK: 'facebook',
      INSTAGRAM: 'instagram'
    };

    this.apiEndpoints = {
      [this.platforms.TRUTH_SOCIAL]: process.env.TRUTH_SOCIAL_API_URL,
      [this.platforms.TWITTER]: process.env.TWITTER_API_URL,
      [this.platforms.FACEBOOK]: process.env.FACEBOOK_API_URL,
      [this.platforms.INSTAGRAM]: process.env.INSTAGRAM_API_URL
    };
  }

  async archiveSocialMediaContent(platform, userId, options = {}) {
    try {
      const content = await this.fetchPlatformContent(platform, userId, options);
      const processedContent = await this.processContent(content);
      
      // Archive the content
      await archiveService.archiveSource(
        `${platform}_${userId}_${Date.now()}`,
        JSON.stringify(processedContent)
      );

      return processedContent;
    } catch (error) {
      logger.error(`Error archiving ${platform} content:`, error);
      throw error;
    }
  }

  async fetchPlatformContent(platform, userId, options) {
    const endpoint = this.apiEndpoints[platform];
    if (!endpoint) {
      throw new Error(`Unsupported platform: ${platform}`);
    }

    const response = await axios.get(endpoint, {
      params: {
        user_id: userId,
        ...options
      },
      headers: {
        Authorization: `Bearer ${process.env[`${platform.toUpperCase()}_API_TOKEN`]}`
      }
    });

    return response.data;
  }

  async processContent(content) {
    const processedContent = {
      posts: [],
      metadata: {
        processedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    for (const post of content) {
      const processedPost = {
        id: post.id,
        platform: post.platform,
        content: post.content,
        timestamp: post.timestamp,
        engagement: {
          likes: post.likes,
          shares: post.shares,
          comments: post.comments
        },
        media: await this.processMedia(post.media),
        context: await contextService.enrichQuoteContext(
          { quote_text: post.content },
          JSON.stringify(post)
        ),
        factCheck: await factCheckService.verifyClaim({
          quote_text: post.content,
          id: post.id
        })
      };

      processedContent.posts.push(processedPost);
    }

    return processedContent;
  }

  async processMedia(media) {
    if (!media) return [];

    return media.map(item => ({
      type: item.type,
      url: item.url,
      metadata: {
        size: item.size,
        format: item.format,
        duration: item.duration
      }
    }));
  }

  async monitorNewContent(platform, userId, interval = 300000) {
    // Monitor for new content every 5 minutes by default
    setInterval(async () => {
      try {
        await this.archiveSocialMediaContent(platform, userId, {
          since: Date.now() - interval
        });
      } catch (error) {
        logger.error(`Error monitoring ${platform} content:`, error);
      }
    }, interval);
  }

  async searchHistoricalContent(platform, query, dateRange) {
    try {
      const content = await this.fetchPlatformContent(platform, null, {
        query,
        start_date: dateRange.start,
        end_date: dateRange.end
      });

      return await this.processContent(content);
    } catch (error) {
      logger.error(`Error searching ${platform} content:`, error);
      throw error;
    }
  }
}

module.exports = new SocialMediaService(); 