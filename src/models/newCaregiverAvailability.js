// Define the CaregiverAvailability model
const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const newCaregiverAvailability = sequelize.define('newCaregiverAvailability', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    caregiver_id: {
        type: DataTypes.INTEGER(10),
        allowNull: false,
        references: {
            model: 'users',// Assuming there is a users table containing caregiver information
            key: 'id',
        },
    },
    week_day: {
        type: DataTypes.ENUM('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'),
        allowNull: false,
    },
    morning_start_time: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    morning_end_time: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    evening_start_time: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    evening_end_time: {
        type: DataTypes.TIME,
        allowNull: false,
    },
    availability_slots: {
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [], // Initialize as empty array
    },
    unavailable_slots:{
        type: DataTypes.ARRAY(DataTypes.STRING),
        defaultValue: [], // Initialize as empty array
    }
}, {
    tableName: 'newCaregiverAvailability',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = newCaregiverAvailability;
