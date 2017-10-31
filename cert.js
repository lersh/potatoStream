const util = require('util');
const exec = util.promisify(require('child_process').exec);
const config = require('./config.json');

var password = config.password;
var fakeHost = config.camouflage;
var certDir = './cert_test/';
var caKeyStr = `openssl genrsa -aes256 -passout pass:${password} -out ${certDir}ca.key 2048`;
var caCsrStr = `openssl req -new -passin pass:${password} -key ${certDir}ca.key -out ${certDir}ca.csr -subj "/C=US/O=VeriSign, Inc./OU=VeriSign Trust Network/OU=(c) 2006 VeriSign, Inc. - For authorized use only/CN=VeriSign Class 3 Public Primary Certification Authority - G5"`;

console.log(caCsrStr);

(async () => {
    const { stdout, stderr } = await exec(caCsrStr);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
})();