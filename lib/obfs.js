'use strict'
const Transform = require('stream').Transform;
const binary = require('binary');
const crypto = require('crypto');
var URL = require('url');

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

class ObfsResponse extends Transform {
    constructor() {
        super();
        this._isFirst = true;
    }
    _transform(buf, enc, next) {
        var buffer;
        if (this._isFirst) {
            var fake = Buffer.from(fakeHead.Response());
            buffer = Buffer.concat([fake, buf]);
            this._isFirst = false;
        }
        else {
            buffer = buf;
        }
        next(null, buffer);
    }
}

class ObfsResolve extends Transform {
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
        var cookie = 'WxSS_a648_saltkey=GkKu2UYs; WxSS_a648_lastvisit=1508307606; WxSS_a648_lastact=1508311206%09member.php%09logging; Hm_lvt_0288789e156eb1e042ef76d3cf65391f=1508311206; Hm_lpvt_0288789e156eb1e042ef76d3cf65391f=1508311206'
        var time = (new Date()).toGMTString();
        var fakeHead = `GET ${fakeUrl} HTTP/1.1\r\n\
Accept: */*\r\n\
Referer: ${referer}\r\n\
Accept-Language: zh-Hans-CN,zh-Hans;q=0.8,ja;q=0.6,en-US;q=0.4,en;q=0.2\r\n\
User-Agent: ${randUA()}\r\n\
X-Requested-With: XMLHttpRequest\r\n\
Accept-Encoding: gzip, deflate\r\n\
Host: ${host}\r\n\
Connection: Keep-Alive\r\n\
Cookie: ${cookie}\r\n\r\n`;
        return fakeHead;
    },
    Response: function () {
        var time = new Date().toGMTString();
        var fakeHead = `HTTP/1.1 200 OK\r\n\
Server: nginx\r\n\
Date: ${time}\r\n\
Content-Type: ${randMIME()}\r\n\
Transfer-Encoding: chunked\r\n\
Connection: keep-alive\r\n\
Last-Modified: ${time}\r\n\
Vary: Accept-Encoding\r\n\
Cache-Control: no-cache, no-store, must-revalidate\r\n\
Accept-Ranges: bytes\r\n\r\n`;
        return fakeHead;
    }

}

function rnd(start, end) {
    return Math.floor(Math.random() * (end - start) + start);
}

function randMIME() {
    var mimes = ['application/x-bittorrent', 'application/octet-stream', 'text/xml,application/msword', 'image/jpeg', 'video/mpeg4', 'application/vnd.android.package-archive', 'application/vnd.rn-realmedia-vbr'];
    return mimes[rnd(0, mimes.length)];
}

function randUA() {
    var uas = ['Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:57.0) Gecko/20100101 Firefox/57.0', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/61.0.3163.100 Safari/537.36', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/52.0.2743.116 Safari/537.36 Edge/15.15063', 'Mozilla/5.0 (Windows NT 10.0; WOW64; Trident/7.0; rv:11.0) like Gecko'];
    return uas[rnd(0, uas.length)]
}

function randURL(host) {
    var url = 'http://' + host;
    var dir;
    var page;
    var spm;
    var id;
}

function Obfs() {

}

Obfs.ObfsRequest = ObfsRequest;
Obfs.ObfsResponse = ObfsResponse;
Obfs.ObfsResolve = ObfsResolve;

module.exports = Obfs;