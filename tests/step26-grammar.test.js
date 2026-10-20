const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { REPO_ROOT, loadAppScripts } = require('./helpers.js');

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

function installTodayDom() {
  const container = {
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

  document.getElementById = function (id) {
    if (id === 'today-info') {
      return container;
    }
    return null;
  };
  document.createElement = function () {
    return { textContent: '' };
  };

  return container;
}

function textsOf(container) {
  return container.children.map(function (child) {
    return child.textContent;
  });
}

test('GRAMMAR 共 120 条且学习日按间隔排列', function () {
  const data = loadRealData();

  assert.strictEqual(data.GRAMMAR.length, 120);

  data.GRAMMAR.forEach(function (item, index) {
    assert.strictEqual(item.no, index + 1);
    assert.strictEqual(
      item.day,
      data.PLAN.grammarStartDay + index * data.PLAN.grammarEvery,
      '第 ' + item.no + ' 条的学习日不正确'
    );
  });

  assert.strictEqual(data.GRAMMAR[119].day, 484);
});

test('每条语法点的字段完整且不含网址', function () {
  const data = loadRealData();

  data.GRAMMAR.forEach(function (item) {
    ['name', 'points', 'example', 'translation'].forEach(function (field) {
      assert.strictEqual(typeof item[field], 'string', '第 ' + item.no + ' 条的 ' + field + ' 不是字符串');
      assert.ok(item[field].length > 0, '第 ' + item.no + ' 条的 ' + field + ' 为空');
      assert.strictEqual(item[field].indexOf('http://'), -1);
      assert.strictEqual(item[field].indexOf('https://'), -1);
    });
  });
});

test('语法点名称互不相同', function () {
  const data = loadRealData();
  const seen = new Set();

  data.GRAMMAR.forEach(function (item) {
    assert.strictEqual(seen.has(item.name), false, '重复的语法点：' + item.name);
    seen.add(item.name);
  });
});

test('grammarPointFor 按间隔返回序号并在末尾循环', function () {
  loadAppScripts();

  const day8 = grammarPointFor(8);
  assert.strictEqual(day8.index, 0);
  assert.strictEqual(day8.review, false);

  assert.strictEqual(grammarPointFor(9), null);

  const day12 = grammarPointFor(12);
  assert.strictEqual(day12.index, 1);
  assert.strictEqual(day12.review, false);

  const day484 = grammarPointFor(484);
  assert.strictEqual(day484.index, 119);
  assert.strictEqual(day484.review, false);

  const day488 = grammarPointFor(488);
  assert.strictEqual(day488.index, 0);
  assert.strictEqual(day488.review, true);

  const day500 = grammarPointFor(500);
  assert.strictEqual(day500.index, 3);
  assert.strictEqual(day500.review, true);

  assert.strictEqual(grammarPointFor(0), null);
  assert.strictEqual(grammarPointFor(501), null);
});

test('第 8 天的今天视图显示当天语法点的四行', function () {
  loadAppScripts();
  const container = installTodayDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 8;

  renderToday();

  const texts = textsOf(container);
  const item = GRAMMAR[0];

  assert.ok(texts.indexOf('今日语法：' + item.name) !== -1);
  assert.ok(texts.indexOf('要点：' + item.points) !== -1);
  assert.ok(texts.indexOf('例句：' + item.example) !== -1);
  assert.ok(texts.indexOf('译文：' + item.translation) !== -1);
});

test('第 488 天的今天视图标注为复习', function () {
  loadAppScripts();
  const container = installTodayDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 488;

  renderToday();

  const texts = textsOf(container);
  assert.ok(texts.indexOf('今日语法（复习）：' + GRAMMAR[0].name) !== -1);
});

test('当天已完成时不显示语法行', function () {
  loadAppScripts();
  const container = installTodayDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 8;
  state.progress.completedDate = todayString();

  renderToday();

  const texts = textsOf(container);
  assert.strictEqual(
    texts.some(function (text) {
      return text.indexOf('今日语法') === 0;
    }),
    false
  );
});
