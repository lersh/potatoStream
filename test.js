'use strict'
const net = require('net');
const crypto = require('crypto');
const stream = require('stream');
const fs = require('fs');
const through2 = require('through2');

const password = '123qweASD';

const ws = fs.createWriteStream('./test_Deciphered.png');

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


var i = 1;

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
        //console.log('收到的buf长度 %d', buf.length);
        if (!this._isRemain) {//如果没有待处理数据
            currectBuffer = buf;
            //console.log('没有遗留数据');
        }
        else {//如果有待处理数据
            this._remainBuff = Buffer.concat([this._remainBuff, buf]);//将待处理数据和这次的数据拼接
            currectBuffer = this._remainBuff;
            //console.log('有上次遗留的数据，合并后数据大小 %d', currectBuffer.length);
        }
        while (currectBuffer.length > 0) {
            //console.log('当前待处理的块大小 %d', currectBuffer.length);
            var buff_len = currectBuffer.slice(0, 4);
            var len = buff_len.readUInt32BE(0);

            if (currectBuffer.length < len + 4) {//如果当前数据块不完整
                //console.log('当前数据块不完整，至少应该大于%d \r\n', len + 4);
                this._isRemain = true;
                this._remainBuff = currectBuffer;//将这部分数据存入待处理数据
                currectBuffer = new Buffer(0);
            }
            else {
                //console.log('当前数据块已经大于等于一个完整块');
                var data = currectBuffer.slice(4, len + 4);//取出一块数据,slice第二个参数是索引值
                var decrypted_data = decipherGCM(data, password);//解密
                if (decrypted_data === null)
                    console.log('Decrypto Error!');
                var md5 = crypto.createHash('md5');
                var md5_code = md5.update(decrypted_data).digest('hex');
                console.log('%d 解密后数据大小 %d md5 %s', i++, decrypted_data.length, md5_code);

                var next_data = currectBuffer.slice(len + 4);//获取剩下的数据
                //console.log('剩下的数据大小 %d \r\n', next_data.length);
                if (next_data.length === 0) {
                    this._isRemain = false;//没有遗留数据
                    this._remainBuff = new Buffer(0);//上次遗留的数据清0
                    console.log('剩下的数据大小 %d \r\n', next_data.length);
                }
                currectBuffer = next_data;
                this.push(decrypted_data);//push出去

            }
        }
        next();
    }
}



net.connect(6000, '127.0.0.1', function () {
    var server = this;
    var decode = new DecryptStream();
    server.pipe(decode).pipe(ws);
});

//rs.pipe(Encodetransform).pipe(ws);