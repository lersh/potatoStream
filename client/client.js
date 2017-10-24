'use strict'
var tls = require('tls');
var fs = require('fs');

//使用客户端私钥和证书创建服务器
var options = {
    port: 6666,
    host: 'pi.71star.com',
    key: fs.readFileSync('./client-key.pem'),
    cert: fs.readFileSync('./client-cert.pem'),

    // 服务端使用的自签名证书认证
    ca: [fs.readFileSync('../server/server-cert.pem')],
    checkServerIdentity: function (host, cert) {
        return undefined;
    }
};

process.stdin.resume();
var tlsSocket = tls.connect(options, function () {
    console.log('连接成功');
    console.log('客户端连接状态：')
    console.dir(tlsSocket.getCipher());
    process.stdin.pipe(tlsSocket, { end: false });
    tlsSocket.pipe(process.stdout);
});


//接收服务器数据
tlsSocket.on('data', function (data) {
    console.log('收到服务器数据：%s', data);
});