'use strict';
const socks = require('socks-proxy');
const net = require('net');
const Potato = require('./potato');
const crypto = require('crypto');
const fs = require('fs');

var potatoAddr, potatoPort;
if (process.argv.length == 4) {
	potatoAddr = process.argv[2];
	potatoPort = +process.argv[3];
}
else {
	potatoAddr = 'us.71star.com';
	potatoPort = 1999;
}



const server = socks.createServer(function (client) {
	var address = client.address;
	console.log('client want to connect to %s:%d', address.address, address.port);

	net.connect(potatoPort, potatoAddr, function (err) {//连接远程代理服务器
		client.reply(0);//连上了就告诉浏览器连通了
		/*REP应答字段
			0x00 表示成功
			0x01 普通SOCKS服务器连接失败
			0x02 现有规则不允许连接
			0x03 网络不可达
			0x04 主机不可达
			0x05 连接被拒
			0x06 TTL超时
			0x07 不支持的命令
			0x08 不支持的地址类型
			0x09 - 0xFF未定义
		*/
		console.log('connect to potato Server %s:%d', potatoAddr, potatoPort);

		//client.pipe(this).pipe(client);

		let encode = new Potato.encode(address.address, address.port);
		let aes = crypto.createCipher('aes-256-cfb', '123qweASD');
		let deAes = crypto.createDecipher('aes-256-cfb', '123qweASD');

		//var ws = fs.createWriteStream('./out.ciphered');
		client//浏览器的socket
			.pipe(encode)//发出的请求加上目标地址和端口
			.pipe(aes)//AES-256-CFB加密
			.pipe(this)//传给远程代理服务器
			.pipe(deAes)//将返回的数据解密
			.pipe(client);//远程代理服务器的数据再回传给浏览器

		this.on('error', (err) => {
			console.log('err:' + err);
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