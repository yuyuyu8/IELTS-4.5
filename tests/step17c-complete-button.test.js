const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppWithReadyCallbacks } = require('./helpers.js');

function createElementFake() {
  return {
    textContent: '',
    className: '',
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
    'start-date': createElementFake(),
    'start-date-msg': createElementFake(),
    'save-start-date': createElementFake(),
    'complete-today-btn': createElementFake(),
    'complete-today-msg': createElementFake(),
    'today-info': createContainerFake(),
    'today-words': createContainerFake()
  };

  document.getElementById = function (id) {
    return elements[id] === undefined ? null : elements[id];
  };

  document.createElement = function () {
    return createElementFake();
  };

  return elements;
}

function textsOf(container) {
  return container.children.map(function (child) {
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

function allChecks() {
  return { listen: true, phonics: true, reading: true, writing: true, grammar: true };
}

function startWithReadyCallbacks(startDate) {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  state.settings.startDate = startDate;
  readyCallbacks.forEach(function (fn) {
    fn();
  });
  return dom;
}

function markFirstTenLearned() {
  for (let id = 1; id <= 10; id++) {
    assert.strictEqual(markWordLearned(id), true);
  }
}

test('完成今天按钮只绑定一个 click 回调', function () {
  const dom = startWithReadyCallbacks(dateOffset(0));
  assert.strictEqual(dom['complete-today-btn'].clickHandlers.length, 1);
});

test('未标记完新词时点击完成今天只提示剩余数量', function () {
  const dom = startWithReadyCallbacks(dateOffset(0));

  dom['complete-today-btn'].clickHandlers[0]();

  assert.strictEqual(
    dom['complete-today-msg'].textContent,
    '还有 10 个新词未标记为已学，请先全部标记。'
  );
  assert.strictEqual(state.progress.day, 1);
});

test('标记完全部新词后点击完成今天，进入下一学习日并隐藏列表', function () {
  const dom = startWithReadyCallbacks(dateOffset(0));
  markFirstTenLearned();
  renderTodayWords();

  state.daily['1'] = allChecks();
  dom['complete-today-btn'].clickHandlers[0]();

  assert.strictEqual(dom['complete-today-msg'].textContent, '已完成今天。');
  assert.strictEqual(state.progress.day, 2);
  assert.strictEqual(dom['today-words'].children.length, 0);
  assert.deepStrictEqual(textsOf(dom['today-info']), ['今天已完成，明天进入第 2 天。']);
});

test('同一天第二次点击完成今天会提示已经完成', function () {
  const dom = startWithReadyCallbacks(dateOffset(0));
  markFirstTenLearned();

  state.daily['1'] = allChecks();
  dom['complete-today-btn'].clickHandlers[0]();
  dom['complete-today-btn'].clickHandlers[0]();

  assert.strictEqual(dom['complete-today-msg'].textContent, '今天已经完成过了。');
  assert.strictEqual(state.progress.day, 2);
});

test('index.html 的今天视图中存在完成今天按钮与消息段落', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const todayIndex = html.indexOf('id="view-today"');
  const buttonIndex = html.indexOf('<button id="complete-today-btn">完成今天</button>');
  const msgIndex = html.indexOf('<p id="complete-today-msg"></p>');
  const reviewIndex = html.indexOf('id="view-review"');

  assert.notStrictEqual(buttonIndex, -1, '应存在完成今天按钮');
  assert.notStrictEqual(msgIndex, -1, '应存在完成今天的消息段落');
  assert.ok(todayIndex !== -1 && todayIndex < buttonIndex && buttonIndex < reviewIndex, '按钮应位于今天视图内');
  assert.ok(todayIndex < msgIndex && msgIndex < reviewIndex, '消息段落应位于今天视图内');
});
