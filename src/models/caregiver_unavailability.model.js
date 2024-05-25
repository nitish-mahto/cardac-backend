const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const CaregiverUnavailability = sequelize.define('caregiverUnavailability', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    caregiver_id: {
        type: DataTypes.INTEGER(10),
        allowNull: false,
        references: {
            model: 'users',
            key: 'id',
        },
    },
    start_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
    end_date: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.literal('CURRENT_TIMESTAMP'),
    },
}, {
    tableName: 'caregiverUnavailability',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = CaregiverUnavailability;
