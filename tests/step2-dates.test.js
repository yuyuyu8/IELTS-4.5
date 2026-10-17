const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

loadAppScripts();

const CATEGORIES = ['名词', '动词', '形容词', '副词'];

test('PLAN 与 WORDS 的基础数据正确', function () {
  assert.strictEqual(window.PLAN.totalDays, 270);
  assert.strictEqual(window.WORDS.length, 20);
  window.WORDS.forEach(function (entry) {
    assert.ok(
      CATEGORIES.indexOf(entry.category) !== -1,
      entry.word + ' 的 category 不在允许的四个分类内'
    );
  });
});

test('getDayNumber 按本地日期计算第几天', function () {
  assert.strictEqual(getDayNumber('2026-01-01', '2026-01-01'), 1);
  assert.strictEqual(getDayNumber('2026-01-01', '2026-01-10'), 10);
  assert.strictEqual(getDayNumber('2026-01-01', '2025-12-31'), 0);
  assert.strictEqual(getDayNumber(null, '2026-01-01'), 0);
});

test('getDayInfo 第一天返回第一阶段与音标周', function () {
  const info = getDayInfo('2026-01-01', '2026-01-01');
  assert.strictEqual(info.status, 'active');
  assert.strictEqual(info.dayNum, 1);
  assert.strictEqual(info.stage.name, '第一阶段');
  assert.strictEqual(info.dailyNew, 10);
  assert.strictEqual(info.phonicsWeek, true);
});

test('getDayInfo 在第 60 与 61 天切换阶段', function () {
  const day60 = getDayInfo('2026-01-01', '2026-03-01');
  assert.strictEqual(day60.dayNum, 60);
  assert.strictEqual(day60.stage.name, '第一阶段');

  const day61 = getDayInfo('2026-01-01', '2026-03-02');
  assert.strictEqual(day61.dayNum, 61);
  assert.strictEqual(day61.stage.name, '第二阶段');
  assert.strictEqual(day61.dailyNew, 15);
});

test('getDayInfo 在月内第 25 天进入巩固周', function () {
  const info = getDayInfo('2026-01-01', '2026-01-25');
  assert.strictEqual(info.dayInMonth, 25);
  assert.strictEqual(info.isConsolidationWeek, true);
});

test('getDayInfo 第 91 天开始阅读但不开始写作', function () {
  const info = getDayInfo('2026-01-01', '2026-04-01');
  assert.strictEqual(info.dayNum, 91);
  assert.strictEqual(info.readingToday, true);
  assert.strictEqual(info.writingToday, false);
});

test('getDayInfo 第 270 天仍在进行，第 271 天已完成', function () {
  const lastDay = getDayInfo('2026-01-01', '2026-09-27');
  assert.strictEqual(lastDay.dayNum, 270);
  assert.strictEqual(lastDay.status, 'active');
  assert.strictEqual(lastDay.stage.name, '第九月：全面复习');
  assert.strictEqual(lastDay.dailyNew, 0);

  const after = getDayInfo('2026-01-01', '2026-09-28');
  assert.strictEqual(after.status, 'finished');
});

test('getDayInfo 没有开始日期时为未开始', function () {
  const info = getDayInfo(null, '2026-01-01');
  assert.strictEqual(info.status, 'notStarted');
  assert.strictEqual(info.dayNum, 0);
  assert.strictEqual(info.dailyNew, 0);
});

test('getDayInfo 今天早于开始日期时为未开始', function () {
  assert.strictEqual(getDayInfo('2026-01-01', '2025-12-31').status, 'notStarted');
});

test('getStageByWordId 按累计词量返回阶段', function () {
  assert.strictEqual(getStageByWordId(601).name, '第二阶段');
  assert.strictEqual(getStageByWordId(1).name, '第一阶段');
});

test('todayString 返回 YYYY-MM-DD 格式', function () {
  assert.match(todayString(), /^\d{4}-\d{2}-\d{2}$/);
});
