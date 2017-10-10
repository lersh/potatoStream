'use strict'
const net = require('net');
const crypto = require('crypto');
const domain = require('domain');

var Potato = require('./potato');

var
    algorithm = 'aes-256-cfb',
    password = 'Synacast123';

Potato = new Potato(algorithm, password);


var potatoServer = net.createServer((pototaClient) => {

    pototaClient.once('data', (data) => {
        var reqHead = Potato.ResolveHead.ConnectRequest(data);//解析请求头
        console.log('want to connect %s:%d\r\n', reqHead.dst.addr, reqHead.dst.port);
        //console.dir(reqHead);

        var sig;//返回信号
        var d = domain.create();//用来捕捉错误信号的域

        d.run(() => {
            //尝试连接目标地址
            var proxySocket = net.connect(reqHead.dst.port, reqHead.dst.addr);
            //如果连上了
            proxySocket.on('connect', function () {
                //console.log('connected %s:%d\r\n', this.remoteAddress, this.remotePort);
                sig = Potato.CreateHead.ConnectReply(Potato.ReplyCode.SUCCEEDED);//创建一个成功信号
                pototaClient.write(sig);//如果连上了就发送成功信号                
                var cipher = crypto.createCipher(algorithm, password),
                    decipher = crypto.createDecipher(algorithm, password);
                pototaClient
                    .pipe(decipher)
                    .pipe(this)
                    .pipe(cipher)
                    .pipe(pototaClient);
            });
        });

        //捕捉错误信号
        d.on('error', (err) => {
            switch (err.code) {
                case 'ENOTFOUND':
                    console.log('找不到域名: %s', reqHead.addr);
                    sig = Potato.CreateHead.ConnectReply(Potato.ReplyCode.HOST_UNREACHABLE);
                    pototaClient.write(sig);
                    break;
                case 'ECONNREFUSED':
                    console.log('连接被拒绝: %s:%d', reqHead.addr, reqHead.port);
                    sig = Potato.CreateHead.ConnectReply(Potato.ReplyCode.CONNECTION_REFUSED);
                    pototaClient.write(sig);
                    break;
                case 'ECONNRESET':
                    console.log('连接被中断: %s:%d', reqHead.addr, reqHead.port);
                    sig = Potato.CreateHead.ConnectReply(Potato.ReplyCode.CONNECTION_NOT_ALLOWED);
                    if (pototaClient.writable)
                        pototaClient.write(sig);
                    break;
                case 'ETIMEDOUT':
                    console.log('连接超时: %s:%d', reqHead.addr, reqHead.port);
                    sig = Potato.CreateHead.ConnectReply(Potato.ReplyCode.NETWORK_UNREACHABLE);
                    pototaClient.write(sig);
                    break;
                default:
                    console.log('域里未处理的错误:' + err.stack);
                    sig = Potato.CreateHead.ConnectReply(Potato.ReplyCode.GENERAL_FAILURE);
                    pototaClient.write(sig);
            }
        });

    });

});


potatoServer.listen(1999, () => {
    console.log('listening on 1999');
});

process.on('uncaughtException', function (err) {
    console.log("捕获未处理的错误: " + err.message);
    console.error(err);
});