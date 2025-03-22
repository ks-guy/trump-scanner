const { DataTypes } = require('sequelize');
const { sequelize } = require('../database/connection');

const MetricsModel = sequelize.define('metrics', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        comment: 'Type of metric (system, application, database, etc.)'
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false,
        comment: 'Metric data in JSON format'
    },
    timestamp: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
        comment: 'When the metric was collected'
    }
}, {
    indexes: [
        {
            name: 'idx_metrics_type_timestamp',
            fields: ['type', 'timestamp']
        },
        {
            name: 'idx_metrics_timestamp',
            fields: ['timestamp']
        }
    ],
    comment: 'Stores system and application metrics'
});

// Create a function to clean up old metrics
const cleanupOldMetrics = async (days = 30) => {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    try {
        await MetricsModel.destroy({
            where: {
                timestamp: {
                    [Op.lt]: cutoffDate
                }
            }
        });
    } catch (error) {
        console.error('Error cleaning up old metrics:', error);
    }
};

module.exports = {
    MetricsModel,
    cleanupOldMetrics
}; 