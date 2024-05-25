const bcrypt = require("bcryptjs");
const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const { User } = require('./user.model');

const Availability = sequelize.define('Availability', {
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
    availability_data: {
        type: DataTypes.TEXT,
        defaultValue: JSON.stringify({
            '00:00': true,
            '00:30': true,
            '01:00': true,
            '01:30': true,
            '02:00': true,
            '02:30': true,
            '03:00': true,
            '03:30': true,
            '04:00': true,
            '04:30': true,
            '05:00': true,
            '05:30': true,
            '06:00': true,
            '06:30': true,
            '07:00': true,
            '07:30': true,
            '08:00': true,
            '08:30': true,
            '09:00': true,
            '09:30': true,
            '10:00': true,
            '10:30': true,
            '11:00': true,
            '11:30': true,
            '12:00': true,
            '12:30': true,
            '13:00': true,
            '13:30': true,
            '14:00': true,
            '14:30': true,
            '15:00': true,
            '15:30': true,
            '16:00': true,
            '16:30': true,
            '17:00': true,
            '17:30': true,
            '18:00': true,
            '18:30': true,
            '19:00': true,
            '19:30': true,
            '20:00': true,
            '20:30': true,
            '21:00': true,
            '21:30': true,
            '22:00': true,
            '22:30': true,
            '23:00': true,
            '23:30': true,
        })
    },

}, {
    tableName: 'availability',
    timestamps: false,
    underscored: true,
});

module.exports = Availability;
