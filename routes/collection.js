const express = require('express');
const router = express.Router();

const { v4: uuidv4 } = require("uuid");
const authFirebaseadmin = require("firebase-admin");
// const serviceAccount = require("../firebase_credentials");


const {success, error} = require("../lib/return");
const {getCurrencyRatio} = require("../lib/currency");
const {getInfo} = require("../lib/getInfo");
const {Payment} = require("../model/payment");
const {PlayTime} = require("../model/playtime");
const {Users} = require("../model/users");

const moment = require("moment");

// authFirebaseadmin.initializeApp({
//   credential: authFirebaseadmin.credential.cert(serviceAccount),
//   databaseURL: "https://themekeyboard.firebaseio.com"
// }, "auth");
//


/* GET home page. */
router.get('/', (req, res, next) => {
    res.render('index', { title: 'Express' });
});



router.post("/app_usage", async (req, res, next) => {
    let body = req.body;

    let uid = req.usersid;
    let data = body.data;

    console.log(uuidv4())

    let _tmp_package_list = {};
    let package_list = [];
    for(let idx = 0; idx < data.length; idx++) {
        if(!_tmp_package_list.hasOwnProperty(data[idx].p)) {
            _tmp_package_list[data[idx].p] = true;
            package_list.push(data[idx].p);
        }

    }

    let p_list = getInfo(package_list)

    p_list.then(result => {
        // console.log(result[0]);
        let pinfo = {};
        for(let idx = 0; idx < result.length; idx++) {

            let package_name = Object.getOwnPropertyNames(result[idx])[0];

            if(result[idx][package_name] === null) {
                continue;
            }
            pinfo[package_name] = result[idx][package_name];
        }
        for(let idx = 0; idx < data.length; idx++) {

            let target = data[idx];
            if(!pinfo.hasOwnProperty(target.p)) {
                continue;
            }

            if(!pinfo[target.p].genre.includes("GAME")) {
                continue;
            }


            let usetime = Math.floor((target.l - target.f) / 1000);
            // console.log(usetime);
            let d = {
                usersid: uid,
                package_name: target.p,
                start_datetime: moment(target.f),//new Date(Math.floor(target.f) / 1000),
                end_datetime: moment(target.l), //new Date(Math.floor(target.l) / 1000),
                play_time: usetime,
                report_date: new Date(),
                request_id: uuidv4()
            }

            PlayTime.create(d).catch(e => {})
        }
    })


    Users.update({
        last_play_time: data[data.length - 1]['l']
    }, {
        where: {
            id: uid,
            status: 1
        }
    })


    res.json(success(true, ""));
})

router.post("/payment_data", async (req, res, next) => {



    let body = req.body;
    let payment_history = body.history;
    let package_list = body.package;

    let usersid = req.usersid;
    let packages = {};

    let recent_package = {};

    const before = Math.floor(new Date().getTime() / 1000) - (86400*90);

    let package_info = await getInfo(package_list);


    let pinfo = {};
    for(let idx = 0; idx < package_info.length; idx++) {

        let package_name = Object.getOwnPropertyNames(package_info[idx])[0];

        if(package_info[idx][package_name] === null) {
            continue;
        }
        pinfo[package_name] = package_info[idx][package_name];
    }

    for(let idx = 0; idx < payment_history.length; idx++) {

        let target = payment_history[idx];
        if(!pinfo.hasOwnProperty(target.package_name)) {
            continue;
        }

        if(!pinfo[target.package_name].genre.includes("GAME")) {
            continue;
        }

        Payment.create({
            usersid: usersid,
            package_name: target.package_name,
            orderid: target.orderid,
            raw_price: target.amount_display,
            amount: target.amount,
            currency: target.currency,
            exchanged_amount: getCurrencyRatio(target.amount, target.currency),
            purchase_type: target.purchase_type,
            purchase_product: target.purchase_product,
            product_title: target.product_title,
            refund: target.refund,
            refund_status: target.refund_status,
            status: 1,
            regist_datetime: new Date(target.purchase_date * 1000),
            update_datetime: new Date()
        });

        if(
            pinfo[target.package_name]['statusCode'] === 204 ||
            target.refund_status === true
        ) {
            continue;
        }
        if(!packages.hasOwnProperty(target.package_name)) {
            packages[target.package_name] = {
                total_amount: 0,
                status: true,
                package_name: target.package_name,
                genre: pinfo[target.package_name].genre
            }
        }

        if(target.currency !== "KRW") {
            target.origin_amount = target.amount;
            target.amount = getCurrencyRatio(target.amount, target.currency);
        }

        packages[target.package_name]['total_amount'] += target.amount;
        if(target.purchase_date >= before ) {

            if(!recent_package.hasOwnProperty(target.package_name)) {
                recent_package[target.package_name] = {
                    total_amount: 0,
                    status: true,
                    package_name: target.package_name,
                    genre: target.genre
                }
            }
            recent_package[target.package_name]['total_amount'] += target.amount;
        }
    }

    let ret = Object.values(recent_package);
    ret.sort((a, b) => {
        return a.total_amount > b.total_amount ? -1 : a.total_amount < b.total_amount ? 1 : 0;
    });

    res.json(success(ret, ""));
})



const getTokenInfo = async (id_token) => {

    let token_res = await authFirebaseadmin.auth().verifyIdToken(id_token);

    console.log(token_res);
    let ret = {
        fbid: token_res.user_id,
        email: token_res.firebase.identities["email"][0]
    };
    if(token_res.firebase.identities.hasOwnProperty("google.com")) {
        ret["guid"] = token_res.firebase.identities["google.com"][0];
        ret["auid"] = "";
        ret["uid"] = token_res.firebase.identities["google.com"][0];
    }
    if(token_res.firebase.identities.hasOwnProperty("apple.com")) {
        ret["auid"] = token_res.firebase.identities["apple.com"][0];
        ret["guid"] = "";
        ret["uid"] = token_res.firebase.identities["apple.com"][0];
    }

    return ret;
};

module.exports = router;
