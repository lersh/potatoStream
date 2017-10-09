'use strict'
const Transform = require('stream').Transform;
const binary = require('binary');


function Potato() {

}

class EncodeStream extends Transform {
    constructor(addr, port) {
        super()//创建this对象
        this.addr = addr;
        this.port = port;
        this._first = 0;
        this._head = new Buffer(0);
        var flag = new Buffer([0x1]);
        var addr_len = new Buffer(2);
        addr_len.writeUInt16BE(Buffer.byteLength(this.addr, 'utf8'));
        var port_buf = new Buffer(2);
        port_buf.writeUInt16BE(this.port);
        var timestamp_buf = new Buffer(8);//增加时间戳
        var timeNow = Date.now();
        timestamp_buf.writeIntBE(timeNow, 0, 8);
        console.log(timeNow);
        this.head = Buffer.concat([flag, addr_len, new Buffer(this.addr, 'utf8'), port_buf, timestamp_buf]);
    }

    _transform(buf, enc, next) {
        if (this._first === 0) {
            this._first++;
            this.push(this.head);
        }
        this.push(buf)
        next();
    }
}


class DecodeStream extends Transform {
    constructor(addr, port) {
        super()
        this._first = 0;
    }

    _transform(buf, enc, next) {
        let headLen = 0;
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
                    console.log('TimeStamp interval is %d', Math.abs(interval));
                    if (Math.abs(interval) < 60000)
                        self.emit('head', args.dst);
                    else
                        self.emit('replayAck', '重放攻击');
                });
            var dataWithoutHead = buf.slice(headLen);//返回去掉头部后的数据
            this.push(dataWithoutHead);
        }
        /*
        if (headLen === 0) {
            headLen++;
            this.push(head);
        }*/
        else {
            this.push(buf)
        }
        next();
    }
}

Potato.encode = EncodeStream;
Potato.decode = DecodeStream;

module.exports = Potato;
