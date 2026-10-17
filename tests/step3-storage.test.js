const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

test('makeDefaultState 返回默认结构', function () {
  loadAppScripts();
  const defaults = makeDefaultState();
  assert.strictEqual(defaults.version, 1);
  assert.strictEqual(defaults.settings.startDate, null);
  assert.deepStrictEqual(defaults.queue, []);
  assert.strictEqual(defaults.nextWordId, 1);
  assert.strictEqual(typeof defaults.words, 'object');
  assert.strictEqual(typeof defaults.daily, 'object');
  assert.strictEqual(typeof defaults.tests, 'object');
});

test('localStorage 为空时返回默认状态且 storageOk 为 true', function () {
  loadAppScripts();
  const loaded = loadState();
  assert.strictEqual(loaded.settings.startDate, null);
  assert.strictEqual(storageOk, true);
});

test('saveState 能保存并在重新读取时拿回开始日期', function () {
  loadAppScripts();
  state.settings.startDate = '2026-01-01';
  assert.strictEqual(saveState(), true);
  assert.strictEqual(loadState().settings.startDate, '2026-01-01');
});

test('存储内容无法解析时返回默认状态且 storageOk 保持 true', function () {
  loadAppScripts();
  localStorage.setItem('english3000.v1', 'broken{');
  assert.strictEqual(loadState().settings.startDate, null);
  assert.strictEqual(storageOk, true);
});

test('开始日期格式非法时置为 null 并补齐缺失的顶层键', function () {
  loadAppScripts();
  localStorage.setItem('english3000.v1', '{"version":1,"settings":{"startDate":"abc"}}');
  const loaded = loadState();
  assert.strictEqual(loaded.settings.startDate, null);
  assert.deepStrictEqual(loaded.queue, []);
});

test('读取抛异常时返回默认状态且 storageOk 变为 false', function () {
  loadAppScripts();
  localStorage.getItem = function () {
    throw new Error('读取失败');
  };
  assert.strictEqual(loadState().settings.startDate, null);
  assert.strictEqual(storageOk, false);
});

test('写入抛异常时 saveState 返回 false 且 storageOk 变为 false', function () {
  loadAppScripts();
  localStorage.setItem = function () {
    throw new Error('写入失败');
  };
  assert.strictEqual(saveState(), false);
  assert.strictEqual(storageOk, false);
});
