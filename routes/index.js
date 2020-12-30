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

router.post("/last_utime", (req, res, next) => {
  let body = req.body;
  let uid = body.uid;


  let ret = {

  }

  res.json(success(ret, ""));
});


module.exports = router;
