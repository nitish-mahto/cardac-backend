const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const { User } = require('./user.model');

const FeedbackSummary = sequelize.define('feedback_summary', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    caregiver_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        allowNull: true,
    },
    total_feedback: {
        type: DataTypes.INTEGER,
        defaultValue: 0
    },
    total_rates: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
    average_rates: {
        type: DataTypes.FLOAT,
        defaultValue: 0
    },
}, {
    tableName: 'feedback_summary',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = FeedbackSummary;



