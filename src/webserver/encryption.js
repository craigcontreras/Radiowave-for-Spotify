import crypto from "crypto-js";

const key = generateRandString(64);

function encrypt(text) {
    const words = crypto.enc.Utf8.parse(text); //parse into utf-8 data
    const encoded = crypto.enc.Base64.stringify(words); //first encrypt into base64
    const encrypted = crypto.AES.encrypt(encoded, key).toString(); //then encrypt using aes-256
    return encrypted;
}

function decrypt(text) {
    const data = crypto.AES.decrypt(text, key).toString(crypto.enc.Utf8); //decrypt from aes-256 and make format into utf-8
    const base64decoded = crypto.enc.Base64.parse(data); //now you have base64, and parse that base64
    const decoded = crypto.enc.Utf8.stringify(base64decoded); //turn it back into a readable string
    return decoded;
}

function generateRandString(length) {
    let result = "";
    let characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrztuvwxyz1234567890";
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
}

const config = {
    encrypt,
    decrypt,
    generateRandString,
};

export default config;