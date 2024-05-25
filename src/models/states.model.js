const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');
const Country = require('./countries.model');

const State = sequelize.define('State', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: DataTypes.STRING(30),
        allowNull: false,
    },
    country_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        references: {
            model: Country,
            key: 'id',
        },
    },
}, {
    tableName: 'states',
    engine: 'InnoDB',
    charset: 'latin1',
    collate: 'latin1_general_ci',
    timestamps: false,
});

module.exports = State;
