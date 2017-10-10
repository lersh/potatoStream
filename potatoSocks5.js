'use strict';
const socks = require('socks-proxy');
const net = require('net');
const crypto = require('crypto');
const fs = require('fs');

var Potato = require('./potato');
var
	algorithm = 'aes-256-cfb',
	password = 'Synacast123';
Potato = new Potato(algorithm, password);

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
	console.log('client want to connect to %s:%d', address.address, address.port);

	net.connect(potatoPort, potatoAddr, function () {//连接远程代理服务器
		var potatoSocket = this;//potato服务器的连接

		//console.log('连上了potato服务器');
		//构造一个信令告诉potato服务器要连接的目标地址
		var req = Potato.CreateHead.ConnectRequest(address.address, address.port);
		potatoSocket.write(req);//将信令发给potato服务器
		//console.log('发送连接信令  %s:%d', potatoSocket.remoteAddress, potatoSocket.remotePort);

		potatoSocket.once('data', (data) => {//第一次收到回复时
			var reply = Potato.ResolveHead.ConnectReply(data);//解析返回的信号
			//console.dir(reply);

			client.reply(reply.sig);//将状态发给浏览器
			console.log('收到的信号：%d，目标地址： %s:%d', reply.sig, address.address, address.port);
			var cipher = crypto.createCipher(algorithm, password),
				decipher = crypto.createDecipher(algorithm, password);
			//浏览器收到连通的信号就会开始发送真正的请求数据
			client//浏览器的socket
				.pipe(cipher)//加密
				.pipe(potatoSocket)//传给远程代理服务器
				.pipe(decipher)//将返回的数据解密
				.pipe(client);//远程代理服务器的数据再回传给浏览器
			//}
			//else {
			//	console.log('收到错误信号');
			//	client.reply(reply.sig);
			//}

		});
	});
});




server.listen(3000, () => {
	console.log('listening on 3000');
});

process.on('uncaughtException', function (err) {
	console.log("process error: " + err.message);
	console.log(err.stack);
});