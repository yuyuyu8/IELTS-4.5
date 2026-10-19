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

function startAt(day) {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = day;
}

test('第 1 天需要听力与音标', function () {
  loadAppScripts();
  assert.deepStrictEqual(requiredDailyChecks(getDayInfoByDay(1)), ['listen', 'phonics']);
});

test('音标周结束后第 8 天改为需要语法，第 9 天只需听力', function () {
  loadAppScripts();
  assert.deepStrictEqual(requiredDailyChecks(getDayInfoByDay(7)), ['listen', 'phonics']);
  assert.deepStrictEqual(requiredDailyChecks(getDayInfoByDay(8)), ['listen', 'grammar']);
  assert.deepStrictEqual(requiredDailyChecks(getDayInfoByDay(9)), ['listen']);
});

test('第 61 天需要阅读，第 121 天需要阅读与写作', function () {
  loadAppScripts();
  assert.deepStrictEqual(requiredDailyChecks(getDayInfoByDay(61)), ['listen', 'reading']);
  assert.deepStrictEqual(requiredDailyChecks(getDayInfoByDay(121)), ['listen', 'reading', 'writing']);
});

test('第 500 天需要语法；未开始与已完成的日子没有任何任务', function () {
  loadAppScripts();
  assert.deepStrictEqual(requiredDailyChecks(getDayInfoByDay(500)), ['listen', 'grammar']);
  assert.deepStrictEqual(requiredDailyChecks(getDayInfoByDay(501)), []);
  assert.deepStrictEqual(requiredDailyChecks(getDayInfoByDay(0)), []);
});

test('setDailyCheck 拒绝未知的任务名与非布尔值', function () {
  startAt(1);
  assert.strictEqual(setDailyCheck('bogus', true), false);
  assert.strictEqual(setDailyCheck('listen', 'yes'), false);
  assert.deepStrictEqual(state.daily, {});
});

test('勾选按学习日编号记录，可以改回未勾选', function () {
  startAt(1);
  assert.strictEqual(setDailyCheck('listen', true), true);
  assert.strictEqual(setDailyCheck('listen', false), true);
  assert.deepStrictEqual(state.daily['1'], { listen: false });
});

test('missingDailyChecks 只列出当天要求且未勾选的任务', function () {
  startAt(1);
  assert.deepStrictEqual(missingDailyChecks(), ['listen', 'phonics']);
  setDailyCheck('listen', true);
  assert.deepStrictEqual(missingDailyChecks(), ['phonics']);
  setDailyCheck('phonics', true);
  assert.deepStrictEqual(missingDailyChecks(), []);
});

test('当天完成后不能再勾选', function () {
  startAt(1);
  state.progress.completedDate = todayString();
  assert.strictEqual(setDailyCheck('listen', true), false);
  assert.strictEqual(state.daily['1'], undefined);
});

test('勾选保存失败时撤销', function () {
  startAt(1);
  localStorage.setItem = function () {
    throw new Error('写入失败');
  };
  assert.strictEqual(setDailyCheck('listen', true), false);
  assert.strictEqual(state.daily['1'], undefined);
});

test('saveWritingText 按学习日编号保存作文', function () {
  startAt(121);
  assert.strictEqual(saveWritingText('I like apples.'), true);
  assert.strictEqual(state.daily['121'].writingText, 'I like apples.');
});

test('saveWritingText 拒绝非字符串与超过 4000 字的文字', function () {
  startAt(121);
  assert.strictEqual(saveWritingText(5), false);
  assert.strictEqual(saveWritingText('a'.repeat(4001)), false);
  assert.deepStrictEqual(state.daily, {});
});

test('saveWritingText 保存失败时撤销', function () {
  startAt(121);
  localStorage.setItem = function () {
    throw new Error('写入失败');
  };
  assert.strictEqual(saveWritingText('x'), false);
  assert.strictEqual(state.daily['121'], undefined);
});

test('备份校验接受合法的每日记录', function () {
  startAt(1);
  state.daily = { '1': { listen: true, phonics: false }, '121': { writingText: 'x' } };
  assert.deepStrictEqual(validateBackup(JSON.parse(exportBackupText())), { ok: true });
});

test('备份校验拒绝非法的每日记录', function () {
  const badDailyRecords = [
    { '0': { listen: true } },
    { '501': { listen: true } },
    { '01': { listen: true } },
    { '1': { foo: true } },
    { '1': { listen: 'yes' } },
    { '121': { writingText: 'a'.repeat(4001) } }
  ];

  badDailyRecords.forEach(function (daily) {
    startAt(1);
    state.daily = daily;
    assert.strictEqual(validateBackup(JSON.parse(exportBackupText())).reason, 'invalidDaily');
  });
});
