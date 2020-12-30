const fs = require("fs");
const path = require("path");
const dire = "./log";
const mkdirp = require("mkdirp");
fs.readdir(dire, (err, files) => {
    files.forEach(file => {
        console.log(path.parse(file).name);
        let name = path.parse(file).name;

        let date = parse(name);
        console.log(date);
        mkdirp.sync(`./logs/${date['year']}/${date['month']}/${date['day']}/`);
        fs.copyFileSync(`./log/${file}`, `./logs/${date['year']}/${date['month']}/${date['day']}/${file}`);

        // console.log(file);
    });
});


function parse(str) {
    let y = str.substr(0,4),
        m = str.substr(4,2) - 1,
        d = str.substr(6,2);
    let D = new Date(y,m,d);

    return (D.getFullYear() == y && D.getMonth() == m && D.getDate() == d) ? {year: y, month: m+1, day: d} : 'invalid date';
}

