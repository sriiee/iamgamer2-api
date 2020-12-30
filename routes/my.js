const express = require('express');
const router = express.Router();
const {Users, UsersExtension, UsersRankingAppList, UsersDetail} = require("../model/users");
const {Payment, Sequelize} = require("../model/payment");
const {PlayTime} = require("../model/playtime");
const moment = require("moment");
const {success, error} = require("../lib/return");
const {getInfo, getInfofromDynamo, getUserGameInfo} = require("../lib/getInfo");
const {getUserReport, getUserDetail} = require("../lib/user");
const {timeForToday, timeToString, getTodayPlay, getPlayTotal, getTodayGames, getPlayGraph, getPlayTop5, getPlayGenre, getPlayMonth, getPlayAllGenre} = require('../lib/play');
const Op = Sequelize.Op;


router.post("/update_time", async (req, res, next) => {
    let body = req.body;
    let usersid = req.usersid;
    let userinfo = await Users.findOne({
        id: usersid,
        status: 1
    });
    res.json(success({paytime: moment(userinfo['last_pay_time']).unix(), playtime: moment(userinfo['last_play_time']).unix()}, ""));
})
router.get("/paytime", async (req, res, next) => {

})
router.get("/playtime", async (req, res, next) => {

})


router.post("/paytime", async (req, res, next) => {

})
router.post("/playtime", async (req, res, next) => {

})


const toObject = (arr) => {
    return arr.reduce(function(acc, cur, i) {
        let package_name = Object.keys(cur)[0]
        acc[package_name] = cur[package_name];
        return acc;
    }, {});
}


const getTop5 = async (uid, startdate, enddate) => {

    let ret =[];
    return new Promise((resolve, reject) => {
        Payment.findAll({
            where: {
                usersid: uid,
                regist_datetime: {[Op.gte]: startdate, [Op.lt]: enddate}
            },
            group: ['package_name'],
            attributes: ['package_name', [Sequelize.fn('COUNT', Sequelize.col('package_name')), 'cnt'], [Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
            order: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'DESC']],
            limit: 5,
            raw: true
        }).then(top5 => {
            let ret = [];
            let _tmp_list = [];
            for(let idx = 0; idx < top5.length; idx++) {
                let target = top5[idx];
                _tmp_list.push(target['package_name']);
            }

            let getPlayinfo = getInfofromDynamo(_tmp_list);
            Promise.all(getPlayinfo).then(result => {
                result = toObject(result);
                for(let idx = 0; idx < top5.length; idx++) {
                    let target = top5[idx];
                    let _tmp = {
                        package_name: target["package_name"],
                        cnt: target["cnt"],
                        sum_amount: parseInt(target["sum_amount"]),
                        title: result[target["package_name"]].title,
                        icon: result[target["package_name"]].icon
                    }
                    ret.push(_tmp);
                }
                resolve(ret);
            }).catch(e => {
                console.error(e);
                reject(e);
            })

        }).catch(e => {
            console.error(e);
            reject(e);
        })
    });

}

const getWeekAndGenre = async (uid, startdate, enddate) => {
    let ret = {
        week: {},
        genre: {}
    }
    return new Promise((resolve, reject) => {
        Payment.findAll({
            where: {
                usersid: uid,
                regist_datetime: {[Op.gte]: startdate, [Op.lt]: enddate}
            },
            raw: true
        }).then(async rows => {

            let raw_package_list = [];

            for(let idx = 0; idx < rows.length; idx++) {
                let target = rows[idx];
                // console.log(target);
                if(!raw_package_list.hasOwnProperty(target.package_name)) {
                    raw_package_list.push(target.package_name);
                }
            }
            raw_package_list = Array.from(new Set(raw_package_list));
            let _tmp_pinfo = getInfofromDynamo(raw_package_list);
            let pinfo = {}
            Promise.all(_tmp_pinfo).then(result => {
                for(let idx = 0; idx < result.length; idx++) {

                    let package_name = Object.getOwnPropertyNames(result[idx])[0];

                    if(result[idx][package_name] === null) {
                        continue;
                    }
                    pinfo[package_name] = result[idx][package_name];
                }

                for(let idx = 0; idx < rows.length; idx++) {
                    let target = rows[idx];
                    let purchaseDate = moment(target.regist_datetime); //saturday
                    let nthOfMoth = Math.ceil(purchaseDate.date() / 7); //1
                    if(!ret.week.hasOwnProperty("week" + nthOfMoth)) {
                        ret.week["week" + nthOfMoth] = {
                            sum_amount: 0
                        }
                    }
                    ret.week["week" + nthOfMoth].sum_amount += Math.floor(target.exchanged_amount);


                    if(!pinfo.hasOwnProperty(target.package_name)) {
                        continue;
                    }

                    let genre = pinfo[target.package_name].genre;
                    if(genre === "undefined") {
                        continue;
                    }
                    if(!ret.genre.hasOwnProperty(genre)) {
                        ret.genre[genre] = {
                            sum_amount: 0
                        }
                    }

                    ret.genre[genre].sum_amount += Math.floor(target.exchanged_amount);
                }
                resolve(ret);
            })



        }).catch(err => {
            console.error(err);
            reject();
        })
    })




}


