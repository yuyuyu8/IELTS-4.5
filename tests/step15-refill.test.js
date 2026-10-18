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

test('每个学习日只补一次新词', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);

  assert.strictEqual(ensureQueue(), true);
  assert.strictEqual(ensureQueue(), false);
  assert.strictEqual(state.queue.length, 10);
  assert.strictEqual(state.progress.refilledDay, 1);
});

test('未学完的词在进入新学习日后保留', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);

  ensureQueue();
  assert.strictEqual(completeToday().ok, true);

  assert.strictEqual(ensureQueue(), false);
  assert.deepStrictEqual(state.queue, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.strictEqual(state.nextWordId, 11);
});

test('标记已学后进入新学习日会补足新词', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);

  ensureQueue();
  assert.strictEqual(markWordLearned(1), true);
  assert.strictEqual(completeToday().ok, true);

  assert.strictEqual(ensureQueue(), true);
  assert.deepStrictEqual(state.queue, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  assert.strictEqual(state.nextWordId, 12);
});

test('第五阶段不再引入新词但保留未学完的词', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 241;
  state.queue = [1, 2, 3];
  state.nextWordId = 4;

  const ids = getTodayNewWords().map(function (word) {
    return word.id;
  });
  assert.deepStrictEqual(ids, [1, 2, 3]);

  assert.strictEqual(ensureQueue(), false);
  assert.strictEqual(state.queue.length, 3);
  assert.strictEqual(state.nextWordId, 4);
});

test('标记已学写入复习起点', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 10;
  state.queue = [1];

  assert.strictEqual(markWordLearned(1), true);
  assert.deepStrictEqual(state.words['1'], {
    status: 'learning',
    reviewStep: 0,
    nextReview: 11,
    reviewCount: 0
  });
});

test('计划结束后不能标记已学', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  ensureQueue();
  state.progress.day = 501;

  assert.strictEqual(markWordLearned(1), false);
  assert.strictEqual(state.queue.length, 10);
  assert.strictEqual(state.words['1'], undefined);
});

test('保存失败时撤销标记', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  ensureQueue();

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  assert.strictEqual(markWordLearned(1), false);
  assert.deepStrictEqual(state.queue, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.strictEqual(state.words['1'], undefined);
});
