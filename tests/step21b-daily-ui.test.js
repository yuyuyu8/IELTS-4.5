const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function createElementFake() {
  return {
    textContent: '',
    className: '',
    type: '',
    checked: false,
    hidden: false,
    value: '',
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

function createFakeDom() {
  const elements = {
    'today-info': createContainerFake(),
    'daily-checks': createContainerFake(),
    'today-words': createContainerFake(),
    'writing-box': createElementFake(),
    'writing-text': createElementFake(),
    'writing-msg': createElementFake(),
    'save-writing-btn': createElementFake()
  };

  document.getElementById = function (id) {
    return elements[id] === undefined ? null : elements[id];
  };

  document.createElement = function () {
    return createElementFake();
  };

  return elements;
}

test('index.html 的今天视图中存在今日任务与作文框的元素', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const todayIndex = html.indexOf('id="view-today"');
  const reviewIndex = html.indexOf('id="view-review"');
  const snippets = [
    '<div id="daily-checks"></div>',
    '<div id="writing-box" hidden>',
    '<textarea id="writing-text"',
    '<button id="save-writing-btn">保存作文</button>',
    '<p id="writing-msg"></p>'
  ];

  snippets.forEach(function (snippet) {
    const index = html.indexOf(snippet);
    assert.notStrictEqual(index, -1, '应存在 ' + snippet);
    assert.ok(index > todayIndex && index < reviewIndex, snippet + ' 应位于今天视图之内');
  });
});

test('第 1 天渲染听力与音标两个勾选项', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderToday();

  const checks = dom['daily-checks'].children;
  assert.strictEqual(checks.length, 3);
  assert.strictEqual(checks[1].children[1].textContent, '听力');
  assert.strictEqual(checks[2].children[1].textContent, '音标');
});

test('点击勾选框会保存勾选状态，重新渲染后仍保持勾选', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderToday();

  const box = dom['daily-checks'].children[1].children[0];
  box.checked = true;
  box.clickHandlers[0]();

  assert.strictEqual(state.daily['1'].listen, true);
  assert.strictEqual(dom['daily-checks'].children.length, 3);
  assert.strictEqual(dom['daily-checks'].children[1].children[0].checked, true);
});

test('当天完成后不显示勾选项，作文框也隐藏', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  renderToday();

  assert.strictEqual(dom['daily-checks'].children.length, 0);
  assert.strictEqual(dom['writing-box'].hidden, true);
});

test('第 121 天显示作文框并回填已保存的文字', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  state.daily = { '121': { writingText: 'hello' } };
  renderToday();

  assert.strictEqual(dom['writing-box'].hidden, false);
  assert.strictEqual(dom['writing-text'].value, 'hello');
  assert.strictEqual(dom['daily-checks'].children.length, 4);
});

test('没有写作任务的日子，作文框隐藏', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderToday();

  assert.strictEqual(dom['writing-box'].hidden, true);
});

test('点击保存作文后写入当天记录并提示', function () {
  const ready = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  ready.forEach(function (fn) {
    fn();
  });

  dom['writing-text'].value = 'my essay';
  dom['save-writing-btn'].clickHandlers[0]();

  assert.strictEqual(state.daily['121'].writingText, 'my essay');
  assert.strictEqual(dom['writing-msg'].textContent, '已保存作文。');
});

test('作文超过 4000 字时提示，且不清空输入框', function () {
  const ready = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  ready.forEach(function (fn) {
    fn();
  });

  dom['writing-text'].value = 'a'.repeat(4001);
  dom['save-writing-btn'].clickHandlers[0]();

  assert.strictEqual(dom['writing-msg'].textContent, '作文超过 4000 字，请删减后再保存。');
  assert.strictEqual(dom['writing-text'].value.length, 4001);
  assert.strictEqual(state.daily['121'], undefined);
});

test('页面加载后保存作文按钮只绑定一个 click 回调', function () {
  const ready = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  ready.forEach(function (fn) {
    fn();
  });

  assert.strictEqual(dom['save-writing-btn'].clickHandlers.length, 1);
});