const getBefore = async (uid, enddate) => {

    // before month;
    // select sum(exchanged_amount) sum_amount, DATE_FORMAT(regist_datetime, '%Y-%m-01') regist_datetime
    // from gamer2.payment
    // where usersid = 1318
    // group by YEAR(regist_datetime), MONTH(regist_datetime)
    // order by regist_datetime DESC
    // limit 4;

    let ret = [];

    return new Promise(((resolve, reject) => {
        Payment.findAll({
            where: {
                usersid: uid,
                regist_datetime: {[Op.lt]: enddate}
            },
            attributes: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount'], [Sequelize.fn("DATE_FORMAT", Sequelize.col('regist_datetime'), '%Y-%m'), 'refine_regist_datetime']],
            group: ['refine_regist_datetime'],
            order: [['regist_datetime', 'DESC']],
            limit: 4,
            raw: true
        }).then(before => {
            for(let idx = 0; idx < before.length; idx++) {
                let target = before[idx];
                let _tmp = {
                    month: target['refine_regist_datetime'],
                    sum_amount: parseInt(target['sum_amount'])
                }
                ret.push(_tmp);
            }
            resolve(ret);

        }).catch(e => {
            console.error(e);
            reject();
        })
    }))

}

const getTotal = async (uid) => {

    return new Promise((resolve, reject) => {
        UsersExtension.findOne({
            where: {
                usersid: uid
            },
            raw: true
        }).then(total => {
            if(total === null) {
                UsersExtension.create({
                    usersid: uid,
                    total_amount: 0
                });
                resolve(0);
            } else {
                resolve(parseInt(total.total_amount));
            }
        }).catch(e => {
            console.error(e);
            reject()
        })
    });
}


router.post("/pay", async (req, res, next) => {
    let body = req.body;
    let uid = req.usersid;

    let startdate = moment().startOf('month').format("YYYY-MM-DD");
    let enddate = moment().add(1, 'month').startOf('month').format("YYYY-MM-DD");

    if(body.hasOwnProperty("m")) {
        startdate = moment(body.m).startOf("month").format("YYYY-MM-DD");
        enddate = moment(body.m).add(1, 'month').startOf("month").format("YYYY-MM-DD");
    }

    let ret = {
    };


    let top5Promise = getTop5(uid, startdate, enddate);

    let rowPromise = getWeekAndGenre(uid, startdate, enddate);
    // before
    let beforePromise = getBefore(uid, enddate);

    let totalPromise  = getTotal(uid);

    // week history, genre history

    Promise.all([top5Promise, rowPromise, beforePromise, totalPromise]).then(async result => {
        let top5 = result[0];
        let rows = result[1];
        let before = result[2];
        let total = result[3];

        // let top5 = [];

        ret["top5"] = top5;
        ret['week'] = rows['week'];
        ret['genre'] = rows['genre'];
        ret['before'] = before;
        ret['total'] = total;
        res.json(success(ret, null));
        return;
    })

});

