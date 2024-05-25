const { DataTypes } = require('sequelize');
const { sequelize } = require('../connection/connection');

const Country = sequelize.define('Country', {
    id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    shortname: {
        type: DataTypes.STRING(3),
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING(150),
        allowNull: false,
    },
    phonecode: {
        type: DataTypes.INTEGER,
        allowNull: false,
    },
}, {
    tableName: 'countries',
    engine: 'InnoDB',
    charset: 'latin1',
    collate: 'latin1_general_ci',
    timestamps: false,
});

module.exports = Country;

