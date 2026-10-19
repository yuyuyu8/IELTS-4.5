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

function allChecks() {
  return { listen: true, phonics: true, reading: true, writing: true, grammar: true };
}

test('完成今天前会先补齐当天新词，不能绕过检查', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);

  assert.deepStrictEqual(completeToday(), { ok: false, reason: 'wordsRemaining', remaining: 10 });
  assert.deepStrictEqual(state.queue, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.strictEqual(state.progress.day, 1);
});

test('第五阶段有未学完的旧词时不能完成今天', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 241;
  state.queue = [1, 2, 3];
  state.nextWordId = 4;

  assert.deepStrictEqual(completeToday(), { ok: false, reason: 'wordsRemaining', remaining: 3 });
  assert.strictEqual(state.progress.day, 241);
});

test('第五阶段学完旧词后可以完成今天', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 241;
  state.queue = [1, 2, 3];
  state.nextWordId = 4;

  for (let id = 1; id <= 3; id++) {
    assert.strictEqual(markWordLearned(id), true);
  }
  state.daily['241'] = allChecks();
  assert.deepStrictEqual(completeToday(), { ok: true, day: 242 });
});

test('完成今天后当天不再补词，也不能再标记已学', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  ensureQueue();
  for (let id = 1; id <= 10; id++) {
    markWordLearned(id);
  }
  state.daily['1'] = allChecks();
  assert.deepStrictEqual(completeToday(), { ok: true, day: 2 });

  assert.strictEqual(ensureQueue(), false);
  assert.deepStrictEqual(state.queue, []);

  state.queue.push(11);
  assert.strictEqual(markWordLearned(11), false);
  assert.deepStrictEqual(state.queue, [11]);
});
