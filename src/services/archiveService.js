import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createLogger } from '../utils/logger.js';
import { verificationSystem } from '../utils/verification.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logger = createLogger('ArchiveService');

class ArchiveService {
  constructor() {
    this.archiveDir = path.join(__dirname, '../../data/archive');
    this.sourceDir = path.join(this.archiveDir, 'sources');
    this.quoteDir = path.join(this.archiveDir, 'quotes');
    this.ensureArchiveDirectory();
  }

  ensureArchiveDirectory() {
    if (!fs.existsSync(this.archiveDir)) {
      fs.mkdirSync(this.archiveDir, { recursive: true });
    }
  }

  async initialize() {
    try {
      await fs.promises.mkdir(this.archiveDir, { recursive: true });
      await fs.promises.mkdir(this.sourceDir, { recursive: true });
      await fs.promises.mkdir(this.quoteDir, { recursive: true });
      logger.info('Archive directories initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize archive directories:', error);
      throw error;
    }
  }

  async archiveQuote(quote, sourceContent) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const urlSafe = this.sanitizeFilename(quote.source_url);
      const filename = `${urlSafe}_${timestamp}.json`;
      const filepath = path.join(this.quoteDir, filename);

      const archiveData = {
        quote_text: quote.quote_text,
        source_url: quote.source_url,
        context: quote.context,
        metadata: {
          archived_at: new Date().toISOString(),
          source_content_hash: this.hashContent(sourceContent),
          verification: quote.verification,
          fact_check: quote.fact_check
        }
      };

      await fs.promises.writeFile(filepath, JSON.stringify(archiveData, null, 2));
      logger.info('Quote archived successfully', { 
        source: quote.source_url,
        filepath 
      });
    } catch (error) {
      logger.error('Failed to archive quote:', error);
      throw error;
    }
  }

  async archiveSource(url, content) {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const urlSafe = this.sanitizeFilename(url);
      const filename = `${urlSafe}_${timestamp}.html`;
      const filepath = path.join(this.sourceDir, filename);

      await fs.promises.writeFile(filepath, content);
      logger.info('Source archived successfully', { url, filepath });
    } catch (error) {
      logger.error('Failed to archive source:', error);
      throw error;
    }
  }

  async archiveHistoricalData(quote, historicalData) {
    const date = new Date().toISOString().split('T')[0];
    const archiveDir = path.join(this.archiveDir, date);
    
    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    const quoteId = quote.id || Date.now();
    const historicalFile = path.join(archiveDir, `historical_${quoteId}.json`);
    
    const archiveData = {
      quote,
      historicalReferences: historicalData,
      metadata: {
        archivedAt: new Date().toISOString(),
        archiveVersion: '1.0',
        verificationStatus: 'pending'
      }
    };

    fs.writeFileSync(historicalFile, JSON.stringify(archiveData, null, 2));

    await verificationSystem.verifyHistoricalAccuracy(quote, historicalData);

    logger.info(`Historical data for quote ${quoteId} archived successfully`);
    return {
      historicalFile,
      quoteId
    };
  }

  async retrieveQuote(quoteId, date) {
    const archiveDir = path.join(this.archiveDir, date);
    const quoteFile = path.join(archiveDir, `quote_${quoteId}.json`);
    
    if (fs.existsSync(quoteFile)) {
      return JSON.parse(fs.readFileSync(quoteFile, 'utf8'));
    }
    
    throw new Error(`Quote ${quoteId} not found in archive for date ${date}`);
  }

  async retrieveSource(sourceId, date) {
    const archiveDir = path.join(this.archiveDir, date);
    const sourceFile = path.join(archiveDir, `source_${sourceId}.json`);
    
    if (fs.existsSync(sourceFile)) {
      return JSON.parse(fs.readFileSync(sourceFile, 'utf8'));
    }
    
    throw new Error(`Source ${sourceId} not found in archive for date ${date}`);
  }

  hashContent(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return hash.toString(16);
  }

  sanitizeFilename(filename) {
    return filename
      .replace(/^(https?:\/\/)?(www\.)?/, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 100);
  }
}

export const archiveService = new ArchiveService(); 