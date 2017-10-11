'use strict'
const Transform = require('stream').Transform;
const binary = require('binary');
const crypto = require('crypto');

var algorithm, password;

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

Potato.prototype.CreateHead = {
    ConnectRequest: function (host, port) {
        var flag = new Buffer([0x86]);//标志位
        var addr_len = new Buffer(2);//需要连接的地址的域名的长度
        addr_len.writeUInt16BE(Buffer.byteLength(host, 'utf8'));//获取需要连接的地址的域名的长度
        var port_buf = new Buffer(2);//需要连接的端口
        port_buf.writeUInt16BE(port);//写入端口数字
        var timestamp_buf = new Buffer(8);//时间戳buffer，64位数字
        var timeNow = Date.now();//获取当前时间戳
        timestamp_buf.writeIntBE(timeNow, 0, 8);//将当前时间戳写入buffer
        var head = Buffer.concat([flag, addr_len, new Buffer(host, 'utf8'), port_buf, timestamp_buf]);//将这些buffer拼装成头部buffer

        var aes = crypto.createCipher(algorithm, password);
        head = aes.update(head);
        return head;
    },
    ConnectReply: function (code) {
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
    }
}

Potato.prototype.ResolveHead = {
    ConnectRequest: function (buff) {
        var decipher = crypto.createDecipher(algorithm, password);
        buff = decipher.update(buff);
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
    ConnectReply: function (buff) {
        var decipher = crypto.createDecipher(algorithm, password);
        buff = decipher.update(buff);
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

Potato.prototype.SymbolRequest = {
    Create: function (host, port) {
        var flag = new Buffer([0x86]);//标志位
        var addr_len = new Buffer(2);//需要连接的地址的域名的长度
        addr_len.writeUInt16BE(Buffer.byteLength(host, 'utf8'));//获取需要连接的地址的域名的长度
        var port_buf = new Buffer(2);//需要连接的端口
        port_buf.writeUInt16BE(port);//写入端口数字
        var timestamp_buf = new Buffer(8);//时间戳buffer，64位数字
        var timeNow = Date.now();//获取当前时间戳
        timestamp_buf.writeIntBE(timeNow, 0, 8);//将当前时间戳写入buffer
        var head = Buffer.concat([flag, addr_len, new Buffer(host, 'utf8'), port_buf, timestamp_buf]);//将这些buffer拼装成头部buffer

        var aes = crypto.createCipher(algorithm, password);
        head = aes.update(head);
        return head;
    },
    Resolve: function (buff) {
        var decipher = crypto.createDecipher(algorithm, password);
        buff = decipher.update(buff);
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
        var decipher = crypto.createDecipher(algorithm, password);
        buff = decipher.update(buff);
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

module.exports = Potato;
