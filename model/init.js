const Sequelize = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize('gamer2', process.env.MYSQL_USER? "wzd": "wzd", process.env.MYSQL_PASSWORD, {
    host: process.env.MYSQL_PRODUCTION_DB_PATH ? "themekeyboard-dev-20200922.cjawa1corcrr.ap-northeast-2.rds.amazonaws.com": "themekeyboard-dev-20200922.cjawa1corcrr.ap-northeast-2.rds.amazonaws.com",
    dialect: 'mysql',
    timezone: '+09:00',
    logging: false
});

sequelize
    .authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

module.exports = {Sequelize, sequelize};
