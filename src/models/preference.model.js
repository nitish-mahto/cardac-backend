const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const { User } = require('./user.model');

const Preference = sequelize.define('preference', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    user_id: {
        type: DataTypes.INTEGER(5),
        references: {
            model: User,
            key: 'id',
        },
        allowNull: true,
    },
    who_need_care: {
        type: DataTypes.STRING(10),
        allowNull: false,
    },
    age: {
        type: DataTypes.INTEGER(3),
        allowNull: false,
    },
    post_code: {
        type: DataTypes.STRING(10),
        allowNull: false,
    },
    need_help: {
        type: DataTypes.STRING(50),
        allowNull: false,
    },
}, {
    tableName: 'preference',
    timestamps: true, // Enable automatic timestamp management
    underscored: true,
    createdAt: 'created_at', // Customize the names of the timestamp fields
    updatedAt: 'updated_at',
});


module.exports = Preference;
