/* jshint indent: 2 */

module.exports = function(sequelize, DataTypes) {
  return sequelize.define('users_extension', {
    id: {
      autoIncrement: true,
      type: DataTypes.INTEGER(11),
      allowNull: false,
      primaryKey: true
    },
    usersid: {
      type: DataTypes.BIGINT,
      allowNull: false
    },
    total_amount: {
      type: DataTypes.DECIMAL,
      allowNull: true,
      defaultValue: 0.0000
    }
  }, {
    sequelize,
    tableName: 'users_extension'
  });
};
