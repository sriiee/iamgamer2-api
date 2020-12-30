const express = require('express');
const router = express.Router();
const moment = require("moment");
const {Users} = require("../model/users");
const {Payment, Sequelize} = require("../model/payment");
const {PlayTime} = require("../model/playtime");
const {GamesDetail} = require("../model/games_detail");
const {getGameDetail, getGameReport} = require("../lib/getInfo");
const {timeToString} = require("../lib/play");
const {success, error} = require("../lib/return");

const AWS = require("aws-sdk");
AWS.config.loadFromPath("./dynamodb_credentials.json");
let docClient = new AWS.DynamoDB.DocumentClient();


router.get("/genre/:genre", async (req, res, next) => {
    let body = req.query;
    let genre = req.params.genre;
    genre = genre.toUpperCase();
    let skip = 0,
        limit = 50,
        ret = {
            default: 0,
            list: [],
            next: false
        };

    if( body.hasOwnProperty('skip') && body['skip'] ){
        skip = Number(body['skip']);
    }
    if( body.hasOwnProperty('limit') && body['limit'] ){
        limit = Number(body['limit']);
    }

    let params = {
        TableName: "playstoreAppTitle",
        FilterExpression: "genre = :genre",
        ExpressionAttributeValues: {":genre": genre}
    };

    docClient.scan(params, (err, data)=> {
        if (err) {
            console.error(err);
        }
        else {
            let list = data['Items'];
            if( skip > 0 ){
                if( list.length > skip ){
                    for(let idx = skip; idx <= skip+limit; idx++){
                        let el = list[idx];
                        if(!el){
                            break;
                        }
                        ret['list'].push(el);
                    }
                    if( list.length > skip+limit ){
                        ret['next'] = true;
                    }
                }
                res.json(success(ret, null));
            } else {
                ret['list'] = list.slice(0,limit);
                if( list.length > limit ){
                    ret['next'] = true;
                }
                res.json(success(ret, null));
            }
        }
    });
});

router.get("/:string", async (req, res, next) => {
    let body = req.query;
    let str = req.params.string;
    let skip = 0,
        limit = 50,
        ret = {
            list: [],
            next: false
        };

    if( body.hasOwnProperty('skip') && body['skip'] ){
        skip = Number(body['skip']);
    }
    if( body.hasOwnProperty('limit') && body['limit'] ){
        limit = Number(body['limit']);
    }

    let params = {
        TableName: "playstoreAppTitle",
        FilterExpression: "contains (title, :str)",
        ExpressionAttributeValues: {":str": str}
    };

    docClient.scan(params, (err, data)=> {
        if (err) {
            console.error(err);
        }
        else {
            let list = data['Items'];
            console.log(list);
            if( skip > 0 ){
                if( list.length > skip ){
                    for(let idx = skip; idx <= skip+limit; idx++){
                        let el = list[idx];
                        if(!el){
                            break;
                        }
                        ret['list'].push(el);
                    }
                    if( list.length > skip+limit ){
                        ret['next'] = true;
                    }
                }
                res.json(success(ret, null));
            } else {
                ret['list'] = list.slice(0,limit);
                if( list.length > limit ){
                    ret['next'] = true;
                }
                res.json(success(ret, null));
            }
        }
    });
});


router.post("/:pName", async (req, res, next) => {
    let body = req.body,
        uid = req.usersid,
        package_name = req.params.pName;

    let ret = {
        buff_count: 0,
        buff: {
            pay: {
                rank: '-',
            },
            play: {
                rank: '-',
            },
        },
        rank:{
            list:[]
        },
        report: {}
    };

    /////////////////////// 버프중 & 게이머 TOP 100 & 게임 리포트
    let game_detail = await GamesDetail.findOne({
        where: {
            package_name: package_name
        }
    });

    let info, ranking, report;
    if( !game_detail ) {
        console.log('null game detail ############ ');
        info = await getGameDetail(uid, package_name);

        GamesDetail.create({
            package_name : package_name,
            total_user: info.report.total_user,
            ranking: JSON.stringify(info.ranking),
            report: JSON.stringify(info.report)
        });
        ranking = info.ranking;
        report = info.report;
    } else {
        ranking = JSON.parse(game_detail.ranking);
        report = JSON.parse(game_detail.report);
    }

    ret.buff_count = report.total_user;
    ret.rank.next = ranking.next;
    if(ranking.list.length > 0){
        for (let idx = 0; idx < ranking.list.length; idx++) {
            let user_info = await Users.findOne({
                attributes: ['nickname', 'profile_image_url'],
                where: {
                    id: ranking.list[idx],
                    status: 1
                }
            });
            let _tmp = {
                usersid: ranking.list[idx],
                nickname: user_info.nickname,
                profile_image: user_info.profile_image_url
            };
            ret.rank.list.push(_tmp);
        }
    }

    ret.report = report;
    if(ret.report.total_play === 0){
        ret.report.total_play = '0분';
    } else {
        ret.report.total_play = timeToString(ret.report.total_play, 's');
    }
    if(ret.report.play_average === 0){
        ret.report.play_average = '0분';
    } else {
        ret.report.play_average = timeToString(ret.report.play_average, 's');
    }
    delete ret.report.total_user;

    /////////////////////// 내 버프활동
    let pay_rows = await Payment.findAll({
        attributes: ['usersid', [Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
        where: {
            package_name: package_name,
        },
        group: ['usersid'],
        order: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'DESC']],
        limit: 999,
        raw: true
    });
    let play_rows = await PlayTime.findAll({
        attributes: ['usersid', [Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']],
        where: {
            package_name: package_name,
        },
        group: ['usersid'],
        order: [[Sequelize.fn('SUM', Sequelize.col('play_time')), 'DESC']],
        limit: 999,
        raw: true
    });
    let cnt;
    if( pay_rows.length > play_rows.length ){
        cnt = pay_rows.length;
    } else {
        cnt = play_rows.length;
    }
    for (let idx = 0; idx < cnt; idx++) {
        if(pay_rows[idx]){
            if (pay_rows[idx].usersid === Number(uid)) {
                ret.buff.pay.rank = idx + 1;
                ret.buff.pay.total_amount = Number(pay_rows[idx]['sum_amount']);
            }
        }
        if(play_rows[idx]){
            if (play_rows[idx].usersid === Number(uid)) {
                ret.buff.play.rank = idx + 1;
                ret.buff.play.playtime = Number(pay_rows[idx]['playtime']);
            }
        }
    }
    if (!ret.buff.pay.total_amount) {
        let pay = await Payment.findAll({
            attributes: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
            where: {
                usersid: uid,
                package_name: package_name
            }
        });
        if (!pay[0].dataValues.sum_amount) {
            ret.buff.pay.total_amount = 0;
        } else {
            ret.buff.pay.total_amount = Number(pay[0].dataValues.sum_amount);
        }
    }
    if (!ret.buff.play.playtime) {
        let play = await PlayTime.findAll({
            attributes: [[Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']],
            where: {
                usersid: uid,
                package_name: package_name
            }
        });
        if (!play[0].dataValues.playtime) {
            ret.buff.play.playtime = 0;
        } else {
            ret.buff.play.playtime = Number(play[0].dataValues.playtime);
        }
    }
    ret.buff.pay.count = await Payment.count({
        where: {
            usersid: uid,
            package_name: package_name,
        }
    });
    ret.buff.play.count = await PlayTime.count({
        where: {
            usersid: uid,
            package_name: package_name,
        }
    });

    res.json(success(ret, null));
});



module.exports = router;
