'use strict'
const net = require('net');
const Potato = require('./potato');
const crypto = require('crypto');

var server = net.createServer((socket) => {
    console.log('client connect from  %s:%d', socket.remoteAddress, socket.remotePort);

    var aes = crypto.createCipher('aes-256-cfb', '123qweASD');
    var deAes = crypto.createDecipher('aes-256-cfb', '123qweASD');
    var decode = new Potato.decode();
    var client = socket
        .pipe(deAes)//解密
        .pipe(decode);//过滤头部

    decode.on('head', (remote) => {
        console.log('client want to connect %s:%d', remote.addr, remote.port);
        net.connect(remote.port, remote.addr, function (err) {//创建一个连接到目标服务器的链接
            console.log('connect to  %s:%d', remote.addr, remote.port);
            client
                .pipe(this)//将过滤头部后的数据发给目标服务器
                .pipe(aes)//将目标服务器返回的数据加密
                .pipe(socket);//将加密后的数据返回给potato的客户端

            //处理错误    
            this.on('error', (err) => {
                console.log('连接远程服务器出错:' + err.stack);
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