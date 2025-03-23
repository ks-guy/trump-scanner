const axios = require('axios');
const { logger } = require('../utils/logger');
const archiveService = require('./archiveService');
const contextService = require('./contextService');
const factCheckService = require('./factCheckService');
const path = require('path');
const fs = require('fs');

class CourtTestimonyService {
  constructor() {
    this.sources = {
      PACER: 'pacer',
      COURT_LISTENER: 'court_listener',
      JUSTIA: 'justia'
    };

    this.testimonyDir = path.join(__dirname, '../../data/testimony');
    this.ensureTestimonyDirectory();
  }

  ensureTestimonyDirectory() {
    if (!fs.existsSync(this.testimonyDir)) {
      fs.mkdirSync(this.testimonyDir, { recursive: true });
    }
  }

  async processTestimony(source, caseId, options = {}) {
    try {
      // Fetch testimony data
      const testimonyData = await this.fetchTestimony(source, caseId, options);
      
      // Process the testimony
      const processedTestimony = await this.processTestimonyData(testimonyData);
      
      // Archive the testimony
      await this.archiveTestimony(processedTestimony);

      return processedTestimony;
    } catch (error) {
      logger.error(`Error processing testimony for case ${caseId}:`, error);
      throw error;
    }
  }

  async fetchTestimony(source, caseId, options) {
    const sourceConfig = this.getSourceConfig(source);
    if (!sourceConfig) {
      throw new Error(`Unsupported source: ${source}`);
    }

    const response = await axios.get(sourceConfig.endpoint, {
      params: {
        case_id: caseId,
        ...options
      },
      headers: {
        Authorization: `Bearer ${process.env[`${source.toUpperCase()}_API_TOKEN`]}`
      }
    });

    return response.data;
  }

  getSourceConfig(source) {
    const configs = {
      [this.sources.PACER]: {
        endpoint: process.env.PACER_API_URL,
        format: 'pacer'
      },
      [this.sources.COURT_LISTENER]: {
        endpoint: process.env.COURT_LISTENER_API_URL,
        format: 'court_listener'
      },
      [this.sources.JUSTIA]: {
        endpoint: process.env.JUSTIA_API_URL,
        format: 'justia'
      }
    };

    return configs[source];
  }

  async processTestimonyData(testimonyData) {
    const processedTestimony = {
      caseId: testimonyData.caseId,
      date: testimonyData.date,
      location: testimonyData.location,
      participants: testimonyData.participants,
      segments: [],
      metadata: {
        processedAt: new Date().toISOString(),
        version: '1.0'
      }
    };

    for (const segment of testimonyData.segments) {
      const processedSegment = {
        speaker: segment.speaker,
        text: segment.text,
        timestamp: segment.timestamp,
        context: await contextService.enrichQuoteContext(
          { quote_text: segment.text },
          JSON.stringify(segment)
        ),
        factCheck: await factCheckService.verifyClaim({
          quote_text: segment.text,
          id: `${testimonyData.caseId}_${segment.timestamp}`
        }),
        legalContext: this.extractLegalContext(segment),
        metadata: {
          confidence: segment.confidence,
          transcriptionMethod: segment.transcriptionMethod
        }
      };

      processedTestimony.segments.push(processedSegment);
    }

    return processedTestimony;
  }

  extractLegalContext(segment) {
    return {
      caseContext: segment.caseContext,
      legalReferences: segment.legalReferences,
      objections: segment.objections,
      rulings: segment.rulings
    };
  }

  async archiveTestimony(testimony) {
    const archiveData = {
      testimony,
      metadata: {
        archivedAt: new Date().toISOString(),
        archiveVersion: '1.0'
      }
    };

    await archiveService.archiveSource(
      `testimony_${testimony.caseId}_${Date.now()}`,
      JSON.stringify(archiveData)
    );
  }

  async searchTestimonies(query, dateRange) {
    const results = [];
    
    for (const source of Object.values(this.sources)) {
      try {
        const sourceResults = await this.searchSource(source, query, dateRange);
        results.push(...sourceResults);
      } catch (error) {
        logger.error(`Error searching ${source} testimonies:`, error);
      }
    }

    return results;
  }

  async searchSource(source, query, dateRange) {
    const sourceConfig = this.getSourceConfig(source);
    const response = await axios.get(sourceConfig.endpoint, {
      params: {
        query,
        start_date: dateRange.start,
        end_date: dateRange.end
      },
      headers: {
        Authorization: `Bearer ${process.env[`${source.toUpperCase()}_API_TOKEN`]}`
      }
    });

    return response.data.results;
  }

  async monitorNewTestimonies(caseId, interval = 86400000) {
    // Monitor for new testimonies every 24 hours by default
    setInterval(async () => {
      try {
        for (const source of Object.values(this.sources)) {
          await this.processTestimony(source, caseId);
        }
      } catch (error) {
        logger.error(`Error monitoring testimonies for case ${caseId}:`, error);
      }
    }, interval);
  }

  async analyzeTestimonyConsistency(testimony) {
    const analysis = {
      caseId: testimony.caseId,
      segments: [],
      consistencyScore: 0,
      contradictions: [],
      metadata: {
        analyzedAt: new Date().toISOString(),
        analysisVersion: '1.0'
      }
    };

    // Implement consistency analysis logic
    // This could involve:
    // 1. Comparing statements across different testimonies
    // 2. Checking for contradictions
    // 3. Analyzing statement evolution
    // 4. Cross-referencing with other sources

    return analysis;
  }
}

module.exports = new CourtTestimonyService(); 