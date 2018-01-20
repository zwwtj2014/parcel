const compiler = require('vue-component-compiler');

// utility for generating a uid for each component file
// used in scoped CSS rewriting
var hash = require('hash-sum');
var cache = Object.create(null);

const genId = function genId(file) {
  return cache[file] || (cache[file] = hash(file));
};

module.exports = function compile(code, name, opts) {
  let dependencies = new Map();
  const id = genId(name);
  const scopeId = `data-v-${id}`;
  // const id = 'xxx';
  const descriptors = compiler.parse(
    code,
    name,
    opts || {needMap: false}
  );
  let source = {
    styles: [
      // { id: cssid, descriptor: descriptors.styles[0] },
    ],
    customBlocks: [
      // { id: '?type=custom&index=0', descriptor: descriptors.customBlocks[0] }
    ]
  };

  {
    const desc = descriptors.template || {content: ''};
    const template = compiler.compileTemplate(
      {code: desc.content, descriptor: {}},
      name,
      {
        scopeId,
        options: {scopeId},
        esModule: true,
        isProduction: false,
        isHot: true
      }
    );
    dependencies.set(name + '__type=template.js', {
      code: template.code,
      descriptor: desc
    });
    source.render = {id: name + '__type=template.js', descriptor: desc};
  }

  if (descriptors.script) {
    const ext = `.${descriptors.script.lang || 'js'}`
    source.script = {
      id: name + '__type=script' + ext,
      descriptor: descriptors.script || {}
    };
  } else {
    source.script = {id: name + '__type=script.js', descriptor: {}};
  }
  const ext = `.${(descriptors.script || {}).lang || 'js'}`
  dependencies.set(name + '__type=script' + ext, {
    code: descriptors.script ? descriptors.script.content : ' ',
    descriptor: descriptors.script || {}
  });

  for (let i = 0; i < descriptors.styles.length; i++) {
    const cssid = `${name}__type=style&index=${i}.${
      typeof descriptors.styles[i].lang === 'string'
        ? descriptors.styles[i].lang
        : 'css'
      }`;
    source.styles.push({id: cssid, descriptor: descriptors.styles[i]});
    const style = descriptors.styles[i].lang
      ? {code: descriptors.styles[i].content}
      : compiler.compileStyle(
        {
          code: descriptors.styles[i].content,
          descriptor: Object.assign(
            {},
            descriptors.styles[i].attrs,
            descriptors.styles[i]
          )
        },
        name,
        {
          scopeId,
          needMap: false,
          async: false
        }
      );
    dependencies.set(cssid, Object.assign({descriptor: descriptors.styles[i]}, style));
  }

  const result = {
    code: compiler.assemble(source, name, {
      scopeId,
      moduleId: scopeId,
      isServer: false,
      isHot: true,
      hasStyleInjectFn: true,
      esModule: true,
      isProduction: false,
    })
  };
  result.dependencies = dependencies;
  return result;
};

module.exports.compiler = compiler;
module.exports.genId = genId;
