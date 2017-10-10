'use strict'
const net = require('net');
const crypto = require('crypto');
const domain = require('domain');
//log4js module
var log4js = require('log4js');
var logConfig = require('./logConfig.json');
log4js.configure(logConfig);
var logger = log4js.getLogger('server');

var Potato = require('./potato');

var
    algorithm = 'aes-256-cfb',
    password = 'Synacast123';

Potato = new Potato(algorithm, password);


var potatoServer = net.createServer((pototaClient) => {

    pototaClient.once('data', (data) => {
        var reqHead = Potato.ResolveHead.ConnectRequest(data);//解析请求头
        logger.trace('want to connect %s:%d\r\n', reqHead.dst.addr, reqHead.dst.port);

        var sig;//返回信号
        var d = domain.create();//用来捕捉错误信号的域

        d.run(() => {
            //尝试连接目标地址
            var proxySocket = net.connect(reqHead.dst.port, reqHead.dst.addr);
            //如果连上了
            proxySocket.on('connect', function () {
                logger.trace('connected %s:%d\r\n', this.remoteAddress, this.remotePort);
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
                    logger.info('找不到域名: %s', reqHead.addr);
                    sig = Potato.CreateHead.ConnectReply(Potato.ReplyCode.HOST_UNREACHABLE);
                    pototaClient.write(sig);
                    break;
                case 'ECONNREFUSED':
                    logger.info('连接被拒绝: %s:%d', reqHead.addr, reqHead.port);
                    sig = Potato.CreateHead.ConnectReply(Potato.ReplyCode.CONNECTION_REFUSED);
                    pototaClient.write(sig);
                    break;
                case 'ECONNRESET':
                    logger.info('连接被中断: %s:%d', reqHead.addr, reqHead.port);
                    sig = Potato.CreateHead.ConnectReply(Potato.ReplyCode.CONNECTION_NOT_ALLOWED);
                    if (pototaClient.writable)
                        pototaClient.write(sig);
                    break;
                case 'ETIMEDOUT':
                    logger.info('连接超时: %s:%d', reqHead.addr, reqHead.port);
                    sig = Potato.CreateHead.ConnectReply(Potato.ReplyCode.NETWORK_UNREACHABLE);
                    if (pototaClient.writable)
                        pototaClient.write(sig);
                    break;
                default:
                    logger.info('域里未处理的错误:' + err.stack);
                    sig = Potato.CreateHead.ConnectReply(Potato.ReplyCode.GENERAL_FAILURE);
                    if (pototaClient.writable)
                        pototaClient.write(sig);
            }
        });

    });

});


potatoServer.listen(1999, () => {
    logger.info('listening on 1999');
});

process.on('uncaughtException', function (err) {
    logger.error("捕获未处理的错误: " + err.message);
    logger.error(err);
});