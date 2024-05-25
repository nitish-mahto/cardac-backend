const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const ServicesCost = sequelize.define('services_cost', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        enum: ["weekday", "saturday", "sunday", "holiday"]
    },
    sub_type: {
        type: DataTypes.STRING(50),
        allowNull: false,
        enum: ["standard", "nonstandard"]
    },
    price_perhour: {
        type: DataTypes.DECIMAL(10, 2), // Decimal type with precision 10 and scale 2
        allowNull: false,
    },
    start_time: {
        type: DataTypes.STRING(50),
        allowNull: true,
    },
    end_time: {
        type: DataTypes.STRING(50),
        allowNull: true,
    }
}, {
    tableName: 'services_cost',
    timestamps: true, // Enable automatic timestamp management
    underscored: true,
    createdAt: 'created_at', // Customize the names of the timestamp fields
    updatedAt: 'updated_at',
});

module.exports = ServicesCost;



