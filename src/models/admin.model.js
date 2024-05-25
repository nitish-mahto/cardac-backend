const bcrypt = require("bcryptjs");
const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const saltRounds = 10;

const Admin = sequelize.define('Admin', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: false,
    },
    email: {
        type: DataTypes.STRING(50),
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
}, {
    tableName: 'admin',
    timestamps: false,
    underscored: true,
});

module.exports = Admin;
