const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

// Media Content Model
const MediaContent = sequelize.define('MediaContent', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    source_url: {
        type: DataTypes.STRING(2048),
        allowNull: false
    },
    media_type: {
        type: DataTypes.ENUM('video', 'image'),
        allowNull: false
    },
    file_size: {
        type: DataTypes.BIGINT,
        allowNull: true
    },
    format: {
        type: DataTypes.STRING(10),
        allowNull: true
    },
    resolution: {
        type: DataTypes.STRING(20),
        allowNull: true
    },
    bitrate: {
        type: DataTypes.INTEGER,
        allowNull: true
    },
    duration: {
        type: DataTypes.FLOAT,
        allowNull: true
    },
    is_downloaded: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    download_status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed'),
        defaultValue: 'pending'
    },
    storage_path: {
        type: DataTypes.STRING(2048),
        allowNull: true
    },
    thumbnail_path: {
        type: DataTypes.STRING(2048),
        allowNull: true
    },
    audio_path: {
        type: DataTypes.STRING(2048),
        allowNull: true
    },
    metadata: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'media_content',
    timestamps: true
});

// Media Download Queue Model
const MediaDownloadQueue = sequelize.define('MediaDownloadQueue', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    media_content_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: MediaContent,
            key: 'id'
        }
    },
    priority: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    status: {
        type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'failed'),
        defaultValue: 'pending'
    },
    retry_count: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    last_attempt: {
        type: DataTypes.DATE,
        allowNull: true
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    }
}, {
    tableName: 'media_download_queue',
    timestamps: true
});

// Media Processing Logs Model
const MediaProcessingLogs = sequelize.define('MediaProcessingLogs', {
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    media_content_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: MediaContent,
            key: 'id'
        }
    },
    process_type: {
        type: DataTypes.ENUM('download', 'processing', 'thumbnail', 'audio'),
        allowNull: false
    },
    status: {
        type: DataTypes.ENUM('success', 'error'),
        allowNull: false
    },
    error_message: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    processing_time: {
        type: DataTypes.INTEGER,
        allowNull: true
    }
}, {
    tableName: 'media_processing_logs',
    timestamps: true
});

// Define relationships
MediaContent.hasMany(MediaDownloadQueue, {
    foreignKey: 'media_content_id',
    as: 'downloadQueue'
});

MediaDownloadQueue.belongsTo(MediaContent, {
    foreignKey: 'media_content_id',
    as: 'mediaContent'
});

MediaContent.hasMany(MediaProcessingLogs, {
    foreignKey: 'media_content_id',
    as: 'processingLogs'
});

MediaProcessingLogs.belongsTo(MediaContent, {
    foreignKey: 'media_content_id',
    as: 'mediaContent'
});

module.exports = {
    MediaContent,
    MediaDownloadQueue,
    MediaProcessingLogs
}; 