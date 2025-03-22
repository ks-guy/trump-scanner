import { PrismaClient } from '@prisma/client';
import { logger } from '../utils/logger.js';

const prisma = new PrismaClient();

class Quote {
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
            const result = await prisma.post.create({
                data: {
                    content: quote.quote_text,
                    likes: 0,
                    reposts: 0,
                    replies: 0,
                    isReply: false,
                    metadata: {
                        source_url: quote.source_url,
                        context: quote.context,
                        pdf_path: quote.pdf_path
                    }
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
                quotes.map(q => prisma.post.create({
                    data: {
                        content: q.quote_text,
                        likes: 0,
                        reposts: 0,
                        replies: 0,
                        isReply: false,
                        metadata: {
                            source_url: q.source_url,
                            context: q.context,
                            pdf_path: q.pdf_path
                        }
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
            return await prisma.post.findMany({
                where: {
                    metadata: {
                        path: ['source_url'],
                        equals: url
                    }
                }
            });
        } catch (error) {
            logger.error('Failed to find quotes by source URL:', error);
            throw error;
        }
    }

    static async search(query, options = {}) {
        try {
            const limit = options.limit || 10;
            const offset = options.offset || 0;
            
            return await prisma.post.findMany({
                where: {
                    content: {
                        contains: query
                    }
                },
                take: limit,
                skip: offset,
                orderBy: {
                    createdAt: 'desc'
                }
            });
        } catch (error) {
            logger.error('Failed to search quotes:', error);
            throw error;
        }
    }

    static async getStats() {
        try {
            const totalQuotes = await prisma.post.count();
            const latestQuote = await prisma.post.findFirst({
                orderBy: { createdAt: 'desc' }
            });
            const oldestQuote = await prisma.post.findFirst({
                orderBy: { createdAt: 'asc' }
            });

            return {
                totalQuotes,
                latestQuote,
                oldestQuote
            };
        } catch (error) {
            logger.error('Failed to get quote statistics:', error);
            throw error;
        }
    }

    static async getPDFPath(quoteId) {
        try {
            const post = await prisma.post.findUnique({
                where: { id: quoteId }
            });
            return post?.metadata?.pdf_path;
        } catch (error) {
            logger.error('Failed to get PDF path:', error);
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

export { Quote }; 