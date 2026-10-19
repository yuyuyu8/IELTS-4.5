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

test('makeDefaultState 包含默认的 progress', function () {
  loadAppScripts();
  assert.deepStrictEqual(makeDefaultState().progress, { day: 1, completedDate: null, refilledDay: 0 });
});

test('loadState 会修正非法的 progress 字段', function () {
  loadAppScripts();
  localStorage.setItem(
    'english3000.v1',
    '{"version":1,"settings":{"startDate":null},"progress":{"day":0,"completedDate":"abc","refilledDay":-1}}'
  );
  assert.deepStrictEqual(loadState().progress, { day: 1, completedDate: null, refilledDay: 0 });
});

test('没有开始日期或尚未开始时为未开始', function () {
  loadAppScripts();
  assert.strictEqual(currentPlanInfo().status, 'notStarted');

  state.settings.startDate = dateOffset(3);
  assert.strictEqual(currentPlanInfo().status, 'notStarted');
});

test('开始当天按进度计算第 1 天', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);

  const info = currentPlanInfo();
  assert.strictEqual(info.status, 'active');
  assert.strictEqual(info.dayNum, 1);
});

test('进度落后于日历时按进度计算', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(-10);
  state.progress.day = 3;

  assert.strictEqual(currentPlanInfo().dayNum, 3);
});

test('完成今天会推进进度并记录日期', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  ensureQueue();
  for (let id = 1; id <= 10; id++) {
    assert.strictEqual(markWordLearned(id), true);
  }

  state.daily['1'] = allChecks();
  assert.deepStrictEqual(completeToday(), { ok: true, day: 2 });
  assert.strictEqual(state.progress.completedDate, todayString());
});

test('同一个日历日不能完成两次', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  ensureQueue();
  for (let id = 1; id <= 10; id++) {
    markWordLearned(id);
  }

  state.daily['1'] = allChecks();
  assert.deepStrictEqual(completeToday(), { ok: true, day: 2 });
  assert.deepStrictEqual(completeToday(), { ok: false, reason: 'alreadyCompletedToday' });
  assert.strictEqual(state.progress.day, 2);
});

test('未开始时不能完成今天', function () {
  loadAppScripts();

  assert.deepStrictEqual(completeToday(), { ok: false, reason: 'notActive' });
  assert.strictEqual(state.progress.day, 1);

  state.settings.startDate = dateOffset(3);

  assert.deepStrictEqual(completeToday(), { ok: false, reason: 'notActive' });
  assert.strictEqual(state.progress.day, 1);
});

test('最后一天完成后变为已完成', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 500;

  state.daily['500'] = allChecks();
  assert.deepStrictEqual(completeToday(), { ok: true, day: 501 });
  assert.deepStrictEqual(completeToday(), { ok: false, reason: 'notActive' });
  assert.strictEqual(state.progress.day, 501);
});

test('保存失败时不推进进度', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  ensureQueue();
  for (let id = 1; id <= 10; id++) {
    markWordLearned(id);
  }

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  state.daily['1'] = allChecks();
  assert.deepStrictEqual(completeToday(), { ok: false, reason: 'saveFailed' });
  assert.strictEqual(state.progress.day, 1);
  assert.strictEqual(state.progress.completedDate, null);
});
