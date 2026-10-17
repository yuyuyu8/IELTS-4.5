const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

test('未设置开始日期时不补队列也不返回新词', function () {
  loadAppScripts();
  assert.strictEqual(ensureQueue(), false);
  assert.deepStrictEqual(state.queue, []);
  assert.strictEqual(state.nextWordId, 1);
  assert.deepStrictEqual(getTodayNewWords(), []);
});

test('第 1 天补齐 10 个新词并返回对应词条', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);

  assert.strictEqual(ensureQueue(), true);
  assert.deepStrictEqual(state.queue, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.strictEqual(state.nextWordId, 11);

  const words = getTodayNewWords();
  assert.strictEqual(words.length, 10);
  assert.strictEqual(words[0].word, 'apple');
  assert.strictEqual(words[9].word, 'luckily');
});

test('队列已满时再次调用不产生变化', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);

  assert.strictEqual(ensureQueue(), true);
  assert.strictEqual(ensureQueue(), false);
  assert.strictEqual(state.queue.length, 10);
  assert.strictEqual(state.nextWordId, 11);
});

test('今日新词只取队列前 dailyNew 个', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.queue = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  state.nextWordId = 13;

  const words = getTodayNewWords();
  assert.strictEqual(words.length, 10);
  assert.strictEqual(words[9].word, 'luckily');
});

test('第 61 天按第二阶段补齐 15 个新词', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(-60);

  assert.strictEqual(ensureQueue(), true);
  assert.strictEqual(state.queue.length, 15);
  assert.strictEqual(state.nextWordId, 16);
  assert.strictEqual(getTodayNewWords().length, 15);
});

test('词表用尽时循环停止', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.nextWordId = 16;

  ensureQueue();
  assert.deepStrictEqual(state.queue, [16, 17, 18, 19, 20]);
  assert.strictEqual(state.queue.length, 5);
  assert.strictEqual(state.nextWordId, 21);

  const words = getTodayNewWords();
  assert.strictEqual(words.length, 5);
  assert.strictEqual(words[0].word, 'school');
  assert.strictEqual(words[4].word, 'teacher');
});

test('第 270 天不补队列也不返回新词', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(-269);

  assert.strictEqual(ensureQueue(), false);
  assert.deepStrictEqual(state.queue, []);
  assert.deepStrictEqual(getTodayNewWords(), []);
});

test('第 501 天（已完成）不补队列也不返回新词', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(-500);

  assert.strictEqual(ensureQueue(), false);
  assert.deepStrictEqual(state.queue, []);
  assert.deepStrictEqual(getTodayNewWords(), []);
});

test('队列中的编号在词表里查不到时会被跳过', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.queue = [1, 9999];
  state.nextWordId = 10000;

  const words = getTodayNewWords();
  assert.strictEqual(words.length, 1);
  assert.strictEqual(words[0].word, 'apple');
});
