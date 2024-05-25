const { DataTypes, literal } = require('sequelize');
const { sequelize } = require('../connection/connection');
const { User } = require('./user.model');

const ChatUser = sequelize.define('chatUser', {
    id: {
        type: DataTypes.INTEGER.UNSIGNED,
        primaryKey: true,
        autoIncrement: true,
    },
    users_id: {
        type: DataTypes.TEXT,
    },
    last_msg: {
        type: DataTypes.TEXT,
        allowNull: false,
    },
    channel: {
        type: DataTypes.STRING(100),
        allowNull: false,
    },
}, {
    tableName: 'chatUsers',
    timestamps: true,
    underscored: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
});

module.exports = ChatUser;

