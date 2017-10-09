'use strict'
const net = require('net');
const Potato = require('./potato');
const crypto = require('crypto');
const domain = require('domain');

var server = net.createServer((socket) => {
    //console.log('client connect from  %s:%d', socket.remoteAddress, socket.remotePort);

    var aes = crypto.createCipher('aes-256-cfb', '123qweASD');
    var deAes = crypto.createDecipher('aes-256-cfb', '123qweASD');
    var decode = new Potato.decode();
    var client = socket
        .pipe(deAes)//解密
        .pipe(decode);//过滤头部

    decode.on('head', (remote) => {
        console.log('client want to connect %s:%d', remote.addr, remote.port);

        var d = domain.create();//创建一个域，捕获错误用
        d.on('error', (err) => {
            switch (err.code) {
                case 'ENOTFOUND':
                    console.log('找不到域名: %s', remote.addr);
                    break;
                case 'ECONNREFUSED':
                    console.log('连接被拒绝: %s:%d', remote.addr, remote.port);
                    break;
                case 'ECONNRESET':
                    console.log('连接被中断: %s:%d', remote.addr, remote.port);
                    break;
                default:
                    console.log('域里未处理的错误:' + err.stack);
            }
        });

        d.run(() => {//在域里运行代码，错误会被域捕捉
            net.connect(remote.port, remote.addr, function (err) {//创建一个连接到目标服务器的链接
                console.log('connect to  %s:%d', remote.addr, remote.port);
                client
                    .pipe(this)//将过滤头部后的数据发给目标服务器
                    .pipe(aes)//将目标服务器返回的数据加密
                    .pipe(socket);//将加密后的数据返回给potato的客户端
            });
        });
    });
});


server.listen(1999, () => {
    console.log('listening on 1999');
});

process.on('uncaughtException', function (err) {
    console.log("捕获未处理的错误: " + err.message);
    console.log(err.stack);
});