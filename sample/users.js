const fs = require("fs");
const {Users} = require("../model/users");
const exec = async () => {
    let data = fs.readFileSync("./users.csv", {encoding: "utf8", flag: 'r'});
    // console.log(data);
    let rows = data.split("\n");
    for(let idx = 1; idx < rows.length; idx++) {
        let row = rows[idx].split(";");
        if(idx === 0 || row.length === 0) {
            continue;
        }

        let email = row[1];
        console.log(email);
        if(email === "NULL") {
            continue;
        }
        let uid = row[0];

        Users.create({
            email: email,
            uid: uid,
            status: 1,
            regist_datetime: new Date()
        })


    }


}


exec();
