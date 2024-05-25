const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');


const MobileApplication = sequelize.define('MobileApplication', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    deviceType: {
        type: DataTypes.ENUM('android', 'ios'),
    },
    link: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    file: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    title: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    notes: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'mobile_application',
    timestamps: true,
    underscored: false,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = MobileApplication;
