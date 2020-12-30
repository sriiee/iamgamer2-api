const axios = require("axios");

const AWS = require("aws-sdk")
AWS.config.loadFromPath("./dynamodb_credentials.json");
AWS.config.update({region: "ap-northeast-2", httpOptions: {timeout: 3000}});


AWS.config.setPromisesDependency(null)

let docClient = new AWS.DynamoDB.DocumentClient();

const {Payment, Sequelize} = require("../model/payment");
const {PlayTime} = require("../model/playtime");

const getInfofromDynamo = (package_names) => {

    let r = [];
    let _ret_object = {}
    for(let idx = 0; idx < package_names.length; idx++) {
        let params = {
            TableName: "playstoreAppTitle",
            Key: {"package_name": package_names[idx]}
        }

        let ret = new Promise((resolve, reject) => {
            docClient.get(params).promise().then(data => {
                let _tmp = {};
                if(data.hasOwnProperty("Item")) {

                    let key = data.Item.package_name;
                    _tmp[key] = data.Item;
                    resolve(_tmp);
                } else {
                    _tmp[package_names[idx]] = {
                        package_name: package_names[idx],
                        title: package_names[idx],
                        icon: "",
                        genre: "undefined"
                    }

                    getInfo([package_names[idx]])
                    resolve(_tmp);
                }
            }).catch(e => {
                // console.error(e);

                console.error(e);
                reject(e);
            })
        });
        r.push(ret);

    }

    return r;

};


/**
 * @param {[string]} package_name
 */
const getInfo = (package_names) => {
    const url = "https://f7d51fboh8.execute-api.ap-northeast-2.amazonaws.com/prod/getPlayInfo";
    let ret = {};
    // console.log(package_names);


    const request = (package_name) => {
        // console.log(url, package_name);
        return axios.post(url, {package_name: package_name}).then(res => {
            let ret = {}
            if(res.data.body === null) {
                ret[package_name] = null;
                return ret;
            }
            let key = res.data.body.package_name;
            ret[key] = res.data.body;
            return ret;
        })
    }


    let r = [];

    for(let idx = 0; idx < package_names.length; idx++) {
        r.push(request(package_names[idx]));
    }

    return Promise.all(r);

}




