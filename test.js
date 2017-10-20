'use strict'
const net = require('net');
const crypto = require('crypto');
const stream = require('stream');
const fs = require('fs');
const URL = require('url');
const Transform = require('stream').Transform;

class ObfsRequest extends Transform {
    constructor() {
        super();
        this._isFirst = true;
    }
    _transform(buf, enc, next) {
        var buffer;
        if (this._isFirst) {
            var fake = Buffer.from(fakeHead.Request());
            buffer = Buffer.concat([fake, buf]);
            this._isFirst = false;
        }
        else {
            buffer = buf;
        }
        next(null, buffer);
    }
}

class ObfsRequestResolve extends Transform {
    constructor() {
        super();
        this._isFirst = true;
        this._isRemain = false;
        this._remainBuffer = Buffer.alloc(0);
    }
    _transform(buf, enc, next) {
        var buffer;
        if (this._isFirst) {
            var index = buf.indexOf('\r\n\r\n');
            if (index === -1) {
                next();
            }
            else {
                this._isFirst = false;
                buffer = buf.slice(index + 4);
                next(null, buffer);
            }
        }
        else {
            buffer = buf;
            next(null, buffer);
        }

    }
}

var fakeHead = {
    Request: function () {
        var fakeUrl = 'http://help.aliyun.com/product/27782.html?spm=5176.750001.3.27.FGLCI2';
        var url = URL.parse(fakeUrl);
        var referer = url.href;
        var host = url.host;
        var ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36 Edge/15.15063';
        var cookie = 'WxSS_a648_saltkey=GkKu2UYs; WxSS_a648_lastvisit=1508307606; WxSS_a648_lastact=1508311206%09member.php%09logging; Hm_lvt_0288789e156eb1e042ef76d3cf65391f=1508311206; Hm_lpvt_0288789e156eb1e042ef76d3cf65391f=1508311206'
        var time = (new Date()).toGMTString();
        var fakeHead = `GET ${fakeUrl} HTTP/1.1\r\n\
Accept: */*\r\n\
Referer: ${referer}\r\n\
Accept-Language: zh-Hans-CN,zh-Hans;q=0.8,ja;q=0.6,en-US;q=0.4,en;q=0.2\r\n\
User-Agent: ${ua}\r\n\
X-Requested-With: XMLHttpRequest\r\n\
Accept-Encoding: gzip, deflate\r\n\
Host: ${host}\r\n\
Connection: Keep-Alive\r\n\
Cookie: ${cookie}\r\n\r\n`;
        return fakeHead;
    },
    Response: function () {
        var time = new Date().toGMTString();
        var fakeHead = ` HTTP/1.1 200 OK\r\n\
Server: nginx\r\n\
Date: ${time}\r\n\
Content-Type: application/x-bittorrent\r\n\
Transfer-Encoding: chunked\r\n\
Connection: keep-alive\r\n\
Last-Modified: ${time}\r\n\
Vary: Accept-Encoding\r\n\
Cache-Control: no-cache, no-store, must-revalidate\r\n\
Accept-Ranges: bytes\r\n\r\n`;
        return fakeHead;
    }

}

var encode = new ObfsRequest();
var decode = new ObfsRequestResolve();
var ws = fs.createWriteStream('./test.txt');
process.stdin.pipe(encode).pipe(decode).pipe(ws);
process.stdin.resume();