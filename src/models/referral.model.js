const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const { User } = require('./user.model');

const Referral = sequelize.define('referral', {
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
        allowNull: true, // Set to false if it should not be nullable
    },
    full_name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    email: {
        type: DataTypes.STRING(100),
        allowNull: true,
        set(value) {
            this.setDataValue('email', value.toLowerCase());
        },
    },
    mobile_number: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    address1: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    address2: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    state: {
        type: DataTypes.STRING(100),
        allowNull: true,
    },
    country: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    pin_code: {
        type: DataTypes.STRING,
        allowNull: true,
    },
}, {
    tableName: 'referral',
    timestamps: true, // Enable automatic timestamp management
    underscored: true,
    createdAt: 'created_at', // Customize the names of the timestamp fields
    updatedAt: 'updated_at',
});

module.exports = Referral;

