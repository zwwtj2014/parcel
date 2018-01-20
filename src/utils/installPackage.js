const dbg = require('debug')('parcel:installPackage');
const spawn = require('cross-spawn');
const config = require('./config');
const path = require('path');

module.exports = async function(dir, name) {
  let location = await config.resolve(dir, ['yarn.lock', 'package.json']);

  return new Promise((resolve, reject) => {
    let install;
    let options = {
      cwd: location ? path.dirname(location) : dir
    };

    if (location && path.basename(location) === 'yarn.lock') {
      dbg('yarn', ['add', name, '--dev'], options);
      install = spawn('yarn', ['add', name, '--dev'], options);
    } else {
      dbg('npm', ['install', name, '--save-dev'], options);
      install = spawn('npm', ['install', name, '--save-dev'], options);
    }

    install.stdout.pipe(process.stdout);
    install.stderr.pipe(process.stderr);

    install.on('close', code => {
      if (code !== 0) {
        return reject(new Error(`Failed to install ${name}.`));
      }
      return resolve();
    });
  });
};

module.exports.sync = function(dir, name) {
  let location = config.resolveSync(dir, ['yarn.lock', 'package.json']);

  let install;
  let options = {
    cwd: location ? path.dirname(location) : dir,
    stdio: 'inherit'
  };

  if (location && path.basename(location) === 'yarn.lock') {
    dbg('yarn', ['add', name, '--dev'], options);
    install = spawn.sync('yarn', ['add', name, '--dev'], options);
  } else {
    dbg('npm', ['install', name, '--save-dev'], options);
    install = spawn.sync('npm', ['install', name, '--save-dev'], options);
  }
  return install;
};
