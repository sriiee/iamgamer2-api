const express = require('express');
const router = express.Router();
const {Users, UsersExtension} = require("../model/users");
const {Payment} = require("../model/payment");
const {PlayTime} = require("../model/playtime");
const {success, error} = require("../lib/return");
const moment = require("moment");
const validator = require("validator");

const authFirebaseadmin = require("firebase-admin");
const serviceAccount = require("../firebase_credentials");
const createError = require("http-errors");


authFirebaseadmin.initializeApp({
    credential: authFirebaseadmin.credential.cert(serviceAccount),
    databaseURL: "https://igm2-faf72.firebaseio.com"
});

let nicknameCheck = async (nickname) => {
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

router.post("/nickname_check", async (req, res, next) => {

    let body = req.body;
    console.log(body);
    if(!body.hasOwnProperty("nickname")) {
        return res.sendStatus(401);
    }

    let nickname = body.nickname;
    switch (await nicknameCheck(nickname)) {
        case "length": res.json(error(401, {msg: "length"}, "nickname length check")); break;
        case "rule": res.json(error(401, {msg: "rule"}, "nickname rule check")); break;
        case "exists": res.json(error(604, {msg: "exists"}, "nickname already exists")); break;
        case true: res.json(success({success: true}, "")); break;
        default: res.sendStatus(500); break;
    }

})

router.post("/:type(re_signup|signup)", async (req, res, next) => {
    let body = req.body;

    if(
        !body.hasOwnProperty("fid") ||
        !body.hasOwnProperty("id_token") ||
        !body.hasOwnProperty("email") ||
        !body.hasOwnProperty("nickname") ||
        !body.hasOwnProperty("gender") ||
        !body.hasOwnProperty("birth_year") ||
        !body.hasOwnProperty("push_token") ||
        !body.hasOwnProperty("adid")
    ) {
        return res.sendStatus(400);
    }

    // user check

    let user_check = await Users.findOne({
        where: {
            uid: body.fid
        },
        raw: true
    });

    if(user_check !== null) {
        // if(user_check['status'] === 0 && req.path === "/signup") {
        //     res.json(error(601, {withdraw: true}, "withdraw user"));
        //     return;
        // } else
        if(user_check['status'] === 1) {
            res.json(error(602, {exists: true}, "exists user"));
            return;
        }
        // else {
        //     res.json(error(500, {}, ""));
        //     return;
        // }
    }

    // nickname check
    let nickname = body.nickname;
    switch (await nicknameCheck(nickname)) {
        case "length": res.json(error(400, {msg: "length"}, "nickname length check")); return; break;
        case "rule": res.json(error(400, {msg: "rule"}, "nickname rule check")); return; break;
        case "exists": res.json(error(604, {msg: "exists"}, "nickname already exists"));return; break;
        case true: break;
        default: res.sendStatus(500); return; break;
    }

    // email check
    if(!validator.isEmail(body.email)) {
        res.json(error(400, {msg: "email check"}, "email check"));
        return;
    }

    let token_res = await authFirebaseadmin.auth().verifyIdToken(body.id_token).catch(e => {
        console.error(e);
        res.json(error(400, {msg: "token expired", detail: e.message}, "token expired"));
        createError(400);
        return;
    });

    if(token_res["user_id"] !== body.fid) {
        res.json(error(400, {msg: "fid check"}, "fid check"));
        return;
    }

    if(token_res['email'] !== body.email) {
        res.json(error(400, {msg: "email check token"}, "email check token"));
        return;
    }
    /*
        {
            "name":"Jihoon Bae",
            "picture":"https://lh3.googleusercontent.com/a-/AOh14GhsHzTDJGdcWu64GyWXapDP1mdC0gMnPsWqXXl7o4c",
            "iss":"https://securetoken.google.com/igm2-faf72",
            "aud":"igm2-faf72",
            "auth_time":1598930603,
            "user_id":"eGZLgASvcvXBYJzFp9DeRn1sFgH2",
            "sub":"eGZLgASvcvXBYJzFp9DeRn1sFgH2",
            "iat":1598930603,
            "exp":1598934203,
            "email":"blythe2586@gmail.com",
            "email_verified":true,
            "firebase":{
                "identities":{
                    "google.com":[
                        "107169397331458396083"
                    ],
                    "email":[
                        "blythe2586@gmail.com"
                    ]
                },
                "sign_in_provider":"google.com"
            },
            "uid":"eGZLgASvcvXBYJzFp9DeRn1sFgH2"
        }

     */

    let data = {
        uid: token_res['user_id'],
        email: body.email,
        auth_source: token_res['firebase']['sign_in_provider'],
        auth_info: JSON.stringify(token_res),
        auth_token: body.id_token,
        adid: body.adid,
        nickname: body.nickname,
        profile_privacy_level: 0,
        gender: body.gender,
        birth_year: body.birth_year,
        status: 1,
        signup_datetime: new Date(),
        push_token: body.push_token,
        profile_image_url: token_res['picture'],
        push_level: 0
    }

    // console.log(user_check['id'])

    if(req.path === "/re_signup") {
        data['update_datetime'] = new Date()
        Users.update(
            data,
            {
                where: {
                id: user_check['id']
            }}
        );
    } else if(req.path === "/signup") {
        data['regist_datetime'] = new Date()
        Users.create(data).then(d => {
            let ret = {
                id: d.id,
                email: data.email,
                uid: data.uid,
                nickname: data.nickname,
                profile_image_url: data.profile_image_url,
                profile_image_key: "google",
                birth_year: parseInt(data.birth_year),
                gender: data.gender,
                profile_privacy_level: data.profile_privacy_level,
                push_level: data.push_level
            }


            // attributes: ["id", "email", "uid", "nickname", "profile_image_url", "birth_year", "gender", "profile_privacy_level", 'push_level']
            res.json(success(ret, ""));
            UsersExtension.create({
                usersid: d.id, total_amount: 0
            })
        });
    }



})


router.post("/signin", async (req, res, next) => {
    let body = req.body;

    if(
        !body.hasOwnProperty("fid") ||
        !body.hasOwnProperty("id_token") ||
        !body.hasOwnProperty("email")
    ) {
        return res.sendStatus(400);
    }


    let token_res = await authFirebaseadmin.auth().verifyIdToken(body.id_token).catch(e => {
        console.error(e);
        res.json(error(400, {msg: "token expired", detail: e.message}, "token expired"));
        createError(400);
        return;
    });

    if(token_res["user_id"] !== body.fid) {
        res.json(error(400, {msg: "fid check"}, "fid check"));
        return;
    }

    if(token_res['email'] !== body.email) {
        res.json(error(400, {msg: "email check token"}, "email check token"));
        return;
    }

    let user_check = await Users.findOne({
        where: {
            uid: body.fid,
	    status: 1
        },
        raw: true,
        attributes: ["id", "email", "uid", "nickname", "profile_image_url", "birth_year", "gender", "profile_privacy_level", 'push_level']

    });

    if(user_check === null) {
        return res.json(error(603, {exists: false}, "user exists not"));
    }

    return res.json(success(user_check, ""));

})

router.post("/signout", async (req, res, next) => {
    let body = req.body;

    // if(
    //     !body.hasOwnProperty("fid")
    // ) {
    //     return res.sendStatus(400);
    // }

    let usersid = req.usersid;
	console.log(usersid);
    let user_check = await Users.findOne({
        where: {
            id: usersid,
            status: 1
        },
        raw: true,
        attributes: ["id", "email", "uid", "nickname", "profile_image_url", "birth_year", "gender", "profile_privacy_level", 'push_level']

    });

	console.log(user_check);
    if(user_check === null) {
        return res.json(error(603, {exists: false}, "user exists not"));
    }

    return res.json(success({success: true}, ""));

})
router.post("/withdrawal", async (req, res, next) => {
    let body = req.body;

    // if(
    //     !body.hasOwnProperty("fid")
    // ) {
    //     return res.sendStatus(400);
    // }
    let usersid = req.usersid;

    let user_check = await Users.findOne({
        where: {
            id: usersid,
            status: 1
        },
        raw: true
    });

    if(user_check === null) {
        return res.json(error(603, {exists: false}, "user exists not"));
    }


    let payment = Payment.update({
        status: 0
    }, {
        where: {
            usersid: user_check['id']
        }
    });


    let playtime = PlayTime.update({
        status: 0
    }, {
        where: {
            usersid: user_check['id']
        }
    });

    let users = Users.update({
        status: 0
    }, {
        where: {
            id: user_check['id']
        }
    });

    Promise.all([payment, playtime, users]).then(res => {
        console.log(res);
    });


    return res.json(success(null, ""));
})




module.exports = router;