router.post("/pay/game/:pName", async (req, res, next) => {
    let body = req.body;
    let uid = req.usersid;
    let ret = {
        info: {},
        data: {}
    };
    let package_name = req.params.pName,
        package_list = package_name.split(',');

    let pInfo = getInfofromDynamo(package_list);
    Promise.all(pInfo).then(async result => {
        pInfo = result;

        ret['info'] = pInfo[0][package_name];

        let startdate = moment().startOf('month').format("YYYY-MM-DD");
        let enddate = moment().add(1, 'month').startOf('month').format("YYYY-MM-DD");

        if (body.hasOwnProperty("m")) {
            startdate = moment(body.m).startOf("month").format("YYYY-MM-DD");
            enddate = moment(body.m).add(1, 'month').startOf("month").format("YYYY-MM-DD");
        }

        let rows = await Payment.findAll({
            attributes: ['product_title', 'exchanged_amount', [Sequelize.fn("DATE_FORMAT", Sequelize.col('regist_datetime'), '%m.%d'), 'date'], 'regist_datetime'],
            where: {
                usersid: uid,
                package_name: package_name,
                regist_datetime: {[Op.gte]: startdate, [Op.lt]: enddate}
            },
            order: [['regist_datetime', 'DESC']],
            raw: true
        });
        ret['info']['count'] = rows.length;
        ret['info']['total_amount'] = 0;

        rows.forEach(el => {
            el['amount'] = el['exchanged_amount'];
            ret['info']['total_amount'] += Number(el['exchanged_amount']);
            delete el['exchanged_amount'];
            el['ctime'] = moment(el['regist_datetime']).unix() * 1000;
            delete el['regist_datetime'];
        });

        // ret['data'] = rows.reduce((h, obj) => {
        //     h[obj.date] = (h[obj.date] || []).concat(obj);
        //     return h;
        // }, {});

        ret['data'] = rows;
        res.json(success(ret, null));
    }).catch(e => {
        console.error(e);
    })
});

router.post("/pay/genre/:genre", async (req, res, next) => {
    let body = req.body;
    let uid = req.usersid;
    let ret = {
        info: {},
        data: {},
        genre: {
            all: 0
        },
    };
    let genre = req.params.genre;
    genre = genre.toUpperCase();

    let startdate = moment().startOf('month').format("YYYY-MM-DD");
    let enddate = moment().add(1, 'month').startOf('month').format("YYYY-MM-DD");

    if (body.hasOwnProperty("m")) {
        startdate = moment(body.m).startOf("month").format("YYYY-MM-DD");
        enddate = moment(body.m).add(1, 'month').startOf("month").format("YYYY-MM-DD");
    }

    Payment.findAll({
        attributes: ['package_name', 'product_title', 'exchanged_amount', [Sequelize.fn("DATE_FORMAT", Sequelize.col('regist_datetime'), '%m.%d'), 'date'], 'regist_datetime'],
        where: {
            usersid: uid,
            regist_datetime: {[Op.gte]: startdate, [Op.lt]: enddate}
        },
        order: [['regist_datetime', 'DESC']],
        raw: true
    }).then(async rows => {
        let raw_package_list = [];
        for (let idx = 0; idx < rows.length; idx++) {
            let target = rows[idx];
            if (!raw_package_list.hasOwnProperty(target.package_name)) {
                raw_package_list.push(target.package_name);
            }
        }
        raw_package_list = Array.from(new Set(raw_package_list));
        let _tmp_pinfo = getInfofromDynamo(raw_package_list);
        let pinfo = {};
        Promise.all(_tmp_pinfo).then(result => {
            for (let idx = 0; idx < result.length; idx++) {
                let package_name = Object.getOwnPropertyNames(result[idx])[0];
                if (result[idx][package_name] === null) {
                    continue;
                }
                pinfo[package_name] = result[idx][package_name];
            }

            let genre_list = [];
            for (let idx = 0; idx < rows.length; idx++) {
                let target = rows[idx];
                if (!pinfo.hasOwnProperty(target.package_name)) {
                    continue;
                }
                let r_genre = pinfo[target.package_name].genre;
                if (!ret.genre.hasOwnProperty(genre)) {
                    ret.genre[genre] = 0;
                }
                if (r_genre === genre) {
                    ret.genre[genre] += Math.floor(target.exchanged_amount);

                    let item = {
                        package_name: pinfo[target.package_name].package_name,
                        title: pinfo[target.package_name].title,
                        icon: pinfo[target.package_name].icon,
                        product_title: target.product_title,
                        amount: target.exchanged_amount,
                        date: target.date,
                        ctime: moment(target.regist_datetime).unix()*1000
                    };
                    genre_list.push(item);
                }
                ret.genre['all'] += Math.floor(target.exchanged_amount);
            }

            ret['data'] = genre_list;
            // ret['data'] = genre_list.reduce((h, obj) => {
            //     h[obj.date] = (h[obj.date] || []).concat(obj);
            //     return h;
            // }, {});

            ret.info.genre = genre;
            ret.info.amount = ret.genre[genre];
            ret.info.per = (ret.genre[genre] / ret.genre['all']) * 100;
            if (ret.info.per > 0 && ret.info.per < 1) {
                ret.info.per = ret.info.per.toFixed(1);
                ret.info.per = ret.info.per + '%';
            } else if (ret.info.per > 0) {
                ret.info.per = Math.round(ret.info.per);
                ret.info.per = ret.info.per + '%';
            } else {
                ret.info.per = '0%';
            }
            delete ret['genre'];
            res.json(success(ret, null));
        })

    }).catch(err => {
        console.error(err);
    })
});

