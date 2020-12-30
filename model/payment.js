const {Sequelize, sequelize} = require("./init");
const Model = Sequelize.Model;

class Payment extends Model {
}

Payment.init({
    // attributes
    id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
        allowNull: false
    },
    usersid: {
        type: Sequelize.INTEGER
    },
    package_name: {
        type: Sequelize.STRING
    },
    orderid: {
        type: Sequelize.STRING
    },
    raw_price: {
        type: Sequelize.STRING
    },
    amount: {
        type: Sequelize.DECIMAL(18, 4)
    },
    currency: {
        type: Sequelize.STRING
    },
    exchanged_amount: {
        type: Sequelize.INTEGER
    },
    purchase_type: {
        type: Sequelize.STRING
    },
    purchase_product: {
        type: Sequelize.STRING
    },
    product_title: {
        type: Sequelize.STRING
    },
    refund: {
        type: Sequelize.STRING
    },
    refund_status: {
        type: Sequelize.STRING
    },
    status: {
        type: Sequelize.INTEGER
    },
    regist_datetime: {
        type: Sequelize.DATE
    },
    update_datetime: {
        type: Sequelize.DATE
    }
}, {
    sequelize: sequelize,
    modelName: 'payment',
    freezeTableName: true,
    timestamps: false
});

module.exports = {Payment, Sequelize};
