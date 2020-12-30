const express = require('express');
const router = express.Router();
const {Users, UsersRankingAppList} = require("../model/users");
const {Payment, Sequelize} = require("../model/payment");
const {RankingAppList} = require("../model/ranking_app_list");
const moment = require("moment");
const {success, error} = require("../lib/return");
const {getInfo} = require("../lib/getInfo");

const Op = Sequelize.Op;


router.post("/app", async (req, res, next) => {
    let uid = req.usersid;
    let app_list = await UsersRankingAppList.findOne({
        attributes: ['applist'],
        where: {
            usersid: uid
        }
    });

    let pinfo = [];
    if( app_list ){
        app_list = JSON.parse(app_list.applist);
        app_list = app_list.package_name;
        let raw_package_list = Array.from(new Set(app_list));
        let _tmp_pinfo = await getInfo(raw_package_list);


        for(let idx = 0; idx < _tmp_pinfo.length; idx++) {
            let package_name = Object.getOwnPropertyNames(_tmp_pinfo[idx])[0];
            if(_tmp_pinfo[idx][package_name] === null) {
                continue;
            }
            let tmp = {
                title: _tmp_pinfo[idx][package_name]['title'],
                package_name: _tmp_pinfo[idx][package_name]['package_name'],
                icon: _tmp_pinfo[idx][package_name]['icon'],
            };
            pinfo.push(tmp);
        }
    }

    res.json(success(pinfo, null));
});

router.post("/app/:pName", async (req, res, next) => {
    let body = req.body;
    let package_name = req.params.pName;
    let skip = 0,
        type = '';
    let ret = {
        list: [],
        next: false
    };

    if( body.hasOwnProperty('skip') && body['skip'] ){
        skip = body['skip'];
    }
    if( body.hasOwnProperty('type') && body['type'] ){
        type = body['type'];
    } else {
        type = 'pay';
    }

    let where = {};
    if( package_name !== 'all' ){
        where['package_name'] = package_name;
    }

    let rows;
    if( type === 'pay' ){
        rows = await Payment.findAll({
            attributes: ['usersid', [Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
            where: where,
            group: ['usersid'],
            order: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'DESC']],
            limit:21,
            offset: skip,
            raw: true
        });
    } else {
        // playtime
    }

    if( rows ){
        if( rows.length > 20 ){
            ret.next = true;
            rows = rows.slice(0, 20);
        }
        for(let user of rows){
            let user_info = await Users.findOne({
                attributes: ['nickname','profile_image_url'],
                where:{
                    id: user['usersid'],
                    status: 1
                }
            });

            let data = {
                usersid: user['usersid'],
                nickname: user_info['nickname'],
                package_name: user['package_name'],
                profile_url: user_info['profile_image_url'],
                total_amount: Number(user['sum_amount'])
            };
            ret.list.push(data);
        }
    }

    res.json(success(ret, null));
});


module.exports = router;
