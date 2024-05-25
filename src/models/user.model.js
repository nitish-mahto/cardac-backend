const bcrypt = require("bcryptjs");
const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const saltRounds = 10;

const User = sequelize.define('User', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    full_name: {
        type: DataTypes.STRING,
        allowNull: true,
        defaultValue: ""
    },
    email: {
        type: DataTypes.STRING,
        allowNull: true,
        set(value) {
            this.setDataValue('email', value.toLowerCase());
        },
    },
    password: {
        type: DataTypes.STRING(100),
        allowNull: true,
        set(value) {
            const salt = bcrypt.genSaltSync(saltRounds);
            const hashedPassword = bcrypt.hashSync(value, salt);
            this.setDataValue('password', hashedPassword);
        },
    },
    dob: {
        type: DataTypes.DATE,
        allowNull: true,
    },
    age: {
        type: DataTypes.INTEGER,
        allowNull: true, // Set to false if it should not be nullable
    },
    mobile_number: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    emergency_mobile_number: {
        type: DataTypes.STRING(15),
        allowNull: true,
    },
    profile_image: {
        type: DataTypes.STRING,
        defaultValue: ""
        // defaultValue: '/profile/default_profile_image.jpg'
    },
    gender: {
        type: DataTypes.ENUM('male', 'female', 'other'),
        allowNull: false,
        defaultValue: 'male',
    },
    need_care: {
        type: DataTypes.ENUM('yes', 'no'),
        allowNull: false,
        defaultValue: 'no',
    },
    address1: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    address2: {
        type: DataTypes.STRING(255),
        allowNull: true,
    },
    city: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    state: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    country: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    pin_code: {
        type: DataTypes.STRING(10),
        allowNull: true,
    },
    language: {
        type: DataTypes.STRING,
        allowNull: true,
    },
    role: {
        type: DataTypes.ENUM('patient', 'caregiver'),
        defaultValue: 'patient',
        allowNull: false,
    },
    account_status: {
        type: DataTypes.ENUM('active', 'suspend', 'pending', 'deleted'),
        defaultValue: 'pending',
        allowNull: false,
    },
    account_status_notes: {
        type: DataTypes.TEXT,
        defaultValue: 'you have not verified your account',
    },
    is_verify: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    is_preferences_added: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
    },
    services: {
        type: DataTypes.TEXT,
        defaultValue: "",
        set(value) {
            this.setDataValue('services', value.toLowerCase());
        },
    },
    lat_long: {
        type: DataTypes.TEXT,
        defaultValue: ""
    },
}, {
    tableName: 'users',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = User;
