const fs = require("fs");
const {Users} = require("../model/users");
const {Payment, Sequelize} = require("../model/payment");

const moment = require("moment");

const exec = async () => {


    // let data = fs.readFileSync("./payment.csv", {encoding: "utf8", flag: 'r'});
    let data = fs.readFileSync("./payment.csv", {encoding: "utf8", flag: 'r'});
    // console.log(data);
    let rows = data.split("\n");
    // 1593561600 20200701 000000
    // 1597968000 20200821 000000

    for(let idx = 1; idx < rows.length - 1; idx++) {
        let usersid = await Users.findOne({ order: Sequelize.literal('rand()'), limit: 1 })
        console.log(usersid.id);
        let row = rows[idx].split(";");
        console.log(row);
        if(idx === 0 || row.length === 0 || row[6] !== "₩") {
            continue;
        }


        let package_name = row[2];
        let orderid = row[3];
        let raw_price = row[4];
        let amount = row[5];
        let currency = row[6];
        let exchange_amount = row[7];
        let purchase_product = '상품ID ' + idx;
        let product_title = '상품명 ' + idx;
        let refund_status = 0;
        let status = 1;
        let purchase_type = "inapp";
        let update_datetime= new Date();
        let regist_datetime = new Date();
        let userid = usersid;
        let refund = null;
        // let regist_datetime =
        console.log(row[3]);


        Payment.create({
            usersid: usersid.id,
            package_name: package_name,
            orderid: orderid,
            raw_price: raw_price,
            amount: amount,
            currency: currency,
            exchanged_amount: exchange_amount,
            purchase_type: purchase_type,
            purchase_product: purchase_product,
            product_title: product_title,
            refund: refund,
            refund_status: refund_status,
            status: 1,
            regist_datetime: moment.unix(1593561600 + (86400 * getRandomInt(0, 51))),
            update_datetime: new Date()
        }).catch(e => {
            console.error(e);
        })

    }


}

// console.log(usersid);
//
exec();
function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min; //최댓값은 제외, 최솟값은 포함
}
