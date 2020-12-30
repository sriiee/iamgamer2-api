const createError = require('http-errors');
const {Users} = require("../model/users");
const moment = require("moment");
// let {matchPassURL} = require('../lib/url');


module.exports = async function Pretreatment(req, res, next) {
    try {
        let devUser = req.header("X-dev-user-white-ip");
        let user = req.header("X-UID")


        if (typeof devUser !== "undefined") {
            let ip = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
            console.log(ip);
            if (
                ip === "::1" ||
                ip === "127.0.0.1" ||
                ip === "106.241.27.67" ||
                ip === "58.148.73.156" ||
                ip === "121.124.52.74"
            ) {
                user = devUser;
            } else {

                return res.sendStatus(403);
            }
        }

        if (typeof user !== "undefined") {
		console.log("@@");
            let userinfo = await Users.findOne({
                where: {
                    uid: user,
                    status: 1
                },
		    raw: true
            });
            console.log(userinfo);
            if(userinfo === null) {
                return res.sendStatus(401);
            }
            req.userInfo = userinfo;
            req.usersid = userinfo.id;
        }

        next();
    } catch (e) {
        console.error(e);
        return res.sendStatus(500);
    }

};

