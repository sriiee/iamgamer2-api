const {Sequelize, sequelize} = require("./init");
const Model = Sequelize.Model;

class GamesDetail extends Model {
}

GamesDetail.init({
    // attributes
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    package_name: {
        type: Sequelize.STRING(256),
        allowNull: false
    },
    total_user: {
        type: Sequelize.INTEGER,
        allowNull: true
    },
    ranking: {
        type: Sequelize.TEXT,
        allowNull: true
    },
    report: {
        type: Sequelize.TEXT,
        allowNull: true
    },
    utime: {
        type: Sequelize.DATE,
        allowNull: true
    }
}, {
    sequelize: sequelize,
    modelName: 'games_detail',
    freezeTableName: true,
    timestamps: false
});

module.exports = {GamesDetail, Sequelize};
