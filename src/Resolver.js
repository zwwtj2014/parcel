const promisify = require('./utils/promisify');
const resolve = require('browser-resolve');
const resolveAsync = promisify(resolve);
const builtins = require('./builtins');
const path = require('path');
const glob = require('glob');

class Resolver {
  constructor(options = {}) {
    this.options = options;
    this.cache = new Map();
  }

  async resolve(filename, parent, options = {}) {
    var resolved = await this.resolveInternal(filename, parent, options, resolveAsync);
    return this.saveCache(filename, parent, resolved);
  }

  resolveSync(filename, parent, options = {}) {
    var resolved = this.resolveInternal(filename, parent, options, resolve.sync);
    return this.saveCache(filename, parent, resolved);
  }

  resolveInternal(filename, parent, options, resolver) {
    filename = filename.split('@')[0];
    let key = this.getCacheKey(filename, parent);
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }

    if (glob.hasMagic(filename)) {
      return {path: path.resolve(path.dirname(parent), filename)};
    }

    let extensions = Object.keys(this.options.extensions);
    if (parent) {
      const parentExt = path.extname(parent);
      // parent's extension given high priority
      extensions = [parentExt, ...extensions.filter(ext => ext !== parentExt)];
    }

    return resolver(filename, Object.assign({
        filename: parent,
        paths: this.options.paths,
        modules: builtins,
        extensions: extensions,
        packageFilter(pkg, pkgfile) {
          // Expose the path to the package.json file
          pkg.pkgfile = pkgfile;

          // libraries like d3.js specifies node.js specific files in the "main" which breaks the build
          // we use the "module" or "jsnext:main" field to get the full dependency tree if available
          const main = [pkg.module, pkg['jsnext:main']].find(
            entry => typeof entry === 'string'
          );

          if (main) {
            pkg.main = main;
          }

          return pkg;
        }
      },
      options));
  }

  getCacheKey(filename, parent) {
    return (parent ? path.dirname(parent) : '') + ':' + filename;
  }

  saveCache(filename, parent, resolved) {
    if (Array.isArray(resolved)) {
      resolved = {path: resolved[0], pkg: resolved[1]};
    } else if (typeof resolved === 'string') {
      resolved = {path: resolved, pkg: null};
    }

    this.cache.set(this.getCacheKey(filename, parent), resolved);
    return resolved;
  }
}

module.exports = Resolver;
