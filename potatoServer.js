'use strict'
const net = require('net');
const tls = require('tls');
const crypto = require('crypto');
const fs = require('fs');
const domain = require('domain');
const PotatoLib = require('./potato');
const Obfs = require('./obfs');
//log4js module
var log4js = require('log4js');
var logConfig = require('./logConfig.json');
log4js.configure(logConfig);
var logger = log4js.getLogger('server');

//读取配置文件
var config = require('./config.json');
var
    algorithm = 'aes-256-cfb',
    password = '';
//设定加密算法和密码
if (config.algorithm != null)
    algorithm = config.algorithm;
if (config.password != null)
    password = config.password;

var Potato = new PotatoLib(algorithm, password);
var EncryptStream = Potato.EncryptStream;
var DecryptStream = Potato.DecryptStream;

var server_port = 1999;
if (config.server_port != null)
    server_port = config.server_port;
//命令行参数优先级大于配置文件
if (process.argv.length == 3) {
    server_port = +process.argv[2];
}
//定义tls方式链接的参数
var ciphers = [
    'ECDHE-RSA-AES256-GCM-SHA384',
    'ECDHE-ECDSA-AES256-GCM-SHA384']
    .join(':');

var options = {};
if (config.method === 'https') {
    options = {
        key: fs.readFileSync('./cert/server.key'),
        cert: fs.readFileSync('./cert/server.crt'),
        ciphers: ciphers,
        passphrase: password,
        secureProtocol: 'TLSv1_2_method',
        honorCipherOrder: true,
        rejectUnauthorized: true
    }
}

//创建服务器
var potatoServer;
if (config.method === 'https') {
    var tlsSessionStore = {};
    potatoServer = tls.createServer(options);//建立tls服务器开始监听
    //新建会话时保存会话，不过测试下来没什么卵用
    potatoServer.on('newSession', (id, data, cb) => {
        tlsSessionStore[id] = data;
        logger.trace('新会话连接，id: %s\r\n', id);
        cb();
    });
    //回复会话
    potatoServer.on('resumeSession', (id, cb) => {
        cb(null, tlsSessionStore[id] || null);
        logger.trace('回复会话，id: %s\r\n', id);
    });
    potatoServer.on('secureConnection', (potatoClient) => {
        onConnect(potatoClient, false)
    });
}
else {
    potatoServer = net.createServer(options);
    potatoServer.on('connection', (potatoClient) => {
        onConnect(potatoClient, true)
    });
}



potatoServer.listen(server_port, () => {
    logger.info('listening on ' + server_port);
});

process.on('uncaughtException', function (err) {
    logger.error("捕获未处理的错误: " + err.message);
    logger.error(err);
});


function onConnect(potatoClient, needCipher) {
    var potatoAddr = potatoClient.remoteAddress;
    var potatoPort = potatoClient.remotePort;
    logger.trace('客户端连进来了： %s:%d\r\n', potatoAddr, potatoPort);

    potatoClient.once('data', (data) => {
        var sig;//返回信号

        var reqSymbol = Potato.SymbolRequest.Resolve(data);  //解析请求头
        logger.trace('want to connect %s:%d\r\n', reqSymbol.dst.addr, reqSymbol.dst.port);
        if (reqSymbol === null) {//连接信令错误
            logger.error('请求信令错误！来自：%s:%d', potatoAddr, potatoPort);
            sig = Potato.SymbolPeply.Create(Potato.ReplyCode.COMMAND_NOT_SUPPORTED);//创建一个错误信号
            potatoClient.write(sig);//返回错误信号
            potatoClient.end();
            potatoClient.destroy();
            return;
        }

        var d = domain.create();//用来捕捉错误信号的域

        d.run(() => {
            //尝试连接目标地址
            var proxySocket = net.connect(reqSymbol.dst.port, reqSymbol.dst.addr);
            //如果连上了
            proxySocket.on('connect', function () {
                logger.trace('connected %s:%d\r\n', this.remoteAddress, this.remotePort);
                sig = Potato.SymbolPeply.Create(Potato.ReplyCode.SUCCEEDED);//创建一个成功信号
                potatoClient.write(sig);//如果连上了就发送成功信号                

                if (needCipher) {
                    var cipher = new Potato.EncryptStream(),
                        decipher = new Potato.DecryptStream();
                    var obfs = new Obfs.ObfsResponse(),
                        deobfs = new Obfs.ObfsResolve();
                    potatoClient
                        .pipe(deobfs)//将potato客户端的数据反混淆
                        .pipe(decipher)//将potato客户端的数据解密
                        .pipe(this)//传给目标服务器
                        .pipe(cipher)//将目标服务器返回的数据加密
                        .pipe(obfs)//将加密后的数据混淆
                        .pipe(potatoClient);//传给potato客户端
                }
                else {
                    potatoClient
                        .pipe(this)//将potato客户端的数据传给目标服务器
                        .pipe(potatoClient);//将目标服务器返回的数据传给potato客户端
                }
            });

            proxySocket.on('error', (err) => {
                switch (err.code) {
                    case 'ENOTFOUND':
                        logger.info('找不到域名: %s', reqSymbol.addr);
                        sig = Potato.SymbolPeply.Create(Potato.ReplyCode.HOST_UNREACHABLE);
                        potatoClient.write(sig);
                        break;
                    case 'ECONNREFUSED':
                        logger.info('连接被拒绝: %s:%d', reqSymbol.addr, reqSymbol.port);
                        sig = Potato.SymbolPeply.Create(Potato.ReplyCode.CONNECTION_REFUSED);
                        potatoClient.write(sig);
                        break;
                    case 'ETIMEDOUT':
                        logger.info('连接超时: %s:%d', reqSymbol.addr, reqSymbol.port);
                        sig = Potato.SymbolPeply.Create(Potato.ReplyCode.NETWORK_UNREACHABLE);
                        if (potatoClient.writable)
                            potatoClient.write(sig);
                        break;
                    case 'ECONNRESET':
                    default:
                        logger.error("远程服务器连接错误: %s:%d", reqSymbol.dst.addr, reqSymbol.dst.port);
                        logger.error(err.code + '\t' + err.message);
                        proxySocket.end();//断开远程服务器的连接
                        potatoClient.end();//断开和potato客户端的连接
                        break;
                }

            });
        });

        //捕捉错误信号
        d.on('error', (err) => {
            logger.error('域里未处理的错误:' + err.message + err.stack);
            sig = Potato.SymbolPeply.Create(Potato.ReplyCode.GENERAL_FAILURE);
            if (potatoClient.writable)
                potatoClient.write(sig);

        });

    });
    potatoClient.on('error', (err) => {
        logger.error("potato客户端错误: %s:%d  ", potatoAddr, potatoPort, err);
        logger.error('potato客户端可能已经退出或崩溃。\r\n');
    })

}