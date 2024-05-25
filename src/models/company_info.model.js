const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const CompanyInfo = sequelize.define('company_info', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    guidelines: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    policies: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    terms: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
    trust_safety: {
        type: DataTypes.TEXT,
        allowNull: true,
    },
}, {
    tableName: 'company_info',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = CompanyInfo;



