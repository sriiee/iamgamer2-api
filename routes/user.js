/** Express router providing user related routes
 * @module routers/user
 * @requires express
 */

/**
 * express module
 * @const
 */
const express = require('express');
/**
 * Express router to mount user related functions on.
 * @type {object}
 * @const
 * @namespace userRouter
 */
const router = express.Router();
const {Users, UsersExtension} = require("../model/users");
const {Payment, Sequelize} = require("../model/payment")
const {PlayTime} = require("../model/playtime")
const moment = require("moment");
const {success, error} = require("../lib/return");
const {getUserGameInfo, getInfofromDynamo, getRankInfo, getRank} = require("../lib/getInfo");

const Op = Sequelize.Op;


router.get("/info", async (req, res, next) => {
    let body = req.body;
    let uid = req.usersid;
    console.log(uid);
    if(typeof uid === "undefined") {
        res.json(error(403, ""));
        return;
    }
    //console.log(uid);
    let userinfo = await Users.findOne({ where: {
            id: uid,
            status: 1
        }, raw: true});
    if(userinfo === null) {
        res.json(error(204, ""));
    }

    let ret = {
	email: userinfo.email,
	uid: userinfo.uid,
	    nickname: userinfo.nickname,
	    adid: userinfo.adid,
	    profile_image_url: userinfo.profile_image_url,
	    profile_privacy_level: userinfo.profile_privacy_level,
	    gender: userinfo.gender,
	    birth_year: userinfo.birth_year,
	    push_level: userinfo.push_level
    }
    res.json(success(ret, ""));
});

/**
 * get Users update time
 * @name POST /user/update_time
 * @memberof module:routers/user~userRouter
 * @inner
 * @function
 * @param {}
 */

const toObject = (arr) => {
    return arr.reduce(function(acc, cur, i) {
        let package_name = Object.keys(cur)[0]
        acc[package_name] = cur[package_name];
        return acc;
    }, {});
}

router.post("/update_time", async (req, res, next) => {
    let body = req.body;
    let uid = req.usersid;
    console.log(uid);
    if(typeof uid === "undefined") {
        res.json(error(403, ""));
        return;
    }
    //console.log(uid);
    let userinfo = await Users.findOne({ where: {
            id: uid,
            status: 1
        }, raw: true});
    if(userinfo === null) {
        res.json(error(204, ""));
    }
    console.log(userinfo.data);
    res.json(success({paytime: moment(userinfo['last_pay_time']).unix(), playtime: moment(userinfo['last_play_time']).unix()}, ""));
});

/**
 * Set Users push level
 * @name POST /user/push_level
 * @memberof module:routers/user~userRouter
 * @inner
 * @function
 * @param {Number} push_level 0, 1 -  push level
 */
router.post("/push_level", async(req, res, next) => {
    let body = req.body;
    let uid = req.usersid;
    if (!body.hasOwnProperty('push_level')) {
        return res.json(error(418, null, 'Required push_level'));
    }

    Users.update({
        push_level: body.push_level
    }, {
        where: {
            id: uid
        }
    });

    res.json(success({success: true}, ""));
});

/**
 * Set User nickname
 * @name POST /user/nickname
 * @memberof module:routers/user~userRouter
 * @inner
 * @function
 * @param {String} nickname 닉네임
 */
router.post("/nickname", async(req, res, next) => {
    let body = req.body;
    let uid = req.usersid;

    if(!body.hasOwnProperty("nickname")) {
        return res.sendStatus(401);
    }

    let nickname = body.nickname;

    async function nicknameCheck(nickname) {
        if(nickname.length > 15) {
            return "length";
        }

        const NICKNAME_PATTERN =  /[^가-힣ㄱ-ㅎㅏ-ㅣa-zA-Z0-9]/gi;
        if(NICKNAME_PATTERN.test(nickname)) {
            return "rule"
        }

        let result = await Users.count({
            where: {
                nickname: nickname,
                status: 1
            }
        })

        if(result !== 0) {
            return "exists"
        }

        return true;
    }

    switch (await nicknameCheck(nickname)) {
        case "length": res.json(error(401, {msg: "length"}, "nickname length check")); break;
        case "rule": res.json(error(401, {msg: "rule"}, "nickname rule check")); break;
        case "exists": res.json(error(604, {msg: "exists"}, "nickname already exists")); break;
        case true: res.json(success({success: true}, "")); break;
        default: res.sendStatus(500); break;
    }

    Users.update({
        nickname: nickname
    }, {
        where: {
            id: uid
        }
    })

    res.json(success({success: true}, ""));

});


