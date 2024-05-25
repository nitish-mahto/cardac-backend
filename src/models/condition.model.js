const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const { User } = require('./user.model');

const Conditions = sequelize.define('Conditions', {
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
    conditions: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    tableName: 'conditions',
    timestamps: true, // Enable automatic timestamp management
    underscored: true,
    createdAt: 'created_at', // Customize the names of the timestamp fields
    updatedAt: 'updated_at',
});

module.exports = Conditions;



