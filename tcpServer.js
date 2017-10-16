'use strict';
const net = require('net');
const stream = require('stream');

var i = 1;
var option = {
    highWaterMark: 2,
    transform: function (buf, enc, next) {
        var len = buf.readUInt32BE(0, 4);
        console.log(i++, 'get', this.highWaterMark, buf.length);
        next(null, buf)
    }
}

var server = net.createServer((clientSocket) => {
    i = 1;
    var transform = stream.Transform(option);
    var rs = require('fs').createReadStream('./test_Ciphered.png')
    rs.pipe(transform).pipe(clientSocket);
});


server.listen(1888, '0.0.0.0', () => {
    console.log('Listening on 1888...');
});

process.on('uncaughtException', function (err) {
    console.log("捕获未处理的错误: " + err.message);
    console.log(err);
});