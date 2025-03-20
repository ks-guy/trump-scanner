const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// Source Category Model
const SourceCategory = sequelize.define('SourceCategory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(50),
        allowNull: false,
        unique: true
    },
    description: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    verification_level: {
        type: DataTypes.ENUM('primary', 'secondary', 'tertiary'),
        allowNull: false,
        defaultValue: 'secondary'
    }
}, {
    tableName: 'source_categories',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Source Model
const Source = sequelize.define('Source', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    name: {
        type: DataTypes.STRING(255),
        allowNull: false
    },
    url: {
        type: DataTypes.STRING(2048),
        allowNull: false,
        unique: true
    },
    category_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'source_categories',
            key: 'id'
        }
    },
    verification_level: {
        type: DataTypes.ENUM('primary', 'secondary', 'tertiary'),
        allowNull: false,
        defaultValue: 'secondary'
    },
    region: {
        type: DataTypes.STRING(50),
        allowNull: true
    },
    is_official_source: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
    },
    requires_verification: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    is_active: {
        type: DataTypes.BOOLEAN,
        defaultValue: true
    },
    rate_limit_per_hour: {
        type: DataTypes.INTEGER,
        defaultValue: 100
    },
    last_scraped: {
        type: DataTypes.DATE,
        allowNull: true
    }
}, {
    tableName: 'sources',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Source Verification Rule Model
const SourceVerificationRule = sequelize.define('SourceVerificationRule', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    source_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'sources',
            key: 'id'
        }
    },
    verification_type: {
        type: DataTypes.ENUM('manual', 'automated', 'hybrid'),
        allowNull: false,
        defaultValue: 'hybrid'
    },
    verification_frequency: {
        type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'on_update'),
        allowNull: false,
        defaultValue: 'weekly'
    },
    required_checks: {
        type: DataTypes.JSON,
        allowNull: true
    }
}, {
    tableName: 'source_verification_rules',
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at'
});

// Source Verification History Model
const SourceVerificationHistory = sequelize.define('SourceVerificationHistory', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    source_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
            model: 'sources',
            key: 'id'
        }
    },
    verification_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW
    },
    verification_status: {
        type: DataTypes.ENUM('passed', 'failed', 'pending'),
        allowNull: false
    },
    verification_notes: {
        type: DataTypes.TEXT,
        allowNull: true
    },
    verified_by: {
        type: DataTypes.STRING(255),
        allowNull: false
    }
}, {
    tableName: 'source_verification_history',
    timestamps: true,
    createdAt: 'created_at'
});

// Define relationships
Source.belongsTo(SourceCategory, { foreignKey: 'category_id' });
SourceCategory.hasMany(Source, { foreignKey: 'category_id' });

Source.hasOne(SourceVerificationRule, { foreignKey: 'source_id' });
SourceVerificationRule.belongsTo(Source, { foreignKey: 'source_id' });

Source.hasMany(SourceVerificationHistory, { foreignKey: 'source_id' });
SourceVerificationHistory.belongsTo(Source, { foreignKey: 'source_id' });

module.exports = {
    Source,
    SourceCategory,
    SourceVerificationRule,
    SourceVerificationHistory
}; 