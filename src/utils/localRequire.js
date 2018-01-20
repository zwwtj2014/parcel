const dbg = require('debug')('parcel:localRequire');
const {dirname} = require('path');
const resolve = require('resolve');
const install = require('./installPackage');
const Path = require('path');

const cache = new Map();

async function localResolve(name, path, opts = {}, triedInstall = false) {
  let [base, version] = name.split('@');
  let dep = base.split('/')[0];
  let final = version ? `${dep}@${version}` : dep;
  dbg('localResolve', {name, path, opts, triedInstall});
  if (path == null) {
    path = process.cwd();
  }
  let basedir = dirname(path);
  let key = basedir + ':' + base;
  let resolved = opts.noCache ? null : cache.get(key);
  if (!resolved) {
    try {
      resolved = resolve.sync(base, {basedir});
    } catch (e) {
      let ext = Path.parse(name).ext;
      let shouldInstall = (ext == '' || ext == 'js') && !name.startsWith('_') && !name.startsWith('/') && !name.startsWith('.') && !opts.noInstall;
      if (e.code === 'MODULE_NOT_FOUND' && shouldInstall) {
        // dbg('localResolve:install', {name, path});
        dbg('localResolve:install', {name, path, dep, version, final});
        await install(path, final);
        return localResolve(name, path, opts, true);
      } else {
        if (ext == '') {
          dbg('localResolve:install:failed', {name, path, err: e});
        }
      }
      throw e;
    }
    if (!opts.noCache) {
      cache.set(key, resolved);
    }
  }

  return resolved;
}

async function localRequire(name, path, opts = {}) {
  dbg('localRequire', {name, path, opts});
  let resolved = await localResolve(name, path, opts);
  if (resolved instanceof Error) {
    throw resolved;
  }
  dbg('localRequire:resolved', {name, path, opts, resolved});
  return require(resolved);
}

module.exports = localRequire;
module.exports.localResolve = localResolve;
