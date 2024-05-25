const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const { User } = require('./user.model');

const Payment = sequelize.define('payment', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER,
        references: {
            model: User,
            key: 'id',
        },
    },
    customer_id: {
        type: DataTypes.STRING(50),
        allowNull: true,
    }
}, {
    tableName: 'payment',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = Payment;

