const fs = require('fs');
const path = require('path');
const {bundle} = require('./utils');
const expect = require('chai').expect;
const rimraf = require('rimraf');
const mkdirp = require('mkdirp');
const jsdom = require('jsdom');
const vueCompiler = require('vue-template-compiler');
const transpile = require('vue-template-es2015-compiler');
const genId = require('../src/transforms/vue').genId;

const tempDir = path.resolve(__dirname, './temp');
const mockEntry = path.resolve(tempDir, 'entry');
rimraf.sync(tempDir);
mkdirp.sync(tempDir);

// async function html(bundle) {
//   let src = fs.readFileSync(bundle.name, 'utf-8');
//   return new Promise(function(resolve, reject) {
//     jsdom.env({
//       html: '<!DOCTYPE html><html><head></head><body></body></html>',
//       src: [src],
//       done: (err, window) => {
//         if (err) return reject(err)
//         // assert(window)
//         return resolve(window);
//       }
//     })
//   });
// }

function test(file, assert) {
  it(file, done => {
    // fs.writeFileSync(mockEntry, 'window.vueModule = require("../integration/vue/' + file + '.vue")');
    fs.writeFileSync(
      mockEntry + '.html',
      `
<html>
<head>
</head>
<body onload="window.onModulesLoaded()">
  <div id="app"></div>
  <script src="./entry.js"></script>
</body>
</html>
`
    );
    fs.writeFileSync(
      mockEntry + '.js',
      `
import vueModule from "../integration/vue/${file}.vue";
window.vueModule = vueModule;
`
    );
    bundle(mockEntry + '.html')
      .then(b => {
        let buf = fs.readFileSync(b.name);
        var src = buf.toString();
        src = src.replace(/[/]dist[/]/g, __dirname + '/dist/');
        const virtualConsole = new jsdom.VirtualConsole();
        virtualConsole.sendTo(console);
        virtualConsole.on('error', err => {
          return done(err);
        });
        let dom = new jsdom.JSDOM(src, {
          pretendToBeVisual: true,
          resources: 'usable',
          runScripts: 'dangerously',
          virtualConsole
        });
        const window = dom.window;
        window.onModulesLoaded = () => {
          try {
            assert(window);
            done();
          } catch (err) {
            done(err);
          }
        };
      })
      .catch(err => {
        done(err);
      });
  });
}

function assertRenderFn(options, template) {
  const compiled = vueCompiler.compile(template);
  let str = options.render.toString();
  let str2 = transpile('function render() {' + compiled.render + '}');
  str = str
    .replace(/\n[ ]+/g, '')
    .replace(/\n/g, '')
    .replace(/[ ]+/g, '')
    .replace(/'/g, '"')
    .replace(/[;][}]/g, '}');
  str2 = str2
    .replace(/function [a-z_]+/g, 'function ')
    .replace(/[']/g, '"')
    .replace(/[ ]+/g, '');

  str = str.replace(/_vm[.]_v[(]""[)],/g, '');
  str2 = str2.replace(/_vm[.]_v[(]""[)],/g, '');

  str = str.replace(/[(]_vm.ok[)]/g, '_vm.ok');
  str2 = str2.replace(/[(]_vm.ok[)]/g, '_vm.ok');

  expect(str).to.equal(str2);
}

describe('vue', function() {
  test('basic', window => {
    const module = window.vueModule.default || window.vueModule;
    assertRenderFn(module, '<h2 class="red">{{msg}}</h2>');
    expect(module.data().msg).to.contain('Hello from Component A!');
    const style = fs
      .readFileSync(window.document.querySelector('link').href)
      .toString();
    expect(style).to.contain('comp-a h2 {\n  color: #f00;\n}');
  });

  test('pre-processors', window => {
    var module = window.vueModule;
    assertRenderFn(
      module,
      '<div>' +
        '<h1>This is the app</h1>' +
        '<comp-a></comp-a>' +
        '<comp-b></comp-b>' +
        '</div>'
    );
    expect(module.data().msg).to.contain('Hello from coffee!');
    const style = fs
      .readFileSync(window.document.querySelector('link').href)
      .toString();
    // stylus
    expect(style).to.contain(
      'body {\n  font: 100% Helvetica, sans-serif;\n  color: #999;\n}'
    );
    // // sass
    // expect(style).to.contain('h1 {\n  color: red;')
    // less
    expect(style).to.contain('h1 {\n  color: green;');
  });

  test('scoped-css', window => {
    var module = window.vueModule;
    var id =
      'data-v-' + genId(require.resolve('./integration/vue/scoped-css.vue'));
    expect(module._scopeId).to.equal(id);
    assertRenderFn(
      module,
      '<div>' +
        '<div><h1>hi</h1></div>\n' +
        '<p class="abc def">hi</p>\n' +
        '<template v-if="ok"><p class="test">yo</p></template>\n' +
        '<svg><template><p></p></template></svg>' +
        '</div>'
    );
    const style = fs
      .readFileSync(window.document.querySelector('link').href)
      .toString();
    expect(style).to.contain('.test[' + id + '] {\n  color: yellow;\n}');
    expect(style).to.contain(
      '.test[' + id + "]:after {\n  content: 'bye!';\n}"
    );
    expect(style).to.contain('h1[' + id + '] {\n  color: green;\n}');
  });

  test('media-query', window => {
    const style = fs
      .readFileSync(window.document.querySelector('link').href)
      .toString();
    var id =
      'data-v-' + genId(require.resolve('./integration/vue/media-query.vue'));
    expect(style).to.contain(
      '@media print {\n.foo[' + id + '] {\n    color: #000;\n}\n}'
    );
  });
});
