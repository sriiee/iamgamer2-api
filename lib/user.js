const moment = require('moment');
const {Payment, Sequelize} = require("../model/payment");
const {PlayTime} = require("../model/playtime");
const {Users} = require("../model/users");
const {getInfofromDynamo} = require("../lib/getInfo");


const getUserReport = async (uid) => {
    let gamelist = {
        games_list: []
    };

    let report = {
        total_play: {
            rank: ''
        },
        top_play_game: {},
        play_genre: {},
        total_pay: {
            rank: ''
        },
        top_pay_game: {},
        pay_genre: {},
    };


    ////////////// game list
    let paylist = await Payment.findAll({
        attributes: ['package_name'],
        where: {
            usersid: uid
        },
        group: ['package_name'],
    });

    let playlist = await PlayTime.findAll({
        attributes: ['package_name'],
        where: {
            usersid: uid
        },
        group: ['package_name']
    });
    paylist.forEach(el=>{
        gamelist.games_list.push(el['dataValues']['package_name']);
    });
    playlist.forEach(el=>{
        gamelist.games_list.push(el['dataValues']['package_name']);
    });
    gamelist.games_list = Array.from(new Set(gamelist.games_list));
    gamelist.games_cnt = gamelist.games_list.length;


    ////////////// total
    let totalpay = await Payment.findAll({
        attributes: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
        where: {
            usersid: uid
        }
    });
    let totalplay = await PlayTime.findAll({
        attributes: [[Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']],
        where: {
            usersid: uid
        }
    });
    report.total_pay.amount = totalpay[0].dataValues.sum_amount;
    report.total_play.time = totalplay[0].dataValues.playtime;


    ////////////// top game
    let topPayGame = await Payment.findAll({
        attributes: ['package_name', 'exchanged_amount'],
        where: {
            usersid: uid
        },
        group: ['package_name'],
        order: [['exchanged_amount', 'DESC']],
        limit: 1
    });
    let topPlayGame = await PlayTime.findAll({
        attributes: ['package_name', 'play_time'],
        where: {
            usersid: uid
        },
        group: ['package_name'],
        order: [['play_time', 'DESC']],
        limit: 1
    });
    report.top_pay_game.amount = topPayGame[0].dataValues.exchanged_amount;
    report.top_pay_game.package_name = topPayGame[0].dataValues.package_name;
    report.top_play_game.time = topPlayGame[0].dataValues.play_time;
    report.top_play_game.package_name = topPlayGame[0].dataValues.package_name;


    let payGenre = getPayGenre(uid);
    let playGenre = getPlayGenre(uid);
    return new Promise((resolve, reject) => {
        Promise.all([payGenre, playGenre]).then(result => {
            report.pay_genre = result[0];
            report.play_genre = result[1];
            let ret = Object.assign(gamelist, report);
            resolve(ret);
        });
    });

};

const getPayGenre = async (uid) => {
    let payGenre = {};
    return new Promise((resolve, reject) => {
        Payment.findAll({
            where: {
                usersid: uid,
            },
            raw: true
        }).then(async rows => {
            let raw_package_list = [];
            for(let idx = 0; idx < rows.length; idx++) {
                let target = rows[idx];
                if(!raw_package_list.hasOwnProperty(target.package_name)) {
                    raw_package_list.push(target.package_name);
                }
            }
            raw_package_list = Array.from(new Set(raw_package_list));
            let _tmp_pinfo = getInfofromDynamo(raw_package_list);
            let pinfo = {};
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
                    if(!pinfo.hasOwnProperty(target.package_name)) {
                        continue;
                    }

                    let genre = pinfo[target.package_name].genre;
                    if(genre === "undefined") {
                        continue;
                    }
                    if(!payGenre.hasOwnProperty(genre)) {
                        payGenre[genre] = {
                            sum_amount: 0
                        }
                    }

                    payGenre[genre].sum_amount += Math.floor(target.exchanged_amount);
                }
                resolve(payGenre);
            })
        }).catch(err => {
            console.error(err);
            reject();
        })
    })
};

const getPlayGenre = async (uid) => {
    let playGenre = {};
    return new Promise((resolve, reject) => {
        PlayTime.findAll({
            where: {
                usersid: uid,
            },
            raw: true
        }).then(async rows => {
            let raw_package_list = [];
            for(let idx = 0; idx < rows.length; idx++) {
                let target = rows[idx];
                if(!raw_package_list.hasOwnProperty(target.package_name)) {
                    raw_package_list.push(target.package_name);
                }
            }
            raw_package_list = Array.from(new Set(raw_package_list));
            let _tmp_pinfo = getInfofromDynamo(raw_package_list);
            let pinfo = {};
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
                    if(!pinfo.hasOwnProperty(target.package_name)) {
                        continue;
                    }

                    let genre = pinfo[target.package_name].genre;
                    if(genre === "undefined") {
                        continue;
                    }
                    if(!playGenre.hasOwnProperty(genre)) {
                        playGenre[genre] = {
                            playtime: 0
                        }
                    }
                    playGenre[genre].playtime += Math.floor(target.play_time);
                }
                resolve(playGenre);
            })
        }).catch(err => {
            console.error(err);
            reject();
        })
    })
};

const getUserDetail = async (uid) => {

};




exports.getUserReport = getUserReport;
exports.getPayGenre = getPayGenre;
exports.getPlayGenre = getPlayGenre;
exports.getUserDetail = getUserDetail;