router.post("/pay/month", async (req, res, next) => {
    let body = req.body;
    let uid = req.usersid;
    let ret = {
        total_amount: 0,
        week: {}
    };

    let startdate = moment().startOf('month').format("YYYY-MM-DD");
    let enddate = moment().add(1, 'month').startOf('month').format("YYYY-MM-DD");

    if (body.hasOwnProperty("m")) {
        startdate = moment(body.m).startOf("month").format("YYYY-MM-DD");
        enddate = moment(body.m).add(1, 'month').startOf("month").format("YYYY-MM-DD");
    }

    Payment.findAll({
        attributes: ['package_name', 'product_title', 'exchanged_amount', 'regist_datetime', [Sequelize.fn("DATE_FORMAT", Sequelize.col('regist_datetime'), '%m.%d'), 'date']],
        where: {
            usersid: uid,
            regist_datetime: {[Op.gte]: startdate, [Op.lt]: enddate}
        },
        order: [['regist_datetime', 'DESC']],
        raw: true
    }).then(async rows => {
        let raw_package_list = [];
        for (let idx = 0; idx < rows.length; idx++) {
            let target = rows[idx];
            if (!raw_package_list.hasOwnProperty(target.package_name)) {
                raw_package_list.push(target.package_name);
            }
        }
        raw_package_list = Array.from(new Set(raw_package_list));
        let _tmp_pinfo = getInfofromDynamo(raw_package_list);
        let pinfo = {};
        Promise.all(_tmp_pinfo).then(result => {
            for (let idx = 0; idx < result.length; idx++) {
                let package_name = Object.getOwnPropertyNames(result[idx])[0];
                if (result[idx][package_name] === null) {
                    continue;
                }
                pinfo[package_name] = result[idx][package_name];
            }

            let data = {},
                week = [];
            for (let idx = 0; idx < rows.length; idx++) {
                let target = rows[idx];
                if (!pinfo.hasOwnProperty(target.package_name)) {
                    continue;
                }
                let purchaseDate = moment(target.regist_datetime); //saturday
                let nthOfMoth = Math.ceil(purchaseDate.date() / 7); //1
                if (!data.hasOwnProperty("week" + nthOfMoth)) {
                    data["week" + nthOfMoth] = [];
                    week.push("week" + nthOfMoth);
                }

                let _tmp = {
                    package_name: target.package_name,
                    title: pinfo[target.package_name].title,
                    icon: pinfo[target.package_name].icon,
                    product_title: target.product_title,
                    amount: target.exchanged_amount,
                    date: target.date,
                    ctime: moment(target.regist_datetime).unix()*1000
                };

                data["week" + nthOfMoth].push(_tmp);
                ret.total_amount += target.exchanged_amount;
            }

            for (let idx = 0; idx < week.length; idx++) {
                ret.week[week[idx]] = data[week[idx]].reduce((h, obj) => {
                    h[obj.date] = (h[obj.date] || []).concat(obj);
                    return h;
                }, {});
            }
            res.json(success(ret, null));
        })
    }).catch(err => {
        console.error(err);
    })
});

