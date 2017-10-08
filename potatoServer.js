'use strict'
const net = require('net');
const PotatoDecode = require('./potatoDecode');
const crypto = require('crypto');

var server = net.createServer((socket) => {
    console.log('client connect from  %s:%d', socket.remoteAddress, socket.remotePort);

    var deAes = crypto.createDecipher('aes-256-cfb', '123qweASD');
    var potatoDecode = new PotatoDecode();
    var client = socket
        .pipe(deAes)//解密
        .pipe(potatoDecode);//过滤头部

    potatoDecode.on('head', (remote) => {
        console.log('client want to connect %s:%d', remote.addr, remote.port);
        net.connect(remote.port, remote.addr, function (err) {
            console.log('connect to  %s:%d', remote.addr, remote.port);
            client
                .pipe(this)//将过滤头部后的数据发给remote
                .pipe(socket);//将remote返回的信息交给client
        });
    });
});


server.listen(1999, () => {
    console.log('listening on 1999');
});
