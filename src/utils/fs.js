const promisify = require('./promisify');
const fs = require('fs');
const mkdirp = require('mkdirp');

exports.readFile = promisify(fs.readFile);
exports.writeFile = promisify(fs.writeFile);
exports.stat = promisify(fs.stat);
exports.readdir = promisify(fs.readdir);

exports.exists = function(filename) {
  return new Promise(resolve => {
    fs.exists(filename, resolve);
  });
};

exports.existsSync = function(filename, ...args) {
  return fs.existsSync(filename, ...args);
};

exports.mkdirp = promisify(mkdirp);
