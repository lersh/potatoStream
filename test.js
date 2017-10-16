'use strict'
const net = require('net');
const crypto = require('crypto');
const binary = require('binary');
const domain = require('domain');
const stream = require('stream');
const fs = require('fs');

const password = '123qweASD';

const rs = fs.createReadStream('./test.png');
const ws = fs.createWriteStream('./test_Deciphered.png');
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

/**
 * Decrypts text by given key
 * @param Buffer base64 encoded input data
 * @param String masterkey
 * @returns Buffer decrypted (original) text
 */
function decipherGCM(data, masterkey) {

    var bData = data;

    // convert data to buffers
    var salt = bData.slice(0, 64);
    var iv = bData.slice(64, 76);
    var tag = bData.slice(76, 92);
    var buff = bData.slice(92);
    try {
        // derive key using; 32 byte key length
        var key = crypto.pbkdf2Sync(new Buffer(masterkey), salt, 2145, 32, 'sha512');

        // AES 256 GCM Mode
        var decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
        decipher.setAuthTag(tag);

        // encrypt the given buffer
        var decrypted = Buffer.concat([decipher.update(buff), decipher.final()]);

        return decrypted;

    } catch (e) {
    }

    // error
    return null;
}



var c = 0, i = 1;
var _isRemain = false;//有没有遗留数据
var _remainBuff = new Buffer(0);//上次遗留的数据


const Encodetransform = stream.Transform({
    highWaterMark: 2,
    transform: function (buf, enc, next) {
        console.log('transform', buf.length);
        var encode_buff = encipherGCM(buf, password);
        var buff_len = new Buffer(4);
        buff_len.writeUInt32BE(encode_buff.length);
        var encode_buff = Buffer.concat([buff_len, encode_buff]);
        next(null, encode_buff)
    }
})

const Decodetransform = stream.Transform({
    highWaterMark: 2,
    transform: function (buf, enc, next) {
        var self = this;
        var currectBuffer;
        console.log(buf.length);
        if (!_isRemain) {//如果没有待处理数据
            currectBuffer = buf;
        }
        else {//如果有待处理数据
            _remainBuff = Buffer.concat([_remainBuff, buf]);//将待处理数据和这次的数据拼接
            currectBuffer = _remainBuff;
        }
        while (currectBuffer.length > 0) {
            var buff_len = currectBuffer.slice(0, 4);
            var len = buff_len.readUInt32BE(0);
            if (currectBuffer.length < len + 4) {//如果当前数据块不完整
                _isRemain = true;
                _remainBuff = currectBuffer;//将这部分数据存入待处理数据
                currectBuffer = new Buffer(0);
            }
            else {
                var data = currectBuffer.slice(4, len + 4);//取出一块数据,slice第二个参数是索引值
                var decrypted_data = decipherGCM(data, password);//解密
                this.push(decrypted_data);//push出去
                var next_data = currectBuffer.slice(len + 4);//获取剩下的数据
                currectBuffer = next_data;
            }
        }
        next();
    }
})

const transform = stream.Transform({
    highWaterMark: 2,
    transform: function (buf, enc, next) {
        console.log(i++, 'get', buf.length);
        next(null, buf)
    }
})

const Transform = stream.Transform;
class DecryptStream extends Transform {
    constructor() {
        super();
        this._isRemain = false;//有没有遗留数据
        this._remainBuff = new Buffer(0);//上次遗留的数据
    }

    _transform(buf, enc, next) {
        var self = this;
        var currectBuffer;
        console.log(buf.length);
        if (!this._isRemain) {//如果没有待处理数据
            currectBuffer = buf;
        }
        else {//如果有待处理数据
            this._remainBuff = Buffer.concat([this._remainBuff, buf]);//将待处理数据和这次的数据拼接
            currectBuffer = this._remainBuff;
        }
        while (currectBuffer.length > 0) {
            var buff_len = currectBuffer.slice(0, 4);
            var len = buff_len.readUInt32BE(0);
            if (currectBuffer.length < len + 4) {//如果当前数据块不完整
                this._isRemain = true;
                this._remainBuff = currectBuffer;//将这部分数据存入待处理数据
                currectBuffer = new Buffer(0);
            }
            else {
                var data = currectBuffer.slice(4, len + 4);//取出一块数据,slice第二个参数是索引值
                var decrypted_data = decipherGCM(data, password);//解密
                this.push(decrypted_data);//push出去
                var next_data = currectBuffer.slice(len + 4);//获取剩下的数据
                currectBuffer = next_data;
            }
        }
        next();
    }
}
/*
net.connect(6000, 'pi.71star.com', function () {
    var server = this;
    var decryptStream=new DecryptStream();
    server.pipe(decryptStream).pipe(ws);
});*/

rs.pipe(Encodetransform).pipe(ws);