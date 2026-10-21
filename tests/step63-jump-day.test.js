const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

const realConfirm = globalThis.confirm;

test.afterEach(function () {
  globalThis.confirm = realConfirm;
});

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function makeNode() {
  return {
    hidden: false,
    className: '',
    value: '',
    textContent: '',
    children: [],
    clickHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        this.clickHandlers.push(fn);
      }
    },
    focus: function () {},
    setSelectionRange: function () {}
  };
}

function installFakeDocument() {
  const cache = {};

  document.getElementById = function (id) {
    if (cache[id] === undefined) {
      cache[id] = makeNode();
    }
    return cache[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  return cache;
}

function setupDirect() {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
}

function setupUi() {
  const ready = loadAppWithReadyCallbacks();
  const cache = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  ready.forEach(function (fn) {
    fn();
  });
  return cache;
}

test('跳到第 61 天只改学习日与补词状态', function () {
  setupDirect();
  const queueBefore = state.queue.slice();
  const wordsBefore = JSON.parse(JSON.stringify(state.words));
  const dailyBefore = JSON.parse(JSON.stringify(state.daily));

  assert.strictEqual(jumpToDay(61), true);
  assert.strictEqual(state.progress.day, 61);
  assert.strictEqual(state.progress.refilledDay, 60);
  assert.strictEqual(state.progress.completedDate, null);
  assert.deepStrictEqual(state.queue, queueBefore);
  assert.deepStrictEqual(state.words, wordsBefore);
  assert.deepStrictEqual(state.daily, dailyBefore);
});

test('拒绝越界与非整数学习日', function () {
  setupDirect();

  assert.strictEqual(jumpToDay(0), false);
  assert.strictEqual(jumpToDay(501), false);
  assert.strictEqual(jumpToDay(1.5), false);
  assert.strictEqual(state.progress.day, 1);
});

test('学习锁定时不能跳转', function () {
  setupDirect();
  vocabLocked = true;

  assert.strictEqual(jumpToDay(61), false);
  assert.strictEqual(state.progress.day, 1);
});

test('保存失败时恢复三个字段', function () {
  setupDirect();
  localStorage.setItem = function () {
    throw new Error('storage unavailable');
  };

  assert.strictEqual(jumpToDay(61), false);
  assert.strictEqual(state.progress.day, 1);
  assert.strictEqual(state.progress.refilledDay, 0);
  assert.strictEqual(state.progress.completedDate, null);
});

test('点击按钮并确认后跳转', function () {
  const cache = setupUi();
  globalThis.confirm = function () {
    return true;
  };

  document.getElementById('jump-day-input').value = '61';
  document.getElementById('jump-day-btn').clickHandlers[0]();

  assert.strictEqual(state.progress.day, 61);
  assert.strictEqual(document.getElementById('jump-day-msg').textContent, '已跳到第 61 天。');
});

test('空值或非数字给出提示且不跳转', function () {
  const cache = setupUi();
  globalThis.confirm = function () {
    throw new Error('不应询问');
  };
  const button = document.getElementById('jump-day-btn').clickHandlers[0];

  document.getElementById('jump-day-input').value = '';
  button();
  assert.strictEqual(
    document.getElementById('jump-day-msg').textContent,
    '请输入 1 到 500 之间的整数。'
  );

  document.getElementById('jump-day-input').value = 'abc';
  button();
  assert.strictEqual(
    document.getElementById('jump-day-msg').textContent,
    '请输入 1 到 500 之间的整数。'
  );
  assert.strictEqual(state.progress.day, 1);
});

test('取消确认时不跳转', function () {
  const cache = setupUi();
  globalThis.confirm = function () {
    return false;
  };

  document.getElementById('jump-day-input').value = '61';
  document.getElementById('jump-day-btn').clickHandlers[0]();

  assert.strictEqual(document.getElementById('jump-day-msg').textContent, '已取消。');
  assert.strictEqual(state.progress.day, 1);
});
