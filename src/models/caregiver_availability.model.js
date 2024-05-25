const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const CaregiverAvailability = sequelize.define('caregiverAvailability', {
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
    availability_date: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    slot: {
        type: DataTypes.TEXT,
        defaultValue: ""
    },
}, {
    tableName: 'caregiverAvailability',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = CaregiverAvailability;
