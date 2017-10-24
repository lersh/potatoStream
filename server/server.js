'use strict'
var tls = require('tls');
var fs = require('fs');

var ciphers = [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES256-GCM-SHA384']
    .join(':');

var options = {
    key: fs.readFileSync('./server-key.pem'),
    cert: fs.readFileSync('./server-cert.pem'),
    ciphers: ciphers,
    secureProtocol: 'TLSv1_2_method',
    honorCipherOrder: true,
    requestCert: true,
    rejectUnauthorized: true,
    ca: [fs.readFileSync('../client/client-cert.pem')]
}
//存储所有连接到服务器的客户端的全局变量
var clients = [];

var server = tls.createServer(options);

//将聊天内容分发到所有客户端
function distribute(from, data) {
    var tlsSocket = from;
    clients.forEach(function (client) {
        if (client !== from) {
            client.write(tlsSocket.remoteAddress + ':' + tlsSocket.remotePort + ' 说：' + data);
        }
    });
}

//添加'secureConnection'事件监听，有新连接进入
server.on('secureConnection', function (tlsSocket) {
    console.log('收到了客户端的连接，该连接：',
        tlsSocket.authorized ? '已认证' : '未认证');


    //客户端存入全局变量
    clients.push(tlsSocket);

    tlsSocket.on('data', function (data) {
        //客户端发来exit时，断开服务器与客户端的连接
        if (data.toString().trim().toLowerCase() === 'exit') {
            tlsSocket.end('bye ~ ');
        } else {
            //内容分发到所有客户端
            distribute(tlsSocket, data);
        }
    });
    //客户端连接关闭后，从全局变量移除
    tlsSocket.on('close', function () {
        console.log('有客户端退出');
        clients.splice(clients.indexOf(tlsSocket), 1);
    });
    //欢迎信息
    tlsSocket.write('itbilu.com：欢迎来到聊天室，当前共有 ' + clients.length + ' 人参与聊天\n');
});

//将TLS服务器绑定到6666端口上
server.listen(6666, function () {
    console.log('TLS 服务器已绑定');
});