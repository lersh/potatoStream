const util = require('util');
const exec = util.promisify(require('child_process').exec);
const config = require('./config.json');

var password = config.password;
var camouflage = config.camouflage;
var certDir = './cert_test/';
var caKeyStr = `openssl genrsa -aes256 -passout pass:${password} -out ${certDir}ca.key 2048`;
var caCsrStr = `openssl req -new -passin pass:${password} -key ${certDir}ca.key -out ${certDir}ca.csr -subj "/C=US/O=VeriSign, Inc./OU=VeriSign Trust Network/OU=(c) 2006 VeriSign, Inc. - For authorized use only/CN=VeriSign Class 3 Public Primary Certification Authority - G5"`;
var caCertStr = `openssl x509 -req -days 3650 -in ${certDir}ca.csr -signkey ${certDir}ca.key -passin pass:${password} -out ${certDir}ca.crt`;

var serverKeyStr = `openssl genrsa -aes256 -passout pass:${password} -out ${certDir}server.key 2048`;
var serverCsrStr = `openssl req -new -passin pass:${password} -key ${certDir}server.key -out ${certDir}server.csr -subj "${camouflage}"`;
var serverCertStr = `openssl x509 -req -days 3650 -sha256 -extensions v3_req -CA ${certDir}ca.crt -CAkey ${certDir}ca.key -CAserial ${certDir}ca.srl -CAcreateserial -passin pass:${password} -in ${certDir}server.csr -out ${certDir}server.crt`;

console.log(serverCsrStr);

(async () => {
    const { error, stdout, stderr } = await exec(caCertStr);
    console.log('error:', error);
    console.log('stdout:', stdout);
    console.log('stderr:', stderr);
})();