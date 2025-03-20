const { v4: uuidv4 } = require('uuid');
const { logger } = require('../utils/logger');

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

module.exports = {
    validateMediaId,
    validateMediaQuery,
    validateSearchQuery
}; 