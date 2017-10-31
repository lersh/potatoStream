'use strict'
const net = require('net');

var server = net.createServer();

server.on('connection', function (client) {
    //console.dir(client);
    console.log(client.localAddress + '\t' + client.localPort + client.remoteAddress + '\t' + client.remotePort + '\t' + client.address());

    client.on('data', (chunck) => {
        console.log(chunck);

    });
});

server.listen(1080, '0.0.0.0', () => {
    console.log('listen on 1080');
});

process.on('uncaughtException', function (err) {
    console.log("捕获未处理的错误: " + err.message);
    console.log(err);
});