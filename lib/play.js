const moment = require('moment');

const {Payment, Sequelize} = require("../model/payment");
const {PlayTime} = require("../model/playtime");
const Op = Sequelize.Op;
const {getInfofromDynamo} = require("../lib/getInfo");



const toObject = (arr) => {
    return arr.reduce(function(acc, cur, i) {
        let package_name = Object.keys(cur)[0];
        acc[package_name] = cur[package_name];
        return acc;
    }, {});
};

const timeForToday = (t) => {
    let today = moment();
    t = moment(t);
    let day = moment.duration(today.diff(t)).days(),
        hour = moment.duration(today.diff(t)).hours(),
        minute = moment.duration(today.diff(t)).minutes();
    let difftime = moment.duration(today.diff(t)).asMinutes();
    let dtime = timeToString(difftime, 'm');
    return dtime;
};

const timeToString = (time, opt) => {
    let t_str = '';
    if( opt === 'm' ){
        ////////// 현재시간 기준 n분전
        if (time < 60) {
            if( time === 0 ){
                t_str = `1분전`
            } else {
                t_str = `${time}분전`
            }
        } else if (time >= 60 && time < 1440) {
            let hour = Math.floor(time / 60),
                minute = Math.floor(time % 60);
            if( minute === 0 ){
                t_str = `${hour}시간전`;
            } else {
                t_str = `${hour}시간 ${minute}분전`;
            }
        } else {
            let day = Math.floor(time / 1440),
                hour = Math.floor((time % 1440) / 60),
                minute = Math.floor((time % 1440) % 60);
            t_str = `${day}일 ${hour}시간 ${minute}분전`;
        }
    } else if( opt === 's' ){
        ////////// 초 -> 분 계산
        let m = Math.round(time/60);
        if( m < 60 ){
            if( m === 0 ){
                t_str = `1분`
            } else {
                t_str = `${m}분`
            }
        } else if (m >= 60 && m < 1440) {
            let hour = Math.round(m / 60),
                minute = m % 60;
            if( hour === 24 ){
                if( minute === 0 ){
                    t_str = `1일`;
                } else {
                    t_str = `1일 ${minute}분`;
                }
            } else {
                if( minute === 0 ){
                    t_str = `${hour}시간`;
                } else {
                    t_str = `${hour}시간 ${minute}분`;
                }
            }

        } else {
            let day = Math.round(m / 1440),
                hour = Math.round((m % 1440) / 60),
                minute = (m % 1440) % 60;
            t_str = `${day}일 ${hour}시간 ${minute}분`;
        }
    }


    return t_str;
};

