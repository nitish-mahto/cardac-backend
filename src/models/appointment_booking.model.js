const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const { User } = require('./user.model');

const AppointmentBooking = sequelize.define(
    'appointmentBooking',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER(5),
            allowNull: false,
        },
        caregiver_id: {
            type: DataTypes.INTEGER(5),
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        booked_by: {
            type: DataTypes.INTEGER(5),
            allowNull: false,
            references: {
                model: 'users',
                key: 'id'
            }
        },
        start_appointment: {
            type: DataTypes.DATE,
            allowNull: false
        },
        end_appointment: {
            type: DataTypes.DATE,
            allowNull: false
        },
        total_hours: {
            type: DataTypes.STRING,
            allowNull: true
        },
        standard_cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        nonstandard_cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        total_cost: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        booking_status: {
            type: DataTypes.ENUM('approved', 'rejected', 'pending', 'started', 'finished'),
            defaultValue: 'pending'
        },
        booking_for: {
            type: DataTypes.ENUM('self', 'member'),
            defaultValue: 'self'
        },
        payment_status: {
            type: DataTypes.ENUM('pending', 'succeeded', 'failed'),
            defaultValue: 'pending'
        },
        created_at: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: () => new Date(),
        },
    },
    {
        tableName: 'appointmentBooking',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

module.exports = AppointmentBooking;
