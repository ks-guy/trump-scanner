import { Client } from '@elastic/elasticsearch';
import { logger } from '../utils/logger.js';

const client = new Client({
  node: process.env.ELASTICSEARCH_NODE || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USERNAME,
    password: process.env.ELASTICSEARCH_PASSWORD
  }
});

export async function connectElasticsearch() {
  try {
    const info = await client.info();
    logger.info('Successfully connected to Elasticsearch:', info);
    return client;
  } catch (error) {
    logger.error('Error connecting to Elasticsearch:', error);
    throw error;
  }
}

export async function createIndex(index, settings = {}) {
  try {
    const exists = await client.indices.exists({ index });
    if (!exists) {
      await client.indices.create({
        index,
        body: settings
      });
      logger.info(`Created index: ${index}`);
    }
  } catch (error) {
    logger.error(`Error creating index ${index}:`, error);
    throw error;
  }
}

export async function indexDocument(index, document) {
  try {
    const result = await client.index({
      index,
      body: document
    });
    return result;
  } catch (error) {
    logger.error('Error indexing document:', error);
    throw error;
  }
}

export async function search(index, query) {
  try {
    const result = await client.search({
      index,
      body: query
    });
    return result;
  } catch (error) {
    logger.error('Error searching documents:', error);
    throw error;
  }
}

export default {
  connectElasticsearch,
  createIndex,
  indexDocument,
  search,
  client
}; 