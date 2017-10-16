'use strict';
const net = require('net');
const stream = require('stream');

var i = 1;
const transform = stream.Transform({
    highWaterMark: 2,
    transform: function (buf, enc, next) {
        console.log(i++, 'get', buf.length);
        next(null, buf)
    }
})

var server = net.createServer((clientSocket) => {
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