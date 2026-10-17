const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

function createFakeContainer() {
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

function createElementFake() {
  return {
    textContent: '',
    className: '',
    children: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function () {}
  };
}

function createFakeDom() {
  const container = createFakeContainer();

  document.getElementById = function (id) {
    if (id === 'today-words') {
      return container;
    }
    return null;
  };

  document.createElement = function () {
    return createElementFake();
  };

  return container;
}

function createFullFakeDom() {
  const todayInfo = createFakeContainer();
  const todayWords = createFakeContainer();

  document.getElementById = function (id) {
    if (id === 'today-info') {
      return todayInfo;
    }
    if (id === 'today-words') {
      return todayWords;
    }
    return null;
  };

  document.createElement = function () {
    return createElementFake();
  };

  return { todayInfo: todayInfo, todayWords: todayWords };
}

function textsOf(container) {
  return container.children.map(function (child) {
    if (child.children && child.children.length > 0) {
      return child.children[0].textContent;
    }
    return child.textContent;
  });
}

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

test('index.html 的今天视图中存在 today-words 容器', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const wordsIndex = html.indexOf('<div id="today-words"></div>');
  const infoIndex = html.indexOf('<div id="today-info"></div>');
  const reviewIndex = html.indexOf('id="view-review"');

  assert.notStrictEqual(wordsIndex, -1, '应存在 <div id="today-words"></div>');
  assert.ok(infoIndex !== -1 && infoIndex < wordsIndex, 'today-words 应位于 today-info 之后');
  assert.ok(reviewIndex !== -1 && wordsIndex < reviewIndex, 'today-words 应位于 view-review 之前');
});

test('未设置开始日期时不渲染新词列表', function () {
  loadAppScripts();
  const container = createFakeDom();
  renderTodayWords();

  assert.strictEqual(container.children.length, 0);
});

test('第 1 天渲染 10 条新词', function () {
  loadAppScripts();
  const container = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  const texts = textsOf(container);
  assert.strictEqual(texts[0], '今日新词（共 10 个）：');
  assert.strictEqual(texts[1], '1. apple n. 名词 苹果');
  assert.strictEqual(texts[10], '10. luckily adv. 副词 幸运地');
  assert.strictEqual(container.children.length, 11);
});

test('第 61 天渲染 15 条新词', function () {
  loadAppScripts();
  const container = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 61;
  renderTodayWords();

  const texts = textsOf(container);
  assert.strictEqual(texts[0], '今日新词（共 15 个）：');
  assert.strictEqual(container.children.length, 16);
});

test('第 270 天提示今日无新词', function () {
  loadAppScripts();
  const container = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 270;
  renderTodayWords();

  assert.deepStrictEqual(textsOf(container), ['今日无新词。']);
});

test('第 501 天（已完成）不渲染任何内容', function () {
  loadAppScripts();
  const container = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 501;
  renderTodayWords();

  assert.strictEqual(container.children.length, 0);
});

test('重复渲染不叠加内容', function () {
  loadAppScripts();
  const container = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();
  renderTodayWords();

  assert.strictEqual(container.children.length, 11);
});

test('页面加载时自动渲染今日新词', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFullFakeDom();
  state.settings.startDate = dateOffset(0);
  readyCallbacks.forEach(function (fn) {
    fn();
  });

  const texts = textsOf(dom.todayWords);
  assert.strictEqual(dom.todayWords.children.length, 11);
  assert.strictEqual(texts[0], '今日新词（共 10 个）：');
});
