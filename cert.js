var exec = require('child_process').exec;
var config = require('./config.json');

var password = config.password;
var certDir = './cert_test/';
var keyStr = `openssl genrsa -aes256 -passout pass:${password} -out ${certDir}ca.key 2048`;

console.log(keyStr);

exec(keyStr, (error, stdout, stderr) => {
    if (error) {
        console.log(stderr);

    } else {

    }
});