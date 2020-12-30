const axios = require("axios");
require("dotenv").config();
const fs = require("fs");

const accessKey = process.env.FIXER_ACCESS_KEY;

const exec = () => {
    axios.get("http://data.fixer.io/api/latest?access_key=" + accessKey).then(res => {
        console.log(res);
        if (res.data.success === true) {
            console.log(res.data);
            fs.writeFileSync("../currency.json", JSON.stringify(res.data.rates));
        }


    })
}

// exec();
module.exec = exec;
