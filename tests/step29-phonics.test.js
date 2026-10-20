const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { REPO_ROOT, loadAppScripts } = require('./helpers.js');

const EXPECTED_DAY_COUNTS = [7, 7, 6, 6, 6, 6, 6];

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function loadRealData() {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'data.js' });
  return sandbox.window;
}

function makeNode() {
  return {
    textContent: '',
    className: '',
    children: [],
    clickHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        this.clickHandlers.push(fn);
      }
    }
  };
}

function createContainerFake() {
  return {
    children: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    set textContent(value) {
      if (value === '') {
        this.children = [];
      }
    }
  };
}

function installPhonicsDom() {
  const container = createContainerFake();

  document.getElementById = function (id) {
    if (id === 'phonics-list') {
      return container;
    }
    return null;
  };
  document.createElement = function () {
    return makeNode();
  };

  return container;
}

test('PHONICS 共 44 条且按天分布正确', function () {
  const data = loadRealData();

  assert.strictEqual(data.PHONICS.length, 44);

  data.PHONICS.forEach(function (item, index) {
    assert.strictEqual(item.no, index + 1);
  });

  const counts = [0, 0, 0, 0, 0, 0, 0];
  data.PHONICS.forEach(function (item) {
    counts[item.day - 1] += 1;
  });

  assert.deepStrictEqual(counts, EXPECTED_DAY_COUNTS);
});

test('每条音标的字段完整且不含网址', function () {
  const data = loadRealData();
  const seen = new Set();

  data.PHONICS.forEach(function (item) {
    ['symbol', 'tip', 'spellings'].forEach(function (field) {
      assert.strictEqual(typeof item[field], 'string', '第 ' + item.no + ' 条的 ' + field + ' 不是字符串');
      assert.ok(item[field].length > 0, '第 ' + item.no + ' 条的 ' + field + ' 为空');
      assert.strictEqual(item[field].indexOf('http://'), -1);
      assert.strictEqual(item[field].indexOf('https://'), -1);
    });

    assert.ok(Array.isArray(item.examples), '第 ' + item.no + ' 条的 examples 不是数组');
    assert.ok(item.examples.length === 2 || item.examples.length === 3,
      '第 ' + item.no + ' 条的例词数量为 ' + item.examples.length);

    item.examples.forEach(function (example) {
      assert.strictEqual(typeof example, 'string');
      assert.ok(example.length > 0, '第 ' + item.no + ' 条存在空例词');
      assert.strictEqual(example.indexOf('http://'), -1);
      assert.strictEqual(example.indexOf('https://'), -1);
    });

    assert.strictEqual(seen.has(item.symbol), false, '重复的音标：' + item.symbol);
    seen.add(item.symbol);
  });
});

test('phonicsEndDay 为 30 且第 31 天起不再有音标', function () {
  loadAppScripts();

  assert.strictEqual(PLAN.phonicsEndDay, 30);
  assert.strictEqual(getDayInfoByDay(1).phonicsToday, true);
  assert.strictEqual(getDayInfoByDay(30).phonicsToday, true);
  assert.strictEqual(getDayInfoByDay(31).phonicsToday, false);
  assert.strictEqual('phonicsWeek' in getDayInfoByDay(1), false);
});

test('phonicsForDay 按 7 天一轮循环', function () {
  loadAppScripts();

  assert.strictEqual(phonicsForDay(1).length, 7);
  assert.strictEqual(phonicsForDay(7).length, 6);

  const day1 = phonicsForDay(1).map(function (item) {
    return item.symbol;
  });
  const day8 = phonicsForDay(8).map(function (item) {
    return item.symbol;
  });
  const day29 = phonicsForDay(29).map(function (item) {
    return item.symbol;
  });
  const day2 = phonicsForDay(2).map(function (item) {
    return item.symbol;
  });
  const day30 = phonicsForDay(30).map(function (item) {
    return item.symbol;
  });

  assert.deepStrictEqual(day8, day1);
  assert.deepStrictEqual(day29, day1);
  assert.deepStrictEqual(day30, day2);

  assert.deepStrictEqual(phonicsForDay(0), []);
  assert.deepStrictEqual(phonicsForDay(31), []);
  assert.deepStrictEqual(phonicsForDay(500), []);
});

test('第 1 天渲染标题与音素块结构', function () {
  loadAppScripts();
  const container = installPhonicsDom();
  state.settings.startDate = dateOffset(0);

  renderPhonics();

  assert.strictEqual(container.children.length, 8);
  assert.strictEqual(container.children[0].textContent, '今日音标（第 1 / 30 天，共 7 个）：');

  const item = container.children[1];
  assert.strictEqual(item.className, 'phonics-item');
  assert.strictEqual(item.children[0].className, 'phonics-symbol');
  assert.strictEqual(item.children[0].textContent, '/ɪ/');
  assert.strictEqual(item.children[1].className, 'phonics-play');
  assert.strictEqual(item.children[1].textContent, '听');
  assert.strictEqual(item.children[2].className, 'phonics-actions');
});

test('例词按钮逐个绑定且读的是自己的例词', function () {
  loadAppScripts();
  const container = installPhonicsDom();
  state.settings.startDate = dateOffset(0);

  const calls = [];
  window.speakWord = function (text) {
    calls.push(text);
  };

  renderPhonics();

  const actions = container.children[1].children[2];
  assert.strictEqual(actions.children.length, 3);
  assert.deepStrictEqual(
    actions.children.map(function (button) {
      return button.textContent;
    }),
    ['sit', 'big', 'this']
  );

  actions.children[0].clickHandlers[0]();
  actions.children[2].clickHandlers[0]();

  assert.deepStrictEqual(calls, ['sit', 'this']);
});

test('第 8 天仍在循环，第 31 天不再显示', function () {
  loadAppScripts();
  const container = installPhonicsDom();
  state.settings.startDate = dateOffset(0);

  state.progress.day = 8;
  renderPhonics();
  assert.strictEqual(container.children[0].textContent, '今日音标（第 8 / 30 天，共 7 个）：');
  assert.strictEqual(container.children[1].children[0].textContent, '/ɪ/');

  state.progress.day = 31;
  renderPhonics();
  assert.strictEqual(container.children.length, 0);
});

test('当天已完成时不显示音标', function () {
  loadAppScripts();
  const container = installPhonicsDom();
  state.settings.startDate = dateOffset(0);
  state.progress.completedDate = todayString();

  renderPhonics();

  assert.strictEqual(container.children.length, 0);
});

test('锁定时不显示音标', function () {
  loadAppScripts();
  const container = installPhonicsDom();
  state.settings.startDate = dateOffset(0);
  vocabLocked = true;

  renderPhonics();

  assert.strictEqual(container.children.length, 0);
});

test('index.html 的今天视图中存在 phonics-list 容器', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const listIndex = html.indexOf('<div id="phonics-list"></div>');
  const infoIndex = html.indexOf('<div id="today-info"></div>');
  const checksIndex = html.indexOf('<div id="daily-checks"></div>');

  assert.notStrictEqual(listIndex, -1, '应存在 phonics-list 容器');
  assert.ok(infoIndex !== -1 && infoIndex < listIndex, 'phonics-list 应位于 today-info 之后');
  assert.ok(checksIndex !== -1 && listIndex < checksIndex, 'phonics-list 应位于 daily-checks 之前');
});
