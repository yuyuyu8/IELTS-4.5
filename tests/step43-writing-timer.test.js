const test = require('node:test');
const { afterEach } = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

const realNow = Date.now;

afterEach(function () {
  Date.now = realNow;

  if (typeof stopWritingTick === 'function') {
    stopWritingTick();
  }
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
  const node = {
    hidden: false,
    className: '',
    value: '',
    href: '',
    target: '',
    rel: '',
    children: [],
    clickHandlers: [],
    inputHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        this.clickHandlers.push(fn);
      }
      if (type === 'input') {
        this.inputHandlers.push(fn);
      }
    }
  };

  let text = '';
  Object.defineProperty(node, 'textContent', {
    get: function () {
      return text;
    },
    set: function (value) {
      text = value;
      if (value === '') {
        node.children = [];
      }
    },
    configurable: true
  });

  return node;
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

function setupWritingDay() {
  loadAppScripts();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  state.progress.refilledDay = 121;
}

test('新建记录时用时为零', function () {
  setupWritingDay();

  assert.strictEqual(currentWritingSeconds(), 0);

  renderWritingTimer();
  assert.strictEqual(document.getElementById('writing-timer').textContent, '用时 00 分 00 秒');
});

test('开始计时后按秒累计', function () {
  setupWritingDay();
  const base = 1700000000000;
  Date.now = function () {
    return base;
  };

  assert.strictEqual(startWritingTimer(), true);

  Date.now = function () {
    return base + 65000;
  };

  assert.strictEqual(currentWritingSeconds(), 65);

  renderWritingTimer();
  assert.strictEqual(document.getElementById('writing-timer').textContent, '用时 01 分 05 秒');
});

test('暂停后写入累计秒数并清空开始时间', function () {
  setupWritingDay();
  const base = 1700000000000;
  Date.now = function () {
    return base;
  };
  startWritingTimer();
  Date.now = function () {
    return base + 65000;
  };

  assert.strictEqual(pauseWritingTimer(), true);

  const record = state.daily['121'];
  assert.strictEqual(record.writingSeconds, 65);
  assert.strictEqual(record.writingStartedAt, null);

  assert.strictEqual(pauseWritingTimer(), false);
});

test('重置把用时清零', function () {
  setupWritingDay();
  state.daily['121'] = { writingSeconds: 120, writingStartedAt: null };

  assert.strictEqual(resetWritingTimer(), true);

  const record = state.daily['121'];
  assert.strictEqual(record.writingSeconds, 0);
  assert.strictEqual(record.writingStartedAt, null);
});

test('当天已完成时三个计时函数都失效', function () {
  setupWritingDay();
  state.progress.completedDate = todayString();
  const before = JSON.stringify(state.daily);

  assert.strictEqual(startWritingTimer(), false);
  assert.strictEqual(pauseWritingTimer(), false);
  assert.strictEqual(resetWritingTimer(), false);
  assert.strictEqual(JSON.stringify(state.daily), before);
});

test('字数按空白分段统计并提示差额', function () {
  setupWritingDay();
  const input = document.getElementById('writing-text');
  const count = document.getElementById('writing-count');

  input.value = 'one two three';
  renderWritingCount();
  assert.strictEqual(count.textContent, '已写 3 词，要求至少 150 词。（还差 147 词）');

  const words = [];
  for (let i = 0; i < 150; i++) {
    words.push('word');
  }
  input.value = words.join(' ');
  renderWritingCount();
  assert.strictEqual(count.textContent.indexOf('（还差'), -1);
});

test('空文本字数为零', function () {
  setupWritingDay();
  const input = document.getElementById('writing-text');

  input.value = '';
  assert.strictEqual(writingWordCount(input.value), 0);

  input.value = '   \n\t  ';
  assert.strictEqual(writingWordCount(input.value), 0);
});

test('输入事件会更新字数显示', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  state.progress.refilledDay = 121;
  ready.forEach(function (fn) {
    fn();
  });

  const input = document.getElementById('writing-text');
  const count = document.getElementById('writing-count');

  input.value = 'alpha beta';
  input.inputHandlers[0]();

  assert.strictEqual(count.textContent.indexOf('已写 2 词'), 0);
});

test('备份校验接受计时字段并拒绝非法值', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.daily = { '121': { writingText: 'x', writingSeconds: 0, writingStartedAt: null } };

  const data = JSON.parse(exportBackupText());
  assert.deepStrictEqual(validateBackup(data), { ok: true });

  data.daily['121'].writingSeconds = -1;
  assert.strictEqual(validateBackup(data).reason, 'invalidDaily');

  data.daily['121'].writingSeconds = 0;
  data.daily['121'].writingStartedAt = 'abc';
  assert.strictEqual(validateBackup(data).reason, 'invalidDaily');
});