const getTodayPlay = async (uid) => {
    let startdate = `${moment().startOf('day').format("YYYY-MM-DD")}`,
        enddate = `${moment().endOf('day').add(1, 'days').format("YYYY-MM-DD")}`;
    // console.log(startdate, enddate);

    return new Promise((resolve, reject) => {
        PlayTime.findOne({
            attributes: [[Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']],
            where: {
                usersid: uid,
                end_datetime: {[Op.gte]: startdate, [Op.lt]: enddate}
            },
            raw: true
        }).then(total => {
            resolve(parseInt(total.playtime));
        }).catch(e => {
            console.error(e);
            reject()
        })
    });
};

const getPlayTotal = async (uid) => {
    return new Promise((resolve, reject) => {
        PlayTime.findOne({
            attributes: [[Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']],
            where: {
                usersid: uid
            },
            raw: true
        }).then(total => {
            resolve(parseInt(total.playtime));
        }).catch(e => {
            console.error(e);
            reject()
        })
    });
};

const getTodayGames = async (uid, limit=4) => {
    let startdate = `${moment().startOf('day').format("YYYY-MM-DD")}`,
        enddate = `${moment().endOf('day').add(1, 'days').format("YYYY-MM-DD")}`;

    return new Promise((resolve, reject)=>{
        PlayTime.findAll({
            attributes: ['package_name', 'end_datetime', [Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']],
            where: {
                usersid: uid,
                end_datetime: {[Op.gte]: startdate, [Op.lt]: enddate}
            },
            group: ['package_name'],
            order: [['end_datetime','DESC']],
            limit: limit,
            raw: true
        }).then(async rows => {
            let raw_package_list = [];
            for(let idx = 0; idx < rows.length; idx++) {
                let target = rows[idx];
                if (!raw_package_list.hasOwnProperty(target.package_name)) {
                    raw_package_list.push(target.package_name);
                }
            }
            raw_package_list = Array.from(new Set(raw_package_list));
            let _tmp_pinfo = getInfofromDynamo(raw_package_list);
            let pinfo = {};
            Promise.all(_tmp_pinfo).then(result => {
                for (let idx = 0; idx < Object.keys(result).length; idx++) {
                    let package_name = Object.getOwnPropertyNames(result[idx])[0];
                    if (result[idx][package_name] === null) {
                        continue;
                    }
                    let _tmp = {
                        package_name: result[idx][package_name].package_name,
                        title: result[idx][package_name].title,
                        icon: result[idx][package_name].icon,
                        playtime: timeToString(rows[idx].playtime,'s'),
                        time: timeForToday(rows[idx].end_datetime),
                    };
                    pinfo[package_name] = _tmp;
                }
                resolve(pinfo);
            });
        }).catch(e => {
            console.error(e);
            reject()
        })
    });
};

const getPlayGraph = async (uid, type) => {
    console.log('####### Graph type ########', type);
    let ret = {};
    let startdate = `${moment().startOf('day').format("YYYY-MM-DD")}`,
        enddate = `${moment().endOf('day').add(1, 'days').format("YYYY-MM-DD")}`,
        weekStart = `${moment().endOf('day').add(-6, 'days').format("YYYY-MM-DD")}`,
        weekEnd = `${moment().endOf('day').add(1, 'days').format("YYYY-MM-DD")}`,
        monthStart = `${moment().startOf('month').add(-3, 'month').format("YYYY-MM")}`,
        monthEnd = `${moment().startOf('month').add(1, 'month').format("YYYY-MM")}`;

    let all_where = {
        usersid: uid
    };
    let where = {
        usersid: uid
    };
    let attributes;
    if( type === 'h' ){
        /////// 시간별(오늘 기준)
        all_where.end_datetime = {[Op.gte]: startdate, [Op.lt]: enddate};
        where.end_datetime = {[Op.gte]: startdate, [Op.lt]: enddate};
        attributes = [Sequelize.fn("DATE_FORMAT", Sequelize.col('end_datetime'), '%Y-%m-%d %H'), 'playhour'];
    } else if ( type === 'd' ){
        /////// 일별(일주일)
        all_where.end_datetime = {[Op.gte]: weekStart, [Op.lt]: weekEnd};
        where.end_datetime = {[Op.gte]: weekStart, [Op.lt]: weekEnd};
        attributes = [Sequelize.fn("DATE_FORMAT", Sequelize.col('end_datetime'), '%Y-%m-%d'), 'playhour'];
    } else {
        /////// 월별()
        all_where.end_datetime = {[Op.gte]: monthStart, [Op.lt]: monthEnd};
        where.end_datetime = {[Op.gte]: monthStart, [Op.lt]: monthEnd};
        attributes = [Sequelize.fn("DATE_FORMAT", Sequelize.col('end_datetime'), '%Y-%m'), 'playhour'];
    }

    await PlayTime.findOne({
        attributes: [[Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']],
        where: all_where,
        raw: true
    }).then(async total => {
        if( type !== 'm' && total.playtime ){
            ret.total_time = timeToString(parseInt(total.playtime), 's');
        } else if( type !== 'm' && !total.playtime ){
            ret.total_time = total.playtime;
        }
    }).catch(e => {
        console.error(e);
    });

    return new Promise((resolve, reject) => {
        PlayTime.findAll({
            attributes: [
                attributes,
                [Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']
            ],
            where: where,
            group: 'playhour',
            order: [['end_datetime', 'DESC']],
            raw: true
        }).then(async rows => {

            let month = moment().startOf('month').format("YYYY-MM");
            rows.forEach(el => {
                if( type === 'h' ){
                    let hour = el['playhour'].split(' ');
                    el['time'] = hour[1];
                } else {
                    el['time'] = el['playhour'];
                }
                el['sum_time_sec'] = Number(el['playtime']);
                let minute = Math.round(el['playtime'] / 60);
                if (minute === 0) {
                    el['sum_time_minute'] = 1;
                } else {
                    el['sum_time_minute'] = minute;
                }
                delete el['playhour'];
                delete el['playtime'];

                if( type === 'm' ){
                    if( el['time'] === month ){
                        ret.total_time = timeToString(el['sum_time_sec'], 's');
                    }
                }
            });
            ret.data = rows;
            resolve(ret);
        }).catch(err => {
            console.error(err);
            reject(err);
        });
    });
};


const getPlayTop5 = async (uid, startdate, enddate) => {
    return new Promise((resolve, reject) => {
        PlayTime.findAll({
            where: {
                usersid: uid,
                end_datetime: {[Op.gte]: startdate, [Op.lt]: enddate}
            },
            group: ['package_name'],
            attributes: ['package_name', [Sequelize.fn('COUNT', Sequelize.col('package_name')), 'cnt'], [Sequelize.fn('SUM', Sequelize.col('play_time')), 'playtime']],
            order: [[Sequelize.fn('SUM', Sequelize.col('play_time')), 'DESC']],
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
                        sum_play: timeToString(parseInt(target["playtime"]), 's'),
                        title: result[target["package_name"]].title,
                        icon: result[target["package_name"]].icon
                    };
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

};

const getPlayGenre = async (uid, startdate, enddate) => {
    let ret = {};
    return new Promise((resolve, reject) => {
        PlayTime.findAll({
            where: {
                usersid: uid,
                end_datetime: {[Op.gte]: startdate, [Op.lt]: enddate}
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
                    if(!ret.hasOwnProperty(genre)) {
                        ret[genre] = {
                            sum_play_sec: 0
                        }
                    }
                    ret[genre].sum_play_sec += Math.floor(target.play_time);
                }

                let genre_list = Object.keys(ret);
                for(let idx = 0; idx < genre_list.length; idx++){
                    ret[genre_list[idx]].sum_play = timeToString(Number(ret[genre_list[idx]].sum_play_sec), 's');
                }
                resolve(ret);
            })
        }).catch(err => {
            console.error(err);
            reject();
        })
    })
};

const getPlayMonth = async (uid, startdate, enddate) => {
    let ret = {
        total_time: 0,
        week: {}
    };
    return new Promise((resolve, reject) => {
        PlayTime.findAll({
            attributes: ['package_name', 'play_time', 'start_datetime', [Sequelize.fn("DATE_FORMAT", Sequelize.col('start_datetime'), '%m.%d'), 'date']],
            where: {
                usersid: uid,
                start_datetime: {[Op.gte]: startdate, [Op.lt]: enddate}
            },
            order: [['start_datetime', 'DESC']],
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
                    let purchaseDate = moment(target.start_datetime);
                    let nthOfMoth = Math.ceil(purchaseDate.date() / 7);
                    if (!data.hasOwnProperty("week" + nthOfMoth)) {
                        data["week" + nthOfMoth] = [];
                        week.push("week" + nthOfMoth);
                    }

                    let _tmp = {
                        package_name: target.package_name,
                        title: pinfo[target.package_name].title,
                        icon: pinfo[target.package_name].icon,
                        playtime: timeToString(target.play_time, 's'),
                        date: target.date,
                    };

                    data["week" + nthOfMoth].push(_tmp);
                    ret.total_time += target.play_time;
                }

                for (let idx = 0; idx < week.length; idx++) {
                    ret.week[week[idx]] = data[week[idx]].reduce((h, obj) => {
                        h[obj.date] = (h[obj.date] || []).concat(obj);
                        return h;
                    }, {});
                }
                ret.total_time = timeToString(ret.total_time, 's');
                resolve(ret);
            })
        }).catch(err => {
            console.error(err);
            reject();
        })
    });
};

const getPlayAllGenre = async (args) => {
    let uid = args['uid'],
        genre = args['genre'],
        startdate = args['startdate'],
        enddate = args['enddate'];
    let ret = {
        info: {},
        data: {},
        genre: {
            all: 0
        },
    };

    return new Promise((resolve, reject) => {
        PlayTime.findAll({
            attributes: ['package_name', 'play_time', [Sequelize.fn("DATE_FORMAT", Sequelize.col('start_datetime'), '%m.%d'), 'date']],
            where: {
                usersid: uid,
                start_datetime: {[Op.gte]: startdate, [Op.lt]: enddate}
            },
            order: [['start_datetime', 'DESC']],
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

                let genre_list = [];
                for(let idx = 0; idx < rows.length; idx++) {
                    let target = rows[idx];
                    if(!pinfo.hasOwnProperty(target.package_name)) {
                        continue;
                    }
                    let r_genre = pinfo[target.package_name].genre;
                    if(!ret.genre.hasOwnProperty(genre)) {
                        ret.genre[genre] = 0;
                    }

                    if( r_genre === genre ){
                        ret.genre[genre] += target.play_time;

                        let item = {
                            package_name: pinfo[target.package_name].package_name,
                            title: pinfo[target.package_name].title,
                            icon: pinfo[target.package_name].icon,
                            playtime: timeToString(target.play_time, 's'),
                            date: target.date,
                        };
                        genre_list.push(item);
                    }
                    ret.genre['all'] += target.play_time;
                }

                ret['data'] = genre_list.reduce((h, obj)=> {
                    h[obj.date] = (h[obj.date] || []).concat(obj);
                    return h;
                }, {});

                ret.info.genre = genre;
                ret.info.playtime = timeToString(ret.genre[genre], 's');
                if( Object.keys(ret.data).length < 1 ){
                    ret.info.playtime = '0분';
                }
                ret.info.per =(ret.genre[genre]/ret.genre['all'])*100;
                if( ret.info.per > 0 && ret.info.per < 1 ){
                    ret.info.per = ret.info.per.toFixed(1);
                    ret.info.per = ret.info.per+'%';
                } else if( ret.info.per > 0 ){
                    ret.info.per = Math.round(ret.info.per);
                    ret.info.per = ret.info.per+'%';
                } else {
                    ret.info.per = '0%';
                }

                delete ret['genre'];
                resolve(ret);
            })

        }).catch(err => {
            console.error(err);
            reject();
        })
    });
};




exports.timeForToday = timeForToday;
exports.timeToString = timeToString;
exports.getTodayPlay = getTodayPlay;
exports.getPlayTotal = getPlayTotal;
exports.getTodayGames = getTodayGames;
exports.getPlayGraph = getPlayGraph;
exports.getPlayTop5 = getPlayTop5;
exports.getPlayGenre = getPlayGenre;
exports.getPlayMonth = getPlayMonth;
exports.getPlayAllGenre = getPlayAllGenre;