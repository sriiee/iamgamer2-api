const fs = require("fs");
const {Users} = require("../model/users");
const {PlayTime, Sequelize} = require("../model/playtime");

const moment = require("moment");

const exec = async () => {

    let data = fs.readFileSync("./playtime.csv", {encoding: "utf8", flag: 'r'});
    let rows = data.split("\n");

    for(let idx = 1; idx < rows.length - 1; idx++) {
        let usersid = await Users.findOne({ order: Sequelize.literal('rand()'), limit: 1 });
        let row = rows[idx].split(",");
        if( row.length === 0 ) {
            continue;
        }

        let package_name = row[2];
        let request_id = row[3];
        let play_time = row[4];

        // 1596240000 => 2020년 8월 1일 토요일 오전 9:00:00
        // + 0 ~ 38888000
        let start_datetime = moment.unix(1596240000+getRandomInt(0,38888000));
        let end_datetime = moment(start_datetime).unix() + Number(play_time);
        end_datetime = moment.unix(end_datetime);

        // 1600148800 => 2020년 9월 15일 화요일 오후 2:46:40
        if( moment(end_datetime).unix() > 1600148800 ){
            start_datetime = moment(start_datetime).add(-2, 'days');
            end_datetime = moment(start_datetime).unix() + Number(play_time);
            end_datetime = moment.unix(end_datetime);
        }

        let report_date = Number(moment(start_datetime).format('YYYYMMDD'));



        PlayTime.create({
            usersid: usersid.id,
            package_name: package_name,
            request_id: request_id,
            play_time: play_time,
            report_date: report_date,
            start_datetime: start_datetime,
            end_datetime: end_datetime,
            status: 1,
            regist_datetime: new Date(),
            update_datetime: null
        }).catch(e => {
            console.error(e);
        })


    }
};

exec();

function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    // console.log(Math.floor(Math.random() * (max - min)) + min);
    return Math.floor(Math.random() * (max - min)) + min; //최댓값은 제외, 최솟값은 포함
}
