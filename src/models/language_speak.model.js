const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const languageSpeak = sequelize.define('language_speak', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    language: {
        type: DataTypes.STRING(20),
        allowNull: false,
    }
}, {
    tableName: 'language_speak',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = languageSpeak;

