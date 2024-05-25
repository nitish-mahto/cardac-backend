const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const { User } = require('./user.model');

const Feedback = sequelize.define('feedback', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        allowNull: true, // Set to false if it should not be nullable
    },
    caregiver_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
        allowNull: true, // Set to false if it should not be nullable
    },
    appointment_id: {
        type: DataTypes.INTEGER,
    },
    rate: {
        type: DataTypes.FLOAT,
        allowNull: false
    },
    comments: {
        type: DataTypes.TEXT,
        allowNull: false
    },
}, {
    tableName: 'feedback',
    timestamps: true, // Enable automatic timestamp management
    underscored: true,
    createdAt: 'created_at', // Customize the names of the timestamp fields
    updatedAt: 'updated_at',
});

module.exports = Feedback;



