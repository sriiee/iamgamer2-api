/* jshint indent: 1 */
const {Sequelize, sequelize} = require("./init");
const Model = Sequelize.Model;

class PlayTime extends Model {
}
PlayTime.init({
	id: {
		autoIncrement: true,
		type: Sequelize.BIGINT,
		allowNull: false,
		primaryKey: true
	},
	usersid: {
		type: Sequelize.BIGINT,
		allowNull: false
	},
	package_name: {
		type: Sequelize.STRING(256),
		allowNull: false
	},
	request_id: {
		type: Sequelize.STRING(40),
		allowNull: false
	},
	play_time: {
		type: Sequelize.BIGINT,
		allowNull: false
	},
	report_date: {
		type: Sequelize.INTEGER(11),
		allowNull: false
	},
	start_datetime: {
		type: Sequelize.DATE,
		allowNull: true
	},
	end_datetime: {
		type: Sequelize.DATE,
		allowNull: true
	},
	status: {
		type: Sequelize.INTEGER(6),
		allowNull: false,
		defaultValue: 1
	},
	regist_datetime: {
		type: Sequelize.DATE,
		allowNull: true
	},
	update_datetime: {
		type: Sequelize.DATE,
		allowNull: true
	}
}, {
	sequelize: sequelize,
	modelName: 'playtime',
	freezeTableName: true,
	timestamps: false
})

module.exports = {PlayTime};
