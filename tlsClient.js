'use strict';
const socks = require('socks-proxy');
const net = require('net');
const tls = require('tls');
const fs = require('fs');

//log4js module
var log4js = require('log4js');
var logConfig = require('./tlsConfig.json');
log4js.configure(logConfig);
var logger = log4js.getLogger('client');
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


//potato服务器地址
var
	potatoAddr = '127.0.0.1',
	potatoPort = 1999,
	local_port = 3000;

if (config.server_addr != null)
	potatoAddr = config.server_addr;
if (config.server_port != null)
	potatoPort = config.server_port;
if (config.local_port != null)
	local_port = config.local_port;
//命令行参数优先级大于配置文件
if (process.argv.length == 5) {
	potatoAddr = process.argv[2];
	potatoPort = +process.argv[3];
	local_port = +process.argv[4];
}


//使用客户端私钥和证书创建服务器
var options = {
    port: potatoPort,
    host: potatoAddr,
    key: fs.readFileSync('./client/client-key.pem'),
    cert: fs.readFileSync('./client/client-cert.pem'),

    // 服务端使用的自签名证书认证
    ca: [fs.readFileSync('./server/server-cert.pem')],
    checkServerIdentity: function (host, cert) {
        return undefined;
    }
};


const server = socks.createServer(function (client) {
	var address = client.address;
	logger.trace('浏览器想要连接： %s:%d', address.address, address.port);

	var potatoServer = tls.connect(options, function () {//连接远程代理服务器
		var potatoSocket = this;//potato服务器的连接

		logger.trace('连上了potato服务器');
		//构造一个信令告诉potato服务器要连接的目标地址
		var req = Potato.SymbolRequest.Create(address.address, address.port);  
		potatoSocket.write(req);//将信令发给potato服务器
		logger.trace('发送连接信令  %s:%d', potatoSocket.remoteAddress, potatoSocket.remotePort);

		potatoSocket.once('data', (data) => {//第一次收到回复时
			var reply = Potato.SymbolPeply.Resolve(data);//解析返回的信号
			logger.trace(reply);

			client.reply(reply.sig);//将状态发给浏览器
			logger.trace('收到的信号：%d，目标地址： %s:%d', reply.sig, address.address, address.port);//浏览器收到连通的信号就会开始发送真正的请求数据

			client//浏览器的socket
				.pipe(potatoSocket)//传给远程代理服务器
				.pipe(client);//远程代理服务器的数据再回传给浏览器
		});

		potatoSocket.on('error', (err) => {
			logger.error('potato服务器错误：%s\r\n%s', err.code, err.message);
			switch (err.code) {
				case 'ECONNRESET':
					logger.error('potato服务器断开了连接。%s:%d', address.address, address.port);
					client.end();//断开浏览器连接
					potatoSocket.end();//断开和服务器的连接
					break;
				default:
			}
		});
	});

	client.on('error', (err) => {
		//logger.error('浏览器端连接错误：%s\r\n%s', err.code, err.message);
		switch (err.code) {
			case 'EPIPE':
			case 'ECONNRESET':
				logger.error('浏览器断开了连接。');
				break;
			default:
				logger.error('浏览器连接错误。', err);
		}
		potatoServer.end();
		client.end();
	});
	potatoServer.on('error', (err) => {
		logger.error('potato服务器错误：%s\r\n%s', err.code, err.message);
		client.end();
	});
});




server.listen(local_port, () => {
	logger.info('listening on ' + local_port);
});

process.on('uncaughtException', function (err) {
	switch (err.code) {
		case 'ECONNREFUSED':
			logger.error('远程服务器拒绝连接，可能已经关闭. ' + err.message);
			break;
		default:
			logger.error("process error: " + err.message);
			logger.error(err.stack);
	}



});