const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const { User } = require('./user.model');

const SpecialNeeds = sequelize.define('SpecialNeeds', {
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
        allowNull: true,
    },
    needs: {
        type: DataTypes.STRING,
        allowNull: false
    },
}, {
    tableName: 'specialNeeds',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = SpecialNeeds;