const toObject = (arr) => {
    return arr.reduce(function(acc, cur, i) {
        let package_name = Object.keys(cur)[0]
        acc[package_name] = cur[package_name];
        return acc;
    }, {});
}
const getUserGameInfo = async (uid, list) => {
    let ret = {
        list: {}
    };

    return new Promise((resolve, reject) => {
        let pInfo = getInfofromDynamo(list);
        Promise.all(pInfo).then(async result => {
            result = toObject(result);
            for (let idx = 0; idx < list.length; idx++) {
                let package_name = list[idx];
                // console.log(package_name);
                // 총 결제 금액
                let rows = await Payment.findAll({
                    attributes: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
                    where: {
                        usersid: uid,
                        package_name: package_name,
                    }
                });

                // 총 실행 시간 & 횟수
                let playRows = await PlayTime.findAll({
                    attributes: [[Sequelize.fn('COUNT', Sequelize.col('id')), 'cnt'],[Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']],
                    where: {
                        usersid: uid,
                        package_name: package_name,
                    }
                });

                let _tmp = {
                    title: result[package_name]['title'],
                    icon: result[package_name]['icon'],
                    total_amount: Number(rows[0]['dataValues']['sum_amount']),
                    total_play_time: Number(playRows[0]['dataValues']['playtime']),
                    total_play_count: playRows[0]['dataValues']['cnt'],
                };
                ret.list[package_name] = _tmp;
            }

            // console.log('>>>>>>>',ret);
            resolve(ret);
        }).catch(e => {
            console.error(e);
            reject(e);
        })
    })
};

const getRankInfo = async (args) => {
    let myuid = args['myusersid'],
        usersid = args['usersid'];
    let ret = {};

    let my_pay = await Payment.findAll({
        where: {
            usersid: myuid,
        },
        group: ['package_name'],
        order: [['update_datetime', 'DESC']],
        attributes: ['package_name'],
        raw: true
    });
    let my_play = await PlayTime.findAll({
        where: {
            usersid: myuid,
        },
        group: ['package_name'],
        order: [['end_datetime', 'DESC']],
        attributes: ['package_name'],
        raw: true
    });
    let user_pay = args['pay_list'];
    let user_play = args['play_list'];

    let my_game_list = [],
        user_game_list = [],
        user_pay_list = [],
        user_play_list = [],
        my_pay_list = [],
        my_play_list = [];
    my_pay.forEach(el => {
        my_game_list.push(el['package_name']);
        my_pay_list.push(el['package_name']);
    });
    my_play.forEach(el => {
        my_game_list.push(el['package_name']);
        my_play_list.push(el['package_name']);
    });
    user_pay.forEach(el => {
        user_game_list.push(el['package_name']);
        user_pay_list.push(el['package_name']);
    });
    user_play.forEach(el => {
        user_game_list.push(el['package_name']);
        user_play_list.push(el['package_name']);
    });

    my_game_list = Array.from(new Set(my_game_list));
    user_game_list = Array.from(new Set(user_game_list));

    let game_list = user_game_list.filter((name) => my_game_list.includes(name));
    game_list = Array.from(new Set(game_list));

    // 같은 게임을 보유하고 있지 않을 경우 -> 유저 결제 금액순
    // 유저가 결제한 게임 없는 경우 -> 내 결제 금액순...
    // 모두 없을 경우 -> 유저 최근 실행순......
    // 실행 게임 없을 경우 -> 내 최근 실행순.........
    // 그 외 -> 게임 없음.............
    if( game_list.length < 1 ){
        if( user_pay_list.length > 0 ){
            game_list = user_pay_list;
        } else {
            if( my_pay_list.length > 0 ){
                game_list = my_pay_list;
            } else {
                if( user_play_list.length > 0 ){
                    game_list = user_play_list;
                } else {
                    if( my_play_list.length > 0 ){
                        game_list = my_play_list;
                    } else {
                        game_list = [];
                    }
                }
            }
        }
    }

    return new Promise((resolve, reject) => {
        let pInfo = getInfofromDynamo(game_list);
        Promise.all(pInfo).then(async result => {
            ret.game_info = result;
            ret.game_list = game_list;
            resolve(ret);
        }).catch(e => {
            console.error(e);
            reject(e);
        });
    });
};

const getGameDetail = async (uid, package_name) => {
    let ret = {
        ranking: {
            list: [],
            next: false
        },
        report: {
            total_play: 0,
            play_average: 0,
            play_user: 0,
            total_amount: 0,
            pay_average: 0,
            pay_user: 0
        }
    };

    //////////////// TOP 100
    let ranking = await Payment.findAll({
        attributes: ['usersid',  [Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
        where: {
            package_name: package_name
        },
        group: ['usersid'],
        order: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'DESC']],
        limit: 21
    });
    ranking.forEach(el=>{
        ret.ranking.list.push(el.usersid);
    });
    if( ranking.length > 20 ){
        ret.ranking.next = true;
        ret.ranking.list = ret.ranking.list.slice(0,20);
    }

    //////////////// playtime
    let play_time = await PlayTime.findAll({
        attributes: ['usersid', [Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']],
        where: {
            package_name: package_name
        },
        group: ['usersid']
    });
    ret.report.play_user = play_time.length;

    //////////////// payment
    let pay_time = await Payment.findAll({
        attributes: ['usersid', [Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
        where: {
            package_name: package_name
        },
        group: ['usersid']
    });
    ret.report.pay_user = pay_time.length;

    //////////////// total_user
    let user_list = [];
    play_time.forEach(el=>{
        user_list.push(el.dataValues.usersid);
        ret.report.total_play += Number(el.dataValues.playtime);
    });
    pay_time.forEach(el=>{
        user_list.push(el.dataValues.usersid);
        ret.report.total_amount += Number(el.dataValues.sum_amount);
    });
    ret.report.play_average = Math.round(ret.report.total_play/ret.report.play_user);
    ret.report.pay_average = Math.round(ret.report.total_amount/ret.report.pay_user);
    if(!ret.report.play_average){ ret.report.play_average = 0; }
    if(!ret.report.pay_average){ ret.report.pay_average = 0; }
    user_list = Array.from(new Set(user_list));
    ret.report.total_user = user_list.length;

    return ret;
};

const getGameReport = async (package_name) => {
    let ret = {
        total_play: 0,
        play_average: 0,
        play_user: 0,
        total_amount: 0,
        pay_average: 0,
        pay_user: 0
    };
    //////////////// playtime
    let play_time = await PlayTime.findAll({
        attributes: ['usersid', [Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']],
        where: {
            package_name: package_name
        },
        group: ['usersid']
    });
    ret.play_user = play_time.length;

    //////////////// payment
    let pay_time = await Payment.findAll({
        attributes: ['usersid', [Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
        where: {
            package_name: package_name
        },
        group: ['usersid']
    });
    ret.pay_user = pay_time.length;


    //////////////// total_user
    let user_list = [];
    play_time.forEach(el=>{
        user_list.push(el.dataValues.usersid);
        ret.total_play += Number(el.dataValues.playtime);
    });
    pay_time.forEach(el=>{
        user_list.push(el.dataValues.usersid);
        ret.total_amount += Number(el.dataValues.sum_amount);
    });
    ret.play_average = Math.round(ret.total_play/ret.play_user);
    ret.pay_average = Math.round(ret.total_amount/ret.pay_user);
    user_list = Array.from(new Set(user_list));
    ret.total_user = user_list.length;

    return ret;
};


exports.getInfo = getInfo;
exports.getInfofromDynamo = getInfofromDynamo;
exports.getUserGameInfo = getUserGameInfo;
exports.getRankInfo = getRankInfo;
exports.getGameDetail = getGameDetail;
exports.getGameReport = getGameReport;

