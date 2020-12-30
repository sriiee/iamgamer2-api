const {Users, UsersExtension} = require("../model/users");
const {Payment, Sequelize} = require("../model/payment");
const exec = async () => {
    let userlist = await Users.findAll({
        where: {
            status: 1
        },
        raw: true
    })

    for(let idx = 0; idx < userlist.length; idx++) {
        let payment = await Payment.findOne({
            where: {
                usersid: userlist[idx].id
            },
            attributes: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
            raw: true
        })

        UsersExtension.create({
            usersid: userlist[idx].id,
            total_amount: payment['sum_amount']
        })

        console.log(payment);

    }
    process.exit(1)




}


exec();
