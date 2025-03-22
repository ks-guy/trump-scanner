const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');
const Joi = require('joi');

// Validate UUID format
function isValidUUID(uuid) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// Validate media ID middleware
const validateMediaId = (req, res, next) => {
    const { id } = req.params;

    if (!isValidUUID(id)) {
        logger.warn(`Invalid media ID format: ${id}`);
        return res.status(400).json({ error: 'Invalid media ID format' });
    }

    next();
};

// Validate media query parameters
const validateMediaQuery = (req, res, next) => {
    const { page, limit, media_type, status, start_date, end_date } = req.query;

    // Validate page
    if (page && (isNaN(page) || page < 1)) {
        return res.status(400).json({ error: 'Invalid page number' });
    }

    // Validate limit
    if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
        return res.status(400).json({ error: 'Invalid limit value' });
    }

    // Validate media type
    if (media_type && !['video', 'image'].includes(media_type)) {
        return res.status(400).json({ error: 'Invalid media type' });
    }

    // Validate status
    if (status && !['pending', 'in_progress', 'completed', 'failed'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
    }

    // Validate date range
    if (start_date && end_date) {
        const start = new Date(start_date);
        const end = new Date(end_date);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
            return res.status(400).json({ error: 'Invalid date format' });
        }
        if (start > end) {
            return res.status(400).json({ error: 'Start date must be before end date' });
        }
    }

    next();
};

const validateSearchQuery = (req, res, next) => {
  const { page, limit, media_type, status, file_size, sort_by } = req.query;

  // Validate pagination
  if (page && (isNaN(page) || page < 1)) {
    return res.status(400).json({ error: 'Invalid page number' });
  }
  if (limit && (isNaN(limit) || limit < 1 || limit > 100)) {
    return res.status(400).json({ error: 'Invalid limit value' });
  }

  // Validate media type
  if (media_type) {
    const types = Array.isArray(media_type) ? media_type : [media_type];
    const validTypes = ['video', 'image'];
    if (!types.every(type => validTypes.includes(type))) {
      return res.status(400).json({ error: 'Invalid media type' });
    }
  }

  // Validate status
  if (status) {
    const statuses = Array.isArray(status) ? status : [status];
    const validStatuses = ['pending', 'in_progress', 'completed', 'failed'];
    if (!statuses.every(s => validStatuses.includes(s))) {
      return res.status(400).json({ error: 'Invalid status' });
    }
  }

  // Validate file size range
  if (file_size) {
    try {
      const [min, max] = file_size.split(',').map(Number);
      if (isNaN(min) || isNaN(max) || min < 0 || max < min || max > 1000) {
        return res.status(400).json({ error: 'Invalid file size range' });
      }
    } catch (error) {
      return res.status(400).json({ error: 'Invalid file size format' });
    }
  }

  // Validate sort option
  if (sort_by) {
    const validSortOptions = [
      'relevance',
      'date_newest',
      'date_oldest',
      'size_largest',
      'size_smallest',
    ];
    if (!validSortOptions.includes(sort_by)) {
      return res.status(400).json({ error: 'Invalid sort option' });
    }
  }

  next();
};

const validateBackupCreate = (req, res, next) => {
    const schema = Joi.object({
        note: Joi.string().max(1000).allow('', null)
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    next();
};

const validateBatchCreate = (req, res, next) => {
    const schema = Joi.object({
        options: Joi.object({
            processImmediately: Joi.boolean(),
            priority: Joi.number().min(1).max(10),
            notifyOnComplete: Joi.boolean(),
            compressionLevel: Joi.number().min(1).max(9),
            generateThumbnails: Joi.boolean(),
            thumbnailSize: Joi.object({
                width: Joi.number().min(50).max(800),
                height: Joi.number().min(50).max(800)
            }),
            outputFormat: Joi.string().valid('original', 'mp4', 'webm', 'jpg', 'png'),
            watermark: Joi.object({
                enabled: Joi.boolean(),
                text: Joi.string().max(100),
                position: Joi.string().valid('topLeft', 'topRight', 'bottomLeft', 'bottomRight', 'center')
            })
        }).default({})
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    // Validate files
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }

    if (req.files.length > 50) {
        return res.status(400).json({ error: 'Maximum 50 files allowed per batch' });
    }

    // Validate file types and sizes
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'video/mp4', 'video/webm', 'audio/mpeg', 'audio/wav'];
    const maxFileSize = 100 * 1024 * 1024; // 100MB

    for (const file of req.files) {
        if (!allowedTypes.includes(file.mimetype)) {
            return res.status(400).json({
                error: `Invalid file type: ${file.originalname}. Allowed types: ${allowedTypes.join(', ')}`
            });
        }

        if (file.size > maxFileSize) {
            return res.status(400).json({
                error: `File too large: ${file.originalname}. Maximum size: 100MB`
            });
        }
    }

    next();
};

const validateThumbnailOptions = (req, res, next) => {
    const schema = Joi.object({
        // Timestamp options
        count: Joi.number().min(1).max(10),
        interval: Joi.number().min(1),
        strategy: Joi.string().valid('uniform', 'weighted', 'dynamic'),
        customTimestamps: Joi.array().items(Joi.number().min(0)),

        // Processing options
        processing: Joi.object({
            resize: Joi.object({
                width: Joi.number().min(50).max(3840),
                height: Joi.number().min(50).max(2160),
                fit: Joi.string().valid('cover', 'contain', 'fill', 'inside', 'outside')
            }),
            quality: Joi.number().min(1).max(100),
            format: Joi.string().valid('jpeg', 'png', 'webp'),
            effects: Joi.array().items(
                Joi.object({
                    type: Joi.string().valid(
                        'blur',
                        'sharpen',
                        'brightness',
                        'contrast',
                        'grayscale',
                        'watermark'
                    ).required(),
                    // Effect-specific options
                    sigma: Joi.when('type', {
                        is: Joi.string().valid('blur', 'sharpen'),
                        then: Joi.number().min(0.3).max(1000)
                    }),
                    value: Joi.when('type', {
                        is: Joi.string().valid('brightness', 'contrast'),
                        then: Joi.number().min(0).max(2)
                    }),
                    options: Joi.when('type', {
                        is: 'watermark',
                        then: Joi.object({
                            text: Joi.string().required(),
                            font: Joi.string(),
                            fontSize: Joi.number().min(8).max(72),
                            color: Joi.string(),
                            opacity: Joi.number().min(0).max(1),
                            position: Joi.string().valid(
                                'topLeft',
                                'topRight',
                                'bottomLeft',
                                'bottomRight',
                                'center'
                            ),
                            padding: Joi.number().min(0).max(100)
                        })
                    })
                })
            )
        })
    });

    const { error } = schema.validate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details[0].message });
    }

    next();
};

module.exports = {
    validateMediaId,
    validateMediaQuery,
    validateSearchQuery,
    validateBackupCreate,
    validateBatchCreate,
    validateThumbnailOptions
}; 