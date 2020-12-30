const ratio = require("../currency.json")

/**
 * @param {number} amount
 * @param {string} currency
 */
const getCurrencyRatio = (amount, currency) => {
    // BASE EUR

    if(currency === "KRW") {
        return Math.floor(amount);
    }

    // 1USD (1.00 * ratio['KRW'] * ratio[currency])

    return Math.floor(amount / ratio[currency] * ratio['KRW']);
}

const getCurrencyRatioByYou = (amount, currency, ext_currency) => {
    return Math.floor(amount / ratio[currency] * ratio[ext_currency]);
}
exports.getCurrencyRatio = getCurrencyRatio;
exports.getCurrencyRatioByYou = getCurrencyRatioByYou;

