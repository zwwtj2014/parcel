const dbg = require('debug')('parcel:VueAsset');
const JSAsset = require('./JSAsset');
const config = require('../utils/config');
const localRequire = require('../utils/localRequire');
const compiler = require('../transforms/vue');

class VueAsset extends JSAsset {
  async parse(code) {
    this.addDependency('vue-component-compiler@https://github.com/shawwn/vue-component-compiler#parcel-vue-component-compiler', {install: true});
    dbg('parse', code);
    let vueconfig = await config.load(this.name, ['vue.config.json']);
    this.vue = compiler(code, this.name);
    dbg('parse:vue', code);
    this.contents = this.vue.code;
    this.vue.dependencies.forEach((v, k, map) => {
      const contents = v.code;
      dbg('parse:vue:write', [k, contents]);
      this.addDependency(k, {contents: contents});
    });
    return await super.parse(this.contents);
  }
}

module.exports = VueAsset;
