const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const Holiday = sequelize.define('holiday', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    holiday_start_date: {
        type: DataTypes.DATE
    },
    holiday_end_date: {
        type: DataTypes.DATE
    }
}, {
    tableName: 'holiday',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = Holiday;