const { Op } = require('sequelize');
const { MediaContent, MediaProcessingLogs } = require('../../models/media');
const { logger } = require('../../utils/logger');

class MediaSearchService {
    constructor() {
        this.searchableFields = [
            'source_url',
            'format',
            'resolution',
            'media_type',
            'download_status'
        ];
    }

    async search(query) {
        try {
            const {
                searchTerm,
                filters = {},
                page = 1,
                limit = 10,
                sortBy = 'createdAt',
                sortOrder = 'DESC'
            } = query;

            // Build where clause
            const where = this.buildWhereClause(searchTerm, filters);

            // Build order clause
            const order = this.buildOrderClause(sortBy, sortOrder);

            // Execute search
            const results = await MediaContent.findAndCountAll({
                where,
                limit: parseInt(limit),
                offset: (page - 1) * limit,
                order,
                include: [{
                    model: MediaProcessingLogs,
                    as: 'processingLogs',
                    limit: 5
                }]
            });

            return {
                total: results.count,
                page: parseInt(page),
                totalPages: Math.ceil(results.count / limit),
                data: results.rows
            };
        } catch (error) {
            logger.error('Error performing media search:', error);
            throw error;
        }
    }

    buildWhereClause(searchTerm, filters) {
        const where = {};

        // Add search term conditions
        if (searchTerm) {
            where[Op.or] = this.searchableFields.map(field => ({
                [field]: {
                    [Op.like]: `%${searchTerm}%`
                }
            }));
        }

        // Add filters
        Object.entries(filters).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                switch (key) {
                    case 'media_type':
                        where.media_type = value;
                        break;
                    case 'status':
                        where.download_status = value;
                        break;
                    case 'date_range':
                        where.createdAt = {
                            [Op.between]: [new Date(value.start), new Date(value.end)]
                        };
                        break;
                    case 'min_duration':
                        where.duration = {
                            [Op.gte]: parseFloat(value)
                        };
                        break;
                    case 'max_duration':
                        where.duration = {
                            [Op.lte]: parseFloat(value)
                        };
                        break;
                    case 'min_size':
                        where.file_size = {
                            [Op.gte]: parseInt(value)
                        };
                        break;
                    case 'max_size':
                        where.file_size = {
                            [Op.lte]: parseInt(value)
                        };
                        break;
                    case 'format':
                        where.format = value;
                        break;
                    case 'resolution':
                        where.resolution = value;
                        break;
                    default:
                        logger.warn(`Unknown filter key: ${key}`);
                }
            }
        });

        return where;
    }

    buildOrderClause(sortBy, sortOrder) {
        const validSortFields = [
            'createdAt',
            'updatedAt',
            'file_size',
            'duration',
            'download_status'
        ];

        if (!validSortFields.includes(sortBy)) {
            sortBy = 'createdAt';
        }

        return [[sortBy, sortOrder.toUpperCase()]];
    }

    async getSearchSuggestions(partialTerm) {
        try {
            const suggestions = await MediaContent.findAll({
                where: {
                    [Op.or]: this.searchableFields.map(field => ({
                        [field]: {
                            [Op.like]: `%${partialTerm}%`
                        }
                    }))
                },
                attributes: this.searchableFields,
                limit: 10,
                distinct: true
            });

            return suggestions;
        } catch (error) {
            logger.error('Error getting search suggestions:', error);
            throw error;
        }
    }

    async getSearchStats() {
        try {
            const stats = await MediaContent.findAll({
                attributes: [
                    'media_type',
                    'format',
                    'download_status',
                    [sequelize.fn('COUNT', sequelize.col('id')), 'count']
                ],
                group: ['media_type', 'format', 'download_status']
            });

            return stats;
        } catch (error) {
            logger.error('Error getting search stats:', error);
            throw error;
        }
    }
}

module.exports = new MediaSearchService(); 