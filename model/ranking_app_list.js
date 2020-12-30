const {Sequelize, sequelize} = require("./init");
const Model = Sequelize.Model;
class RankingAppList extends Model {
}

RankingAppList.init({
    id: {
      autoIncrement: true,
      type: Sequelize.INTEGER(11),
      allowNull: false,
      primaryKey: true
    },
    package_name: {
      type: Sequelize.STRING(256),
      allowNull: true
    },
    title: {
      type: Sequelize.STRING(256),
      allowNull: true
    },
    icon: {
      type: Sequelize.STRING(400),
      allowNull: true
    },
    seq: {
        type: Sequelize.INTEGER(3),
        allowNull: true
    },
    utime: {
      type: Sequelize.DATE,
      allowNull: true,
      defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
    }
}, {
  sequelize: sequelize,
  modelName: 'ranking_app_list',
  freezeTableName: true,
  timestamps: false
});


module.exports = {RankingAppList};