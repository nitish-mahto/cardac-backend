const Sequelize = require('sequelize');
const config = require('../config/config');

const sequelize = new Sequelize(config.database, config.username, config.password, {
    host: config.host,
    dialect: 'mysql',
    pool: { max: 5, min: 0, idle: 1000 }
});

const connection = async () => {
    try {
        // Authenticate to the default database (e.g., 'mysql')
        await sequelize.authenticate();
        // Create the 'care_dac' database if it does not exist
        await sequelize.query('CREATE DATABASE IF NOT EXISTS care_dac');

        console.log('Database "care_dac" created or already exists.');

        // Switch to the 'care_dac' database
        sequelize.options.database = 'care_dac';

        // Re-authenticate with the 'care_dac' database
        await sequelize.authenticate();

        console.log('====================================================================================');
        console.log('|===============>Connection established to the "care_dac" database.<===============|');
        console.log('====================================================================================');
    } catch (err) {
        console.error(`Error in connection: ${err.message}`);
    }
};

module.exports = { connection, sequelize };
