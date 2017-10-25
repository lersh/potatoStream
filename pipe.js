'use strict'
const net = require('net');

var dstHost = '127.0.0.1',
    dstPort = 1999,
    localPort = 3000;

if (process.argv.length == 5) {
    dstHost = process.argv[2];
    dstPort = +process.argv[3];
    localPort = +process.argv[4];
}

var pipeServer = net.createServer((pipeClient) => {

    //尝试连接目标地址
    var dstSocket = net.connect(dstPort, dstHost);
    //如果连上了
    dstSocket.on('connect', function () {
        pipeClient
            .pipe(this)
            .pipe(pipeClient);
    });

});

pipeServer.listen(localPort, () => {
    console.log('Listening on ', localPort);
});