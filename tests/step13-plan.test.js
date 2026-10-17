const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

test('第 1 至 500 天每一天都能找到阶段', function () {
  loadAppScripts();
  for (let day = 1; day <= 500; day++) {
    assert.notStrictEqual(getStageByDay(day), null, '第 ' + day + ' 天没有对应阶段');
  }
});

test('第 1 至 500 天的每日新词总数为 3000', function () {
  loadAppScripts();
  let total = 0;
  for (let day = 1; day <= 500; day++) {
    total += getStageByDay(day).dailyNew;
  }
  assert.strictEqual(total, 3000);
});

test('阶段边界与每日新词数正确', function () {
  loadAppScripts();
  const expected = [
    [60, '第一阶段', 10],
    [61, '第二阶段', 15],
    [120, '第二阶段', 15],
    [121, '第三阶段', 15],
    [180, '第三阶段', 15],
    [181, '第四阶段', 10],
    [240, '第四阶段', 10],
    [241, '第五阶段：综合提升与复习', 0]
  ];

  expected.forEach(function (item) {
    const stage = getStageByDay(item[0]);
    assert.strictEqual(stage.name, item[1], '第 ' + item[0] + ' 天的阶段不正确');
    assert.strictEqual(stage.dailyNew, item[2], '第 ' + item[0] + ' 天的新词数不正确');
  });
});

test('阅读日程从第 61 天起每 3 天一次', function () {
  loadAppScripts();
  assert.strictEqual(getDayInfoByDay(60).readingToday, false);
  assert.strictEqual(getDayInfoByDay(62).readingToday, false);
  assert.strictEqual(getDayInfoByDay(63).readingToday, false);
  assert.strictEqual(getDayInfoByDay(61).readingToday, true);
  assert.strictEqual(getDayInfoByDay(64).readingToday, true);
});

test('语法与写作日程正确', function () {
  loadAppScripts();
  assert.strictEqual(getDayInfoByDay(7).grammarToday, false);
  assert.strictEqual(getDayInfoByDay(9).grammarToday, false);
  assert.strictEqual(getDayInfoByDay(8).grammarToday, true);
  assert.strictEqual(getDayInfoByDay(10).grammarToday, true);

  assert.strictEqual(getDayInfoByDay(120).writingToday, false);
  assert.strictEqual(getDayInfoByDay(127).writingToday, false);
  assert.strictEqual(getDayInfoByDay(121).writingToday, true);
  assert.strictEqual(getDayInfoByDay(128).writingToday, true);
});

test('检查日程每 50 天一次', function () {
  loadAppScripts();
  assert.strictEqual(getDayInfoByDay(49).checkpointToday, false);
  assert.strictEqual(getDayInfoByDay(51).checkpointToday, false);
  assert.strictEqual(getDayInfoByDay(50).checkpointToday, true);
  assert.strictEqual(getDayInfoByDay(100).checkpointToday, true);
  assert.strictEqual(getDayInfoByDay(500).checkpointToday, true);
});

test('未开始与已完成的状态，且不再包含巩固周字段', function () {
  loadAppScripts();
  assert.strictEqual(getDayInfoByDay(0).status, 'notStarted');
  assert.strictEqual(getDayInfoByDay(501).status, 'finished');

  const info = getDayInfoByDay(25);
  assert.strictEqual('isConsolidationWeek' in info, false);
  assert.strictEqual('dayInMonth' in info, false);
});
