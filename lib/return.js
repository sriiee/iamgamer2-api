let template = {
    result: null,
    code: null,
    msg: null
}


/**
 * @param {any} data
 * @param {string | null} msg
 */
const success = (data, msg) =>  {
    template.data = data;
    template.result = "success";
    template.code = 200;
    template.msg = msg;
    return template;
}

/**
 * @param {int} code
 * @param {any} data
 * @param {string} msg
 */
const error = (code, data, msg) => {
    template.msg = msg;
    template.result = "error";
    template.code = code;
    template.data = data;
    return template;
}

exports.success = success;
exports.error = error;
