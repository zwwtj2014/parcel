const fs = require('./fs');
const path = require('path');
const clone = require('clone');

const PARSERS = {
  // JSON5数据交换格式（JSON5）是JSON的超集，
  // 旨在通过扩展其语法以包括来自ECMAScript 5.1的一些产品来减轻JSON的一些限制。
  json: require('json5').parse,
  // TOML is a small configuration language written by Tom Preston-Werner
  // http://binarymuse.github.io/toml-node/
  toml: require('toml').parse
};

const existsCache = new Map();

/**
 * 从当前filePath开始找名为filenames的文件, 找不到移动到filePath的上一层, 直到找到根目录为止
 * @param {*} filepath 当前文件路径
 * @param {*} filenames 需要找的文件名
 * @param {*} root 根目录
 */
async function resolve(filepath, filenames, root = path.parse(filepath).root) {
  filepath = path.dirname(filepath);

  // Don't traverse above the module root
  if (filepath === root || path.basename(filepath) === 'node_modules') {
    return null;
  }

  for (const filename of filenames) {
    let file = path.join(filepath, filename);
    let exists = existsCache.has(file)
      ? existsCache.get(file)
      : await fs.exists(file);
    if (exists) {
      existsCache.set(file, true);
      return file;
    }
  }

  // 尾调用优化递归
  return resolve(filepath, filenames, root);
}

/**
 * 加载json或者toml文件, 比如package.json
 * TOML : http://binarymuse.github.io/toml-node/
 */
async function load(filepath, filenames, root = path.parse(filepath).root) {
  let configFile = await resolve(filepath, filenames, root);
  if (configFile) {
    try {
      let extname = path.extname(configFile).slice(1);
      if (extname === 'js') {
        return clone(require(configFile));
      }

      let configContent = (await fs.readFile(configFile)).toString();
      let parse = PARSERS[extname] || PARSERS.json;
      return configContent ? parse(configContent) : null;
    } catch (err) {
      if (err.code === 'MODULE_NOT_FOUND' || err.code === 'ENOENT') {
        existsCache.delete(configFile);
        return null;
      }

      throw err;
    }
  }

  return null;
}

exports.resolve = resolve;
exports.load = load;