/**
 * Set User gender
 * @name POST /user/gender
 * @memberof module:routers/user~userRouter
 * @inner
 * @function
 * @param {Number} gender 0, 1
 */
router.post("/gender", async(req, res, next) => {
    let body = req.body;
    let uid = req.usersid;

    if (!body.hasOwnProperty('gender')) {
        return res.json(error(418, null, 'Required gender'));
    }

    Users.update({
        gender: body.gender
    }, {
        where: {
            id: uid
        }
    });

    res.json(success({success: true}, ""));
});

/**
 * Set User birth year
 * @name POST /user/birth_year
 * @memberof module:routers/user~userRouter
 * @inner
 * @function
 * @param {Number} birth_year 2020
 */
router.post("/birth_year", async(req, res, next) => {
    let body = req.body;
    let uid = req.usersid;

    if (!body.hasOwnProperty('birth_year')) {
        return res.json(error(418, null, 'Required birth_year'));
    }

    Users.update({
        birth_year: body.birth_year
    }, {
        where: {
            id: uid
        }
    });

    res.json(success({success: true}, ""));
});



/**
 * Set Users privacy public level
 * @name POST /user/profile_privacy_level
 * @memberof module:routers/user~userRouter
 * @inner
 * @function
 * @param {Number} profile_privacy_level 0, 1
 */
router.post("/profile_privacy_level", async(req, res, next) => {
    let body = req.body;
    let uid = req.usersid;

    if (!body.hasOwnProperty('profile_privacy_level')) {
        return res.json(error(418, null, 'Required profile_privacy_level'));
    }

    Users.update({
        profile_privacy_level: body.profile_privacy_level
    }, {
        where: {
            id: uid
        }
    });

    res.json(success({success: true}, ""));
});


/**
 * Set Users privacy public level
 * @name POST /user/profile_image
 * @memberof module:routers/user~userRouter
 * @inner
 * @function
 * @desc Contenty-type: Multipart/form-data
 * @param {File} img
 */
router.post("/profile_image", async(req, res, next) => {
    const AWS = require('aws-sdk');
    AWS.config.loadFromPath('./s3_credentials.json');
    const s3 = new AWS.S3({region: 'ap-northeast-2'});
    const fs = require('fs');

    let body = req.body;
    let uid = req.usersid;
    let files = req.file;
	if(typeof(files) === "undefined") {
		return res.json(error(418, null, 'Required profile image'));
	}
	console.log(files);
    let key, fileBody, contentType;
    let type_full = files['filename'],
        type_arr = type_full.split('.'),
        type = type_arr[1];
    key = `profile/${uid}.${type}`;
    let img = `https://s3.ap-northeast-2.amazonaws.com/igm2-temp/profile/${uid}.${type}`;
    fileBody = fs.createReadStream(files['path']);
    contentType = `image/${type}`;

    let param = {
        Bucket:'igm2-temp',
        Key: key,
        ACL:'public-read',
        Body:fileBody,
        ContentType: contentType
    };

    await s3.putObject(param).send(err => {

        if (err) {
            return res.send(error(500, {error: "s3"}, ""));
        }

        Users.update({
            profile_image_url:img,
            profile_image_key: key
        }, {
            where: {
                id: uid
            }
        })

        res.json(success({success: true}, ""));
        fs.unlinkSync(files['path'])
    });
})




router.post("/profile_image_reset", async (req, res, next) => {

    const AWS = require('aws-sdk');
    AWS.config.loadFromPath('./s3_credentials.json');
    const s3 = new AWS.S3({region: 'ap-northeast-2'});
    const fs = require('fs');

    let body = req.body;
    let uid = req.usersid;




    const getRandomInt = (min, max) => {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min)) + min; //최댓값은 제외, 최솟값은 포함
    }

    const profile_img = `https://igm2-temp.s3.ap-northeast-2.amazonaws.com/default-profile/profile_${getRandomInt(1,5)}.png`;
	if(req.userInfo.profile_image_key === "none") {
		return res.send(error(403, {error: "no profile image"}, ""));
	}

    Users.update({
        profile_image_url: profile_img,
        profile_image_key: "none"
    }, {
        where: {
            id: uid
        }
    }).then(async result => {
        res.json(success({success: true}, ""));
    })

    if(req.userInfo.profile_image_key !== "google") {


        let param = {
            Bucket: 'igm2-temp',
            Key: req.userInfo.profile_image_key
        };


        await s3.deleteObject(param).send(err => {

            if (err) {
                console.log(err);
                return res.send(error(500, {error: "s3"}, ""));
            }

        });
    }



});


