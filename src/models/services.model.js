const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const Services = sequelize.define('services', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    services: {
        type: DataTypes.TEXT,
        defaultValue: ""
    }
}, {
    tableName: 'services',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = Services;

