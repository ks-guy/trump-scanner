import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

const redisClient = createClient({
  url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
  password: process.env.REDIS_PASSWORD,
  database: parseInt(process.env.REDIS_DB || '0')
});

redisClient.on('error', (error) => {
  logger.error('Redis Client Error:', error);
});

export async function connectRedis() {
  try {
    await redisClient.connect();
    logger.info('Successfully connected to Redis');
    return redisClient;
  } catch (error) {
    logger.error('Error connecting to Redis:', error);
    throw error;
  }
}

export async function get(key) {
  try {
    return await redisClient.get(key);
  } catch (error) {
    logger.error('Error getting value from Redis:', error);
    throw error;
  }
}

export async function set(key, value, options = {}) {
  try {
    await redisClient.set(key, value, options);
  } catch (error) {
    logger.error('Error setting value in Redis:', error);
    throw error;
  }
}

export default {
  connectRedis,
  get,
  set,
  client: redisClient
}; 