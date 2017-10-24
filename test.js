'use strict'
const net = require('net');
const crypto = require('crypto');
const stream = require('stream');
const fs = require('fs');
const Obfs = require('./obfs');

var ObfsRequest = Obfs.ObfsRequest;
var ObfsResponse = Obfs.ObfsResponse;
var ObfsResolve = Obfs.ObfsResolve;
var resolve = new ObfsResolve();
var obfs = new ObfsResponse();
process.stdin.resume();
process.stdin
    .pipe(obfs)
    .pipe(resolve)
    .pipe(process.stdout);