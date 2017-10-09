'use strict'
const Transform = require('stream').Transform;
const binary = require('binary');


function Potato() {

}

//给Request流添加头部
class EncodeStream extends Transform {
    constructor(addr, port) {
        super()//创建this对象
        this.addr = addr;
        this.port = port;
        this._first = 0;
        this._head = new Buffer(0);//定义头部数据buffer
        var flag = new Buffer([0x1]);//标志位
        var addr_len = new Buffer(2);//需要连接的地址的域名的长度
        addr_len.writeUInt16BE(Buffer.byteLength(this.addr, 'utf8'));//获取需要连接的地址的域名的长度
        var port_buf = new Buffer(2);//需要连接的端口
        port_buf.writeUInt16BE(this.port);//写入端口数字
        var timestamp_buf = new Buffer(8);//时间戳buffer，64位数字
        var timeNow = Date.now();//获取当前时间戳
        timestamp_buf.writeIntBE(timeNow, 0, 8);//将当前时间戳写入buffer
        //console.log(timeNow);
        this.head = Buffer.concat([flag, addr_len, new Buffer(this.addr, 'utf8'), port_buf, timestamp_buf]);//将这些buffer拼装成头部buffer
    }

    _transform(buf, enc, next) {
        if (this._first === 0) {//如果是第一次加进来的数据，就增加一个头部数据
            this._first++;
            this.push(this.head);
        }
        this.push(buf)
        next();
    }
}

//解码Request流的头部信息，获取目标服务器地址和端口，防止重放攻击等
class DecodeStream extends Transform {
    constructor() {
        super()
        this._first = 0;
    }

    _transform(buf, enc, next) {
        let headLen = 0;//头部的长度，因为长度不确定，因此需要计算
        var self = this;

        if (this._first === 0) {
            this._first++;
            binary
                .stream(buf)
                .word8('flag')//标识位1个字节
                .word16be('len')//长度2个字节，代表后面的域名字符串的长度
                .tap(function (args) {
                    headLen += 3;
                    headLen += args.len;
                    args.dst = {};
                    this
                        .buffer('addr', args.len)
                        .tap(function (args) {
                            args.dst.addr = args.addr.toString();
                        })
                })
                .word16be('port')
                .word64be('timestamp')
                .tap(function (args) {
                    headLen += 2;
                    headLen += 8;
                    args.dst.port = args.port;
                    var timeNow = Date.now();
                    var interval = timeNow - args.timestamp;
                    //console.log('TimeStamp interval is %d', Math.abs(interval));
                    if (Math.abs(interval) < 60000)
                        self.emit('head', args.dst);
                    else
                        self.emit('replayAck', '重放攻击');
                });
            var dataWithoutHead = buf.slice(headLen);//返回去掉头部后的数据
            this.push(dataWithoutHead);
        }

        else {
            this.push(buf)
        }
        next();
    }
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
class ReplyEncode extends Transform {
    constructor(code) {
        super()//创建this对象z
        this.code = code;
        this._first = true;
        this._head = new Buffer(0);//定义头部数据buffer
        var flag = new Buffer(this.code);//标志位
        var timestamp_buf = new Buffer(8);//时间戳buffer，64位数字
        var timeNow = Date.now();//获取当前时间戳
        timestamp_buf.writeIntBE(timeNow, 0, 8);//将当前时间戳写入buffer
        this.head = Buffer.concat([flag, timestamp_buf]);//将这些buffer拼装成头部buffer
    }

    _transform(buf, enc, next) {
        if (this._first) {//如果是第一次加进来的数据，就增加一个头部数据
            this._first = false;
            this.push(this.head);
        }
        this.push(buf)
        next();
    }
}

class ReplyDecode extends Transform {
    constructor() {
        super()
        this._first = true;
    }

    _transform(buf, enc, next) {
        let headLen = 9;//头部的长度9个字节
        var self = this;

        if (this._first) {
            this._first = false;
            binary
                .stream(buf)
                .word8('flag')//标识位1个字节
                .word64be('timestamp')//时间戳
                .tap(function (args) {
                    var timeNow = Date.now();
                    var interval = timeNow - args.timestamp;
                    //console.log('TimeStamp interval is %d', Math.abs(interval));
                    if (Math.abs(interval) < 60000)
                        self.emit('head', args.dst);
                    else
                        self.emit('replayAck', '重放攻击');
                });
            var dataWithoutHead = buf.slice(headLen);//返回去掉头部后的数据
            this.push(dataWithoutHead);
        }

        else {
            this.push(buf)
        }
        next();
    }
}

Potato.encode = EncodeStream;
Potato.decode = DecodeStream;
Potato.replyEncode = ReplyEncode;
Potato.replyDecode = ReplyDecode;

module.exports = Potato;
