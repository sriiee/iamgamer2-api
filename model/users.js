/* jshint indent: 1 */
const {Sequelize, sequelize} = require("./init");
const Model = Sequelize.Model;
class Users extends Model {
}
Users.init({
	id: {
		autoIncrement: true,
		type: Sequelize.BIGINT,
		allowNull: false,
		primaryKey: true
	},
	email: {
		type: Sequelize.STRING(256),
		allowNull: false
	},
	uid: {
		type: Sequelize.STRING(100),
		allowNull: false
	},
	auth_source: {
		type: Sequelize.STRING(20),
		allowNull: true
	},
	auth_info: {
		type: Sequelize.TEXT,
		allowNull: true
	},
	auth_token: {
		type: Sequelize.TEXT,
		allowNull: true
	},
	adid: {
		type: Sequelize.STRING(256),
		allowNull: true
	},
	nickname: {
		type: Sequelize.STRING(128),
		allowNull: true
	},
	profile_image_url: {
		type: Sequelize.STRING(1024),
		allowNull: true
	},
	profile_image_key: {
		type: Sequelize.STRING(1024),
		allowNull: true
	},
	profile_privacy_level: {
		type: Sequelize.INTEGER(11),
		allowNull: false,
		defaultValue: 0
	},
	phone_no: {
		type: Sequelize.STRING(16),
		allowNull: true
	},
	gender: {
		type: Sequelize.INTEGER(4),
		allowNull: true
	},
	birth_year: {
		type: Sequelize.INTEGER(11),
		allowNull: true
	},
	last_play_time: {
		type: Sequelize.DATE,
		allowNull: true
	},
	last_pay_time: {
		type: Sequelize.DATE,
		allowNull: true
	},
	status: {
		type: Sequelize.INTEGER(11),
		allowNull: false
	},
	regist_datetime: {
		type: Sequelize.DATE,
		allowNull: false
	},
	signup_datetime: {
		type: Sequelize.DATE,
		allowNull: true
	},
	update_datetime: {
		type: Sequelize.DATE,
		allowNull: true
	},
	deleted_datetime: {
		type: Sequelize.DATE,
		allowNull: true
	},
	push_token: {
		type: Sequelize.TEXT,
		allowNull: true
	},
	push_level: {
		type: Sequelize.INTEGER(10),
		allowNull: false,
		defaultValue: 0
	}
}, {
	sequelize: sequelize,
	modelName: 'users',
	freezeTableName: true,
	timestamps: false
})




class UsersExtension extends Model {
}
UsersExtension.init({
	id: {
		autoIncrement: true,
		type: Sequelize.INTEGER(11),
		allowNull: false,
		primaryKey: true
	},
	usersid: {
		type: Sequelize.BIGINT,
		allowNull: false
	},
	total_amount: {
		type: Sequelize.DECIMAL,
		allowNull: true,
		defaultValue: 0.0000
	}
}, {
	sequelize: sequelize,
	modelName: 'users_extension',
	freezeTableName: true,
	timestamps: false
})


class UsersRankingAppList extends Model {
}
UsersRankingAppList.init({
	id: {
		autoIncrement: true,
		type: Sequelize.INTEGER(11),
		allowNull: false,
		primaryKey: true
	},
	usersid: {
		type: Sequelize.BIGINT,
		allowNull: false
	},
	applist: {
		type: Sequelize.TEXT,
		allowNull: true,
	},
	status: {
		type: Sequelize.INTEGER(11),
		allowNull: true,
	},
	utime: {
		type: Sequelize.DATE,
		allowNull: true,
		defaultValue: sequelize.literal('CURRENT_TIMESTAMP')
	}
}, {
	sequelize: sequelize,
	modelName: 'users_ranking_app_list',
	freezeTableName: true,
	timestamps: false
})

class UsersDetail extends Model {
}
UsersDetail.init({
	id: {
		autoIncrement: true,
		type: Sequelize.INTEGER(11),
		allowNull: false,
		primaryKey: true
	},
	usersid: {
		type: Sequelize.BIGINT,
		allowNull: false
	},
	game_list: {
		type: Sequelize.TEXT,
		allowNull: true
	},
	report: {
		type: Sequelize.TEXT,
		allowNull: true
	}
}, {
	sequelize: sequelize,
	modelName: 'users_detail',
	freezeTableName: true,
	timestamps: false
})


module.exports = {Users, UsersExtension, UsersRankingAppList, UsersDetail};