router.post("/rank", async (req, res, next) => {
    let body = req.body;
    let uid = req.usersid;
    let package_name = '',
        type = 'pay';
    let ret = {};

    if (!body.hasOwnProperty('package_name') || typeof body['package_name'] === 'undefined') {
        res.json(error(418, null, 'Required package name'));
    } else {
        package_name = body.package_name;
    }

    if( body.hasOwnProperty('type') && body['type'] ){
        type = body['type'];
    }

    let userinfo = await Users.findOne({
        attributes: ['nickname'],
        where:{
            id: uid,
            status: 1
        }
    });
    ret['nickname'] = userinfo['nickname'];

    let rows;
    if( type === 'pay' ){
        rows = await Payment.findAll({
            attributes: ['usersid', [Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
            where: {
                package_name: package_name,
            },
            group: ['usersid'],
            order: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'DESC']],
            limit: 999,
            raw: true
        });
    }

    if( rows ){
        for(let idx = 0; idx < rows.length; idx++){
            let user_id = rows[idx].usersid;
            if( user_id === Number(uid) ){
                ret['rank'] = idx+1;
                ret['total_amount'] = Number(rows[idx]['sum_amount'])
            }
        }
        if( !ret['rank'] ){
            ret['rank'] = '-';
            let total_amount = await Payment.findAll({
                attributes: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
                where:{
                    usersid: uid,
                    package_name: package_name
                }
            });
            if(total_amount[0].dataValues.sum_amount){
                ret['total_amount'] = Number(total_amount[0].dataValues.sum_amount);
            } else {
                ret['total_amount'] = 0;
            }
        }
    }

    res.json(success(ret, null));
});


router.post("/game", async (req, res, next) => {
    let body = req.body,
        uid = req.usersid;
    let ret = {
        buff_count: 0,
        games: {},
        report: {
            total_play: {},
            top_play: {},
            play_genre: {},
            total_pay: {},
            top_pay: {},
            pay_genre: {},
        }
    };

    let info = await UsersDetail.findOne({
        where: {
            usersid: uid
        }
    });

    let game_list = {},
        report = {};
    if( info ){
        game_list = JSON.parse(info.dataValues.game_list);
        report = JSON.parse(info.dataValues.report);
        ret.buff_count = game_list.cnt;
        console.log(report);
    }

    /////////////// report
    ret.report.total_play.time = timeToString(Number(report.total_play.time), 's');
    ret.report.total_play.times = Number(report.total_play.time);
    ret.report.total_play.rank = report.total_play.rank;
    ret.report.top_play.package_name = report.top_play_game.package_name;
    ret.report.top_play.time = timeToString(report.top_play_game.time, 's');
    ret.report.top_play.times = Number(report.top_play_game.time);
    ret.report.play_genre = report.play_genre;

    ret.report.total_pay.amount = Number(report.total_pay.amount);
    ret.report.total_pay.rank = report.total_pay.rank;
    ret.report.total_pay.package_name = report.top_pay_game.package_name;
    ret.report.top_pay.amount = report.top_pay_game.amount;
    ret.report.pay_genre = report.pay_genre;


    res.json(success(ret, null));
});

router.post("/game/apps", async (req, res, next) => {
    let body = req.body,
        uid = req.usersid;
    let ret = {};
    let limit = 50,
        skip = 0;

    if( body.hasOwnProperty('limit') && body['limit'] ){
        limit = body['limit'];
    }
    if( body.hasOwnProperty('skip') && body['skip'] ){
        skip = body['skip'];
    }

    let play_list = await PlayTime.findAll({
        where: {
            usersid: uid,
        },
        group: ['package_name'],
        order: [['end_datetime', 'DESC']],
        attributes: ['package_name'],
        raw: true
    });
    let pay_list = await Payment.findAll({
        where: {
            usersid: uid,
        },
        group: ['package_name'],
        order: [['update_datetime', 'DESC']],
        attributes: ['package_name'],
        raw: true
    });

    let game_list = [];
    play_list.forEach(el => {
        game_list.push(el['package_name']);
    });
    pay_list.forEach(el => {
        game_list.push(el['package_name']);
    });
    game_list = Array.from(new Set(game_list));
    ret.count = game_list.length;

    if (game_list.length > skip + limit) {
        game_list = game_list.slice(skip, skip+limit);
        ret.next = true;
    } else {
        ret.next = false;
    }

    let games = getUserGameInfo(uid, game_list);
    Promise.all([games]).then(result => {
        ret.list = result[0].list;
        res.json(success(ret, null));
        return;
    });

});

