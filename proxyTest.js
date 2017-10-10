'use strict';
const socks = require('socks-proxy');
const net = require('net');
const crypto = require('crypto');
const binary = require('binary');

var Potato = require('./potato');

var
	algorithm = 'aes-256-cfb',
	password = 'Synacast123',
	host = 'www.duoshuo.com',
	port = 80;

Potato = new Potato(algorithm, password);

var potatoAddr = '127.0.0.1', potatoPort = 8080;
if (process.argv.length == 4) {
	host = process.argv[2];
	port = +process.argv[3];
}


process.on('uncaughtException', function (err) {
	console.log("process error: " + err.message);
	console.log(err.stack);
});



net.connect(potatoPort, potatoAddr, function () {
	var req = Potato.CreateHead.ConnectRequest(host, port);
	this.write(req);
	this.on('data', (data) => {
		var msg = Potato.ResolveHead.ConnectReply(data);
		console.dir(msg);
		this.end();
	});
});