router.post("/:usersid", async (req, res, next) => {
    let body = req.body,
        uid = req.params.usersid,
        myuid = req.usersid;
    let ret = {
        buff_count: 0,
        games: {},
        rank: {}
    };

    // >>>>>>> 버프중인 게임
    // ret.buff_count

    // >>>>>>> 보유 게임
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
    ret.games.count = game_list.length;
    if (game_list.length > 4) {
        game_list = game_list.slice(0, 4);
        ret.games.next = true;
    } else {
        ret.games.next = false;
    }

    let games = getUserGameInfo(uid, game_list);
    if( !myuid ){
        Promise.all([games]).then(result => {
            ret.games.list = result[0].list;
            res.json(success(ret, null));
            return;
        });
    } else {
        // >>>>>>> 랭킹 비교
        let params = {
            myusersid: myuid,
            usersid: uid,
            play_list: play_list,
            pay_list: pay_list
        };
        let rank_list = getRankInfo(params);
        return new Promise((resolve, reject) => {
            Promise.all([games, rank_list]).then(async result => {
                ret.games.list = result[0].list;
                let pInfo = toObject(result[1]['game_info']);
                let game_list = result[1]['game_list'];

                // ranking
                let obj = {
                    count: 0,
                    list: {}
                };
                for(let game of game_list){
                    obj.count = game_list.length;
                    obj.list[game] = {};
                    obj.list[game].title = pInfo[game].title;
                    obj.list[game].icon = pInfo[game].icon;
                    obj.list[game].info = {
                        my:{
                            rank: '-'
                        },
                        user:{
                            rank: '-'
                        }
                    };
                    // 결제 랭킹
                    let payRank = await Payment.findAll({
                        attributes: ['usersid', [Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
                        where: {
                            package_name: game
                        },
                        group: ['usersid'],
                        order: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'DESC']],
                        limit: 999
                    });
                    if( payRank ){
                        let mRank = false,
                            uRank = false;
                        for(let idx = 0; idx < payRank.length; idx++){
                            let user_id = payRank[idx].usersid;
                            if( user_id === Number(myuid) || user_id === Number(uid) ){
                                let _tmp = {
                                    rank: idx+1,
                                    amount: Number(payRank[idx]['dataValues']['sum_amount'])
                                };
                                if( user_id === Number(myuid) ){
                                    obj.list[game].info.my = _tmp;
                                    mRank = true;
                                } else {
                                    obj.list[game].info.user = _tmp;
                                    uRank = true;
                                }
                            }
                        }

                        if( !mRank ){
                            let _tmp_info = {
                                rank: '-',
                            };
                            let myAmount = await Payment.findAll({
                                attributes: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
                                where: {
                                    usersid: myuid,
                                    package_name: game
                                }
                            });
                            if(myAmount[0]['dataValues']['sum_amount']){
                                _tmp_info.amount = Number(myAmount[0]['dataValues']['sum_amount']);
                            } else {
                                _tmp_info.amount = 0;
                            }
                            obj.list[game].info.my = _tmp_info;
                        }
                        if( !uRank ){
                            let _tmp_info = {
                                rank: '-',
                            };
                            let userAmount = await Payment.findAll({
                                attributes: [[Sequelize.fn('SUM', Sequelize.col('exchanged_amount')), 'sum_amount']],
                                where: {
                                    usersid: uid,
                                    package_name: game
                                }
                            });
                            if(userAmount[0]['dataValues']['sum_amount']){
                                _tmp_info.amount = Number(userAmount[0]['dataValues']['sum_amount']);
                            } else {
                                _tmp_info.amount = 0;
                            }
                            obj.list[game].info.user = _tmp_info;
                        }
                    }
                }

                ret.rank = obj;
                resolve(ret);
                res.json(success(ret, null));
            });

        });
    }
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

    if (game_list.length > skip+limit) {
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


module.exports = router;
