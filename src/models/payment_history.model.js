const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const PaymentHistory = sequelize.define(
    'payment_history',
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        user_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        appointment_id: {
            type: DataTypes.INTEGER,
            allowNull: false,
        },
        payment_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        transcation_id: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        amount: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: true
        },
        card_type: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        currency: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        payment_response: {
            type: DataTypes.TEXT,
            allowNull: false,
        },
        payment_status: {
            type: DataTypes.STRING,
            defaultValue: 'pending'
        }
    },
    {
        tableName: 'payment_history',
        timestamps: true,
        underscored: true,
        createdAt: 'created_at',
        updatedAt: 'updated_at'
    }
);

module.exports = PaymentHistory;
