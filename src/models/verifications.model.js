const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const { User } = require('./user.model');

const Verifications = sequelize.define('verifications', {
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
    otp: {
        type: DataTypes.CHAR(6),
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
        allowNull: false,
    },
    expired_at: {
        type: DataTypes.DATE, // Changed to DATE type
        defaultValue: () => {
            const tenMinutesInMilliseconds = 10 * 60 * 1000; // 10 minutes in milliseconds
            const createdTimestamp = new Date();
            return new Date(createdTimestamp.getTime() + tenMinutesInMilliseconds);
        },
    },
    created_at: {
        type: DataTypes.DATE, // Changed to DATE type
        allowNull: false,
        defaultValue: () => new Date(),
    },
}, {
    tableName: 'verifications',
    engine: 'InnoDB',
    indexes: [
        {
            name: 'verifications_user_id_foreign',
            fields: ['user_id'],
            using: 'BTREE',
        }
    ],
    timestamps: false, // If you want timestamps (createdAt, updatedAt), set this to true
});

// Define any associations, hooks, or other model methods here
module.exports = Verifications;
