const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT } = require('./helpers.js');

const APP_FILES = ['index.html', 'style.css', 'app.js', 'data.js'];

function readAppFile(name) {
  return fs.readFileSync(path.join(REPO_ROOT, name), 'utf8');
}

test('仓库根目录存在四个应用文件', function () {
  APP_FILES.forEach(function (name) {
    assert.ok(fs.existsSync(path.join(REPO_ROOT, name)), name + ' 不存在');
  });
});

test('仓库根目录不存在 package.json、package-lock.json、node_modules', function () {
  ['package.json', 'package-lock.json', 'node_modules'].forEach(function (name) {
    assert.ok(!fs.existsSync(path.join(REPO_ROOT, name)), name + ' 不应存在');
  });
});

test('四个应用文件中不包含 http:// 或 https://', function () {
  APP_FILES.forEach(function (name) {
    const source = readAppFile(name);
    assert.strictEqual(source.indexOf('http://'), -1, name + ' 不应包含 http://');
    assert.strictEqual(source.indexOf('https://'), -1, name + ' 不应包含 https://');
  });
});

test('四个应用文件不使用 ES module', function () {
  APP_FILES.forEach(function (name) {
    const source = readAppFile(name);
    assert.strictEqual(source.indexOf('type="module"'), -1, name + ' 不应包含 type="module"');
    source.split(/\r?\n/).forEach(function (line, index) {
      assert.ok(
        !/^\s*(import|export)\b/.test(line),
        name + ' 第 ' + (index + 1) + ' 行不应以 import 或 export 开头'
      );
    });
  });
});

test('index.html 中所有 href 与 src 的值都不以 / 开头', function () {
  const html = readAppFile('index.html');
  const matches = html.match(/\b(?:href|src)="[^"]*"/g) || [];
  assert.ok(matches.length > 0, 'index.html 中应存在 href 或 src 属性');
  matches.forEach(function (match) {
    const value = match.replace(/^[a-z]+="/, '').replace(/"$/, '');
    assert.notStrictEqual(value.charAt(0), '/', '资源引用不应以 / 开头：' + match);
  });
});
