'use strict';
const net = require('net');
const crypto = require('crypto');
const stream = require('stream');
const through2 = require('through2');

const password = '123qweASD';

var i = 1;

/**
 * Encrypts text by given key
 * @param Buffer text to encrypt
 * @param String masterkey
 * @returns String encrypted text, base64 encoded
 */
function encipherGCM(buff, masterkey) {
    try {
        // random initialization vector
        var iv = crypto.randomBytes(12);

        // random salt
        var salt = crypto.randomBytes(64);

        // derive key: 32 byte key length - in assumption the masterkey is a cryptographic and NOT a password there is no need for
        // a large number of iterations. It may can replaced by HKDF
        var key = crypto.pbkdf2Sync(new Buffer(masterkey), salt, 2145, 32, 'sha512');

        // AES 256 GCM Mode
        var cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        // encrypt the given buffer
        var encrypted = Buffer.concat([cipher.update(buff), cipher.final()]);

        // extract the auth tag
        var tag = cipher.getAuthTag();

        // generate output
        return Buffer.concat([salt, iv, tag, encrypted]);

    } catch (e) {
    }

    // error
    return null;
}


const Transform = stream.Transform;
class Encodetransform extends Transform {
    constructor() {
        super();
    }
    _transform(buf, enc, next) {
        var encode_buff = encipherGCM(buf, password);
        var buff_len = new Buffer(4);
        buff_len.writeUInt32BE(encode_buff.length);
        var encode_buff_head = Buffer.concat([buff_len, encode_buff]);
        var md5 = crypto.createHash('md5');
        var md5_code = md5.update(buf).digest('hex');
        console.log(i++, 'buf', buf.length, 'encode_buff_head', encode_buff_head.length, 'md5', md5_code);
        next(null, encode_buff_head);
    }

}


var server = net.createServer((clientSocket) => {
    i = 1;
    var rs = require('fs').createReadStream('./test.png')
    //var encode = new Encodetransform()
    rs.pipe(through2(function (chunk, enc, callback) {
        var encode_buff = encipherGCM(chunk, password);
        var buff_len = new Buffer(4);
        buff_len.writeUInt32BE(encode_buff.length);
        var encode_buff_head = Buffer.concat([buff_len, encode_buff]);
        var md5 = crypto.createHash('md5');
        var md5_code = md5.update(chunk).digest('hex');
        console.log(i++, 'chunk', chunk.length, 'encode_buff_head', encode_buff_head.length, 'md5', md5_code);
        this.push(encode_buff_head);
        callback();
    })).pipe(clientSocket);
});


server.listen(6000, '0.0.0.0', () => {
    console.log('Listening on 6000...');
});

/*
var rs = require('fs').createReadStream('./test.jpg');
var ws = require('fs').createWriteStream('./test1.jpg');
rs.pipe(Encodetransform).pipe(ws);
*/

process.on('uncaughtException', function (err) {
    console.log("捕获未处理的错误: " + err.message);
    console.log(err);
});