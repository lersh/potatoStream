'use strict'
const net = require('net');
const crypto = require('crypto');
const domain = require('domain');
const zlib = require('zlib');
//log4js module
var log4js = require('log4js');
var logConfig = require('./logConfig.json');
log4js.configure(logConfig);
var logger = log4js.getLogger('server');
//读取配置文件
var config = require('./config.json');

//初始化potato函数库
var Potato = require('./potato');
var
    algorithm = 'aes-256-cfb',
    password = '';
//设定加密算法和密码
if (config.algorithm != null)
    algorithm = config.algorithm;
if (config.password != null)
    password = config.password;
Potato = new Potato(algorithm, password);
var EncryptStream = Potato.EncryptStream;
var DecryptStream = Potato.DecryptStream;
var EncodeStream = Potato.EncodeStream;
var DecodeStream = Potato.DecodeStream;

var server_port = 1999;
if (config.server_port != null)
    server_port = config.server_port;

var potatoServer = net.createServer((pototaClient) => {
    var potatoAddr = pototaClient.remoteAddress;
    var potatoPort = pototaClient.remotePort;
    logger.trace('客户端连进来了： %s:%d\r\n', potatoAddr, potatoPort);

    pototaClient.once('data', (data) => {
        var sig;//返回信号

        var reqSymbol = Potato.SymbolRequest.Resolve(data);  //Potato.ResolveHead.ConnectRequest(data);//解析请求头
        if (reqSymbol === null) {//连接信令错误
            logger.error('请求信令错误！来自：%s:%d', potatoAddr, potatoPort);
            sig = Potato.SymbolPeply.Create(Potato.ReplyCode.COMMAND_NOT_SUPPORTED);//创建一个错误信号
            pototaClient.write(sig);//返回错误信号
            pototaClient.end();
            pototaClient.destroy();
            return;
        }
        logger.trace('want to connect %s:%d\r\n', reqSymbol.dst.addr, reqSymbol.dst.port);


        var d = domain.create();//用来捕捉错误信号的域

        d.run(() => {
            //尝试连接目标地址
            var proxySocket = net.connect(reqSymbol.dst.port, reqSymbol.dst.addr);
            //如果连上了
            proxySocket.on('connect', function () {
                logger.trace('connected %s:%d\r\n', this.remoteAddress, this.remotePort);
                sig = Potato.SymbolPeply.Create(Potato.ReplyCode.SUCCEEDED);//创建一个成功信号
                pototaClient.write(sig);//如果连上了就发送成功信号                
                //var cipher = crypto.createCipher(algorithm, password),
                //    decipher = crypto.createDecipher(algorithm, password);
                var cipher = new EncryptStream();
                var decipher = new DecryptStream();
                var encode = zlib.createGzip();
                pototaClient
                    //.pipe(decipher)//将potato客户端的数据解密
                    .pipe(this)//传给目标服务器
                    //.pipe(cipher)//将目标服务器返回的数据加密
                    .pipe(encode)
                    .pipe(pototaClient);//传给potato客户端
            });

            proxySocket.on('error', (err) => {
                switch (err.code) {
                    case 'ENOTFOUND':
                        logger.info('找不到域名: %s', reqSymbol.addr);
                        sig = Potato.SymbolPeply.Create(Potato.ReplyCode.HOST_UNREACHABLE);
                        pototaClient.write(sig);
                        break;
                    case 'ECONNREFUSED':
                        logger.info('连接被拒绝: %s:%d', reqSymbol.addr, reqSymbol.port);
                        sig = Potato.SymbolPeply.Create(Potato.ReplyCode.CONNECTION_REFUSED);
                        pototaClient.write(sig);
                        break;
                    case 'ETIMEDOUT':
                        logger.info('连接超时: %s:%d', reqSymbol.addr, reqSymbol.port);
                        sig = Potato.SymbolPeply.Create(Potato.ReplyCode.NETWORK_UNREACHABLE);
                        if (pototaClient.writable)
                            pototaClient.write(sig);
                        break;
                    case 'ECONNRESET':
                    default:
                        logger.error("远程服务器连接错误: %s:%d", reqSymbol.dst.addr, reqSymbol.dst.port);
                        logger.error(err.code + '\t' + err.message);
                        proxySocket.end();//断开远程服务器的连接
                        pototaClient.end();//断开和potato客户端的连接
                        break;
                }

            });
        });

        //捕捉错误信号
        d.on('error', (err) => {
            logger.error('域里未处理的错误:' + err.message + err.stack);
            sig = Potato.SymbolPeply.Create(Potato.ReplyCode.GENERAL_FAILURE);
            if (pototaClient.writable)
                pototaClient.write(sig);

        });

    });
    pototaClient.on('error', (err) => {
        logger.error("potato客户端错误: %s:%d  ", potatoAddr, potatoPort, err);
        logger.error('potato客户端可能已经退出或崩溃。\r\n');
    })

});


potatoServer.listen(server_port, () => {
    logger.info('listening on ' + server_port);
});

process.on('uncaughtException', function (err) {
    logger.error("捕获未处理的错误: " + err.message);
    logger.error(err);
});