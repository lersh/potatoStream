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
            var fakeHead = fakeHead.Request();
            buffer = Buffer.concat([fakeHead, buf]);
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
        var fakeHead = `GET ${fakeUrl} HTTP/1.1
        Accept: */*
        Referer: ${referer}
        Accept-Language: zh-Hans-CN,zh-Hans;q=0.8,ja;q=0.6,en-US;q=0.4,en;q=0.2
        User-Agent: ${ua}
        X-Requested-With: XMLHttpRequest
        Accept-Encoding: gzip, deflate
        Host: ${host}
        Connection: Keep-Alive
        Cookie: ${cookie}
        
        `;
        return fakeHead;
    },
    Response: function () {
        var time = new Date().toGMTString();
        var fakeHead = ` HTTP/1.1 200 OK
Server: nginx
Date: ${time}
Content-Type: application/x-bittorrent
Transfer-Encoding: chunked
Connection: keep-alive
Last-Modified: ${time}
Vary: Accept-Encoding
Cache-Control: no-cache, no-store, must-revalidate
Accept-Ranges: bytes
        
`;
        return fakeHead;
    }

}