router.post("/play", async (req, res, next) => {
    let body = req.body;
    let uid = req.usersid;

    let startdate = moment().startOf('month').format("YYYY-MM-DD");
    let enddate = moment().add(1, 'month').startOf('month').format("YYYY-MM-DD");

    if(body.hasOwnProperty("m")) {
        startdate = moment(body.m).startOf("month").format("YYYY-MM-DD");
        enddate = moment(body.m).add(1, 'month').startOf("month").format("YYYY-MM-DD");
    }

    let limit;
    if( body.hasOwnProperty('limit') && body['limit'] ){
        limit = body['limit'];
    }

    let ret = { };


    let todayPromise = getTodayPlay(uid);
    let totalPromise = getPlayTotal(uid);
    let todayGames = getTodayGames(uid, limit);
    let playGraph = getPlayGraph(uid,'h');
    let top5 = getPlayTop5(uid,startdate, enddate);
    let genre = getPlayGenre(uid,startdate, enddate);

    // Promise.all([genre]).then(async result => {
    //     ret['genre'] = result[0];
    //     res.json(success(ret, null));
    // });



    Promise.all([todayPromise, totalPromise, todayGames, playGraph, top5, genre]).then(async result => {
        if(result[0]){
            ret['today_play'] = timeToString(result[0], 's');
        } else {
            ret['today_play'] = '0분';
        }
        if(result[1]){
            ret['total_play'] = timeToString(result[1], 's');
        } else {
            ret['total_play'] = '0분';
        }
        ret['today_games'] = result[2];
        ret['play_graph'] = result[3];
        ret['top5'] = result[4];
        ret['genre'] = result[5];
        console.log('======================================================');
        res.json(success(ret, null));
    });


});

router.post("/play/before", async (req, res, next) => {
    let body = req.body,
        uid = req.usersid,
        type = 'd';

    if( body.hasOwnProperty('type') && body['type'] ){
        type = body['type'];
    }

    let playGraph = getPlayGraph(uid, type);
    Promise.all([playGraph]).then(async result => {
        res.json(success(result[0], null));
    });
});

router.post("/play/apps", async (req, res, next) => {
    let body = req.body,
        uid = req.usersid;
    let limit;
    if( body.hasOwnProperty('limit') && body['limit'] ){
        limit = body['limit'];
    }
    let todayGames = getTodayGames(uid, limit);
    Promise.all([todayGames]).then(async result => {
        res.json(success(result[0], null));
    });
});

router.post("/play/month", async (req, res, next) => {
    let body = req.body,
        uid = req.usersid;

    let startdate = moment().startOf('month').format("YYYY-MM-DD");
    let enddate = moment().add(1, 'month').startOf('month').format("YYYY-MM-DD");

    if(body.hasOwnProperty("m")) {
        startdate = moment(body.m).startOf("month").format("YYYY-MM-DD");
        enddate = moment(body.m).add(1, 'month').startOf("month").format("YYYY-MM-DD");
    }

    let playMonth = getPlayMonth(uid, startdate, enddate);
    Promise.all([playMonth]).then(async result => {
        res.json(success(result[0], null));
    });
});

router.post("/play/genre/:genre", async (req, res, next) => {
    let body = req.body,
        uid = req.usersid;
    let genre = req.params.genre;
    genre = genre.toUpperCase();

    let startdate = moment().startOf('month').format("YYYY-MM-DD");
    let enddate = moment().add(1, 'month').startOf('month').format("YYYY-MM-DD");

    if(body.hasOwnProperty("m")) {
        startdate = moment(body.m).startOf("month").format("YYYY-MM-DD");
        enddate = moment(body.m).add(1, 'month').startOf("month").format("YYYY-MM-DD");
    }

    let params = {
        uid: uid,
        genre: genre,
        startdate: startdate,
        enddate: enddate
    };
    let playGenre = getPlayAllGenre(params);
    Promise.all([playGenre]).then(async result => {
        res.json(success(result[0], null));
    });
});



module.exports = router;
