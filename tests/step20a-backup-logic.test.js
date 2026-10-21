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

function sampleBackupText() {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  ensureQueue();
  markWordLearned(1);
  state.progress.day = 2;
  return exportBackupText();
}

function modifiedBackup(change) {
  const data = JSON.parse(sampleBackupText());
  change(data);
  return JSON.stringify(data);
}

test('导出的备份可以被原样导入', function () {
  const text = sampleBackupText();
  loadAppScripts();

  assert.deepStrictEqual(importBackupText(text), { ok: true });
  assert.deepStrictEqual(state, JSON.parse(text));
});

test('导入成功后写入 localStorage', function () {
  const text = sampleBackupText();
  loadAppScripts();

  importBackupText(text);

  assert.strictEqual(JSON.parse(localStorage.getItem('english3000.v1')).progress.day, 2);
});

test('导出不修改当前状态', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  ensureQueue();
  const before = JSON.stringify(state);

  exportBackupText();

  assert.strictEqual(JSON.stringify(state), before);
});

test('非 JSON 文本返回 invalidJson 且不修改状态', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  const before = JSON.stringify(state);

  assert.deepStrictEqual(importBackupText('broken{'), { ok: false, reason: 'invalidJson' });
  assert.strictEqual(JSON.stringify(state), before);
});

test('缺少必要字段或不是对象时返回 invalidShape', function () {
  const missingQueue = modifiedBackup(function (d) {
    delete d.queue;
  });
  loadAppScripts();

  assert.strictEqual(importBackupText('[]').reason, 'invalidShape');
  assert.strictEqual(importBackupText(missingQueue).reason, 'invalidShape');
});

test('版本号不为 1 时返回 invalidVersion', function () {
  const text = modifiedBackup(function (d) {
    d.version = 2;
  });
  loadAppScripts();

  assert.strictEqual(importBackupText(text).reason, 'invalidVersion');
});

test('开始日期格式非法时返回 invalidSettings', function () {
  const text = modifiedBackup(function (d) {
    d.settings.startDate = 'abc';
  });
  loadAppScripts();

  assert.strictEqual(importBackupText(text).reason, 'invalidSettings');
});

test('队列编号超出词表或不早于 nextWordId 时返回 invalidQueue', function () {
  const beyondWordList = modifiedBackup(function (d) {
    d.queue = [21];
    d.nextWordId = 21;
  });
  const notBeforeNext = modifiedBackup(function (d) {
    d.queue = [5];
    d.nextWordId = 3;
  });
  loadAppScripts();

  assert.strictEqual(importBackupText(beyondWordList).reason, 'invalidQueue');
  assert.strictEqual(importBackupText(notBeforeNext).reason, 'invalidQueue');
});

test('队列中有重复编号时返回 invalidQueue', function () {
  const text = modifiedBackup(function (d) {
    d.queue = [2, 2];
  });
  loadAppScripts();

  assert.strictEqual(importBackupText(text).reason, 'invalidQueue');
});

test('复习阶段超出范围时返回 invalidWords', function () {
  const text = modifiedBackup(function (d) {
    d.words['1'].reviewStep = 8;
  });
  loadAppScripts();

  assert.strictEqual(importBackupText(text).reason, 'invalidWords');
});

test('已掌握的记录必须没有下次复习日，否则拒绝', function () {
  const bad = modifiedBackup(function (d) {
    d.words['1'] = { status: 'mastered', reviewStep: 7, nextReview: 3, reviewCount: 6 };
  });
  const good = modifiedBackup(function (d) {
    d.words['1'] = { status: 'mastered', reviewStep: 7, nextReview: null, reviewCount: 6 };
  });
  loadAppScripts();

  assert.strictEqual(importBackupText(bad).reason, 'invalidWords');
  assert.deepStrictEqual(importBackupText(good), { ok: true });
});

test('保存失败时恢复导入前的状态', function () {
  const text = sampleBackupText();
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  ensureQueue();
  const before = JSON.stringify(state);

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  assert.deepStrictEqual(importBackupText(text), { ok: false, reason: 'saveFailed' });
  assert.strictEqual(JSON.stringify(state), before);
});
