import { PrismaClient } from '@prisma/client';
import { createLogger } from '../utils/logger.js';

const prisma = new PrismaClient();
const logger = createLogger('Quote');

export class Quote {
    static async initialize() {
        try {
            // Test the connection
            await prisma.$connect();
            logger.info('Database connection initialized successfully');
        } catch (error) {
            logger.error('Failed to initialize Quote model:', error);
            throw error;
        }
    }

    static async insert(quote) {
        try {
            const result = await prisma.quote.create({
                data: {
                    text: quote.quote_text,
                    speaker: 'Donald Trump',
                    source: quote.source_url,
                    date: new Date(),
                    context: JSON.stringify(quote.context),
                    metadata: JSON.stringify({
                        fact_check: quote.fact_check,
                        verification: quote.verification
                    })
                }
            });

            return result.id;
        } catch (error) {
            logger.error('Failed to insert quote:', error);
            throw error;
        }
    }

    static async bulkInsert(quotes) {
        if (!quotes.length) return [];

        try {
            const result = await prisma.$transaction(
                quotes.map(q => prisma.quote.create({
                    data: {
                        text: q.quote_text,
                        speaker: 'Donald Trump',
                        source: q.source_url,
                        date: new Date(),
                        context: JSON.stringify(q.context),
                        metadata: JSON.stringify({
                            fact_check: q.fact_check,
                            verification: q.verification
                        })
                    }
                }))
            );

            return result.map(r => r.id);
        } catch (error) {
            logger.error('Failed to bulk insert quotes:', error);
            throw error;
        }
    }

    static async findBySourceUrl(url) {
        try {
            const quotes = await prisma.quote.findMany({
                where: {
                    source: url
                }
            });
            
            return quotes.map(quote => ({
                ...quote,
                context: JSON.parse(quote.context || '{}'),
                metadata: JSON.parse(quote.metadata || '{}')
            }));
        } catch (error) {
            logger.error('Failed to find quotes by source URL:', error);
            throw error;
        }
    }

    static async search(query, options = {}) {
        try {
            const limit = options.limit || 10;
            const offset = options.offset || 0;
            
            const quotes = await prisma.quote.findMany({
                where: {
                    text: {
                        contains: query
                    }
                },
                take: limit,
                skip: offset,
                orderBy: {
                    date: 'desc'
                }
            });

            return quotes.map(quote => ({
                ...quote,
                context: JSON.parse(quote.context || '{}'),
                metadata: JSON.parse(quote.metadata || '{}')
            }));
        } catch (error) {
            logger.error('Failed to search quotes:', error);
            throw error;
        }
    }

    static async getStats() {
        try {
            const totalQuotes = await prisma.quote.count();
            const latestQuote = await prisma.quote.findFirst({
                orderBy: { date: 'desc' }
            });
            const oldestQuote = await prisma.quote.findFirst({
                orderBy: { date: 'asc' }
            });

            return {
                totalQuotes,
                latestQuote: latestQuote ? {
                    ...latestQuote,
                    context: JSON.parse(latestQuote.context || '{}'),
                    metadata: JSON.parse(latestQuote.metadata || '{}')
                } : null,
                oldestQuote: oldestQuote ? {
                    ...oldestQuote,
                    context: JSON.parse(oldestQuote.context || '{}'),
                    metadata: JSON.parse(oldestQuote.metadata || '{}')
                } : null
            };
        } catch (error) {
            logger.error('Failed to get quote statistics:', error);
            throw error;
        }
    }

    static async cleanup() {
        try {
            await prisma.$disconnect();
            logger.info('Database connection closed successfully');
        } catch (error) {
            logger.error('Error closing database connection:', error);
            throw error;
        }
    }
} 