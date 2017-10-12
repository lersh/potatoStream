'use strict'
const Transform = require('stream').Transform;
const binary = require('binary');
const crypto = require('crypto');

var algorithm, password;

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
    try {
        var bData = data;

        // convert data to buffers
        var salt = bData.slice(0, 64);
        var iv = bData.slice(64, 76);
        var tag = bData.slice(76, 92);
        var buff = bData.slice(92);

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

function Potato(alg, passwd) {
    algorithm = alg;
    password = passwd;
}

//给Response流添加头部，
/*REP应答字段
    0x00 表示成功
    0x01 普通SOCKS服务器连接失败
    0x02 现有规则不允许连接
    0x03 网络不可达
    0x04 主机不可达
    0x05 连接被拒
    0x06 TTL超时
    0x07 不支持的命令
    0x08 不支持的地址类型
    0x09 - 0xFF未定义
*/
Potato.prototype.ReplyCode = {
    SUCCEEDED: 0x00,
    GENERAL_FAILURE: 0x01,
    CONNECTION_NOT_ALLOWED: 0x02,
    NETWORK_UNREACHABLE: 0x03,
    HOST_UNREACHABLE: 0x04,
    CONNECTION_REFUSED: 0x05,
    TTL_EXPIRED: 0x06,
    COMMAND_NOT_SUPPORTED: 0x07,
    ADDRESS_TYPE_NOT_SUPPORTED: 0x08
}


//请求连接的信令
Potato.prototype.SymbolRequest = {
    //创建信令
    Create: function (host, port) {
        var flag = new Buffer([0x86]);//标志位
        var addr_len = new Buffer(2);//需要连接的地址的域名的长度
        addr_len.writeUInt16BE(Buffer.byteLength(host, 'utf8'));//获取需要连接的地址的域名的长度
        var port_buf = new Buffer(2);//需要连接的端口
        port_buf.writeUInt16BE(port);//写入端口数字
        var timestamp_buf = new Buffer(8);//时间戳buffer，64位数字
        var timeNow = Date.now();//获取当前时间戳
        timestamp_buf.writeIntBE(timeNow, 0, 8);//将当前时间戳写入buffer
        var symbol = Buffer.concat([flag, addr_len, new Buffer(host, 'utf8'), port_buf, timestamp_buf]);//将这些buffer拼装成头部buffer

        //var aes = crypto.createCipher(algorithm, password);
        symbol = encipherGCM(symbol, password);//试试看用GCM算法 //aes.update(symbol);
        return symbol;
    },
    //解析信令
    Resolve: function (buff) {
        //var decipher = crypto.createDecipher(algorithm, password);
        buff = decipherGCM(buff, password);//试试看用GCM算法解码 //decipher.update(buff);
        if (buff === null)
            return null;//解码失败返回空
        var msg = {};
        binary
            .stream(buff)
            .word8('flag')//标识位1个字节
            .word16be('len')//长度2个字节，代表后面的域名字符串的长度
            .tap(function (args) {
                args.dst = {};
                this
                    .buffer('addr', args.len)
                    .tap(function (args) {
                        args.dst.addr = args.addr.toString();
                    });
            })
            .word16be('port')
            .word64be('timestamp')
            .tap(function (args) {
                args.dst.port = args.port;
                msg = args;
            });
        return msg;
    },
}
//回复数据的信令，包括可以上传数据，或者数据错误等
Potato.prototype.SymbolPeply = {
    Create: function (code) {
        var flag = new Buffer([0x86]);//标志位
        var sig = new Buffer(1);//应答信号
        sig.writeInt8(code);
        var timestamp_buf = new Buffer(8);//时间戳buffer，64位数字
        var timeNow = Date.now();//获取当前时间戳
        timestamp_buf.writeIntBE(timeNow, 0, 8);//将当前时间戳写入buffer
        var head = Buffer.concat([flag, sig, timestamp_buf]);//将这些buffer拼装成头部buffer

        var aes = crypto.createCipher(algorithm, password);
        head = aes.update(head);

        return head;
    },
    Resolve: function (buff) {
        //var decipher = crypto.createDecipher(algorithm, password);
        buff = decipherGCM(buff, password);   //decipher.update(buff);
        var msg = {};
        binary
            .stream(buff)
            .word8('flag')//标识位1个字节
            .word8('sig')//长度2个字节，代表后面的域名字符串的长度
            .word64be('timestamp')
            .tap(function (args) {
                msg = args;
            });
        return msg;
    }

}

class EncryptStream extends Transform {
    constructor() {
        super();
        this._MaxLength = 32768;//分块大小32k;
    }

    _transform(buf, enc, next) {
        var buff_goups = [];
        //将收的的数据分组
        for (var i = 0, len = buf.length; i < len; i += this._MaxLength) {
            buff_goups.push(buf.slice(i, i + this._MaxLength));
        }
        buff_goups.forEach((buff_item) => {
            var buff_body = [];
            var data = encipherGCM(buff_item, password);
            buff_body.push(data.length);
            buff_body.push(data);
            buff_body = buff_body.concat(buff_body);
            this.push(buff_body);
        });

        next();

    }
}

module.exports = Potato;
