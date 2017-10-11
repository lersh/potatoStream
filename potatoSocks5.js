'use strict';
const socks = require('socks-proxy');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');
//log4js module
var log4js = require('log4js');
var logConfig = require('./logConfig.json');
log4js.configure(logConfig);
var logger = log4js.getLogger('server');

//初始化potato函数库
var Potato = require('./potato');
var
	algorithm = 'aes-256-cfb',
	password = 'Synacast123';
Potato = new Potato(algorithm, password);
//potato服务器地址
var potatoAddr, potatoPort;
if (process.argv.length == 4) {
	potatoAddr = process.argv[2];
	potatoPort = +process.argv[3];
}
else {
	potatoAddr = '127.0.0.1';
	potatoPort = 1999;
}


const server = socks.createServer(function (client) {
	var address = client.address;
	logger.trace('浏览器想要连接： %s:%d', address.address, address.port);

	net.connect(potatoPort, potatoAddr, function () {//连接远程代理服务器
		var potatoSocket = this;//potato服务器的连接

		logger.trace('连上了potato服务器');
		//构造一个信令告诉potato服务器要连接的目标地址
		var req = Potato.CreateHead.ConnectRequest(address.address, address.port);
		potatoSocket.write(req);//将信令发给potato服务器
		logger.trace('发送连接信令  %s:%d', potatoSocket.remoteAddress, potatoSocket.remotePort);

		potatoSocket.once('data', (data) => {//第一次收到回复时
			var reply = Potato.ResolveHead.ConnectReply(data);//解析返回的信号
			logger.trace(reply);

			client.reply(reply.sig);//将状态发给浏览器
			logger.trace('收到的信号：%d，目标地址： %s:%d', reply.sig, address.address, address.port);
			var cipher = crypto.createCipher(algorithm, password),
				decipher = crypto.createDecipher(algorithm, password);
			//浏览器收到连通的信号就会开始发送真正的请求数据
			client//浏览器的socket
				.pipe(cipher)//加密
				.pipe(potatoSocket)//传给远程代理服务器
				.pipe(decipher)//将返回的数据解密
				.pipe(client);//远程代理服务器的数据再回传给浏览器
		});

		potatoSocket.on('error', (err) => {
			logger.error('potato服务器错误：%s\r\n%s', err.code, err.message);
			switch (err.code) {
				case 'ECONNRESET':
					logger.error('potato服务器断开了连接。');
					client.end();//断开浏览器连接
					potatoSocket.end();//断开和服务器的连接
					break;
				default:
			}
		});
	});

	client.on('error', (err) => {
		logger.error('浏览器端连接错误：%s\r\n%s', err.code, err.message);
		switch (err.code) {
			case 'EPIPE':
			case 'ECONNRESET':
				logger.error('浏览器断开了连接。');
				break;
			default:
		}
		client.end();
	});
});




server.listen(3000, () => {
	logger.info('listening on 3000');
});

process.on('uncaughtException', function (err) {
	logger.error("process error: " + err.message);
	logger.error(err.stack);
});