const test = require('node:test');
const assert = require('node:assert');

const { loadAppWithReadyCallbacks } = require('./helpers.js');

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
    className: '',
    value: '',
    hidden: false,
    checked: false,
    type: '',
    children: [],
    clickHandlers: [],
    changeHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    focus: function () {},
    setSelectionRange: function () {},
    addEventListener: function (type, fn) {
      if (type === 'click') {
        node.clickHandlers.push(fn);
      }
      if (type === 'change') {
        node.changeHandlers.push(fn);
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

function learningRecord() {
  return { status: 'learning', reviewStep: 0, nextReview: 100, reviewCount: 0 };
}

test('检查日完成今天时给出检查视图指引', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 50;
  state.progress.refilledDay = 50;
  state.daily['50'] = { listen: true, grammar: true };
  ready.forEach(function (fn) {
    fn();
  });

  document.getElementById('complete-today-btn').clickHandlers[0]();

  assert.strictEqual(
    document.getElementById('complete-today-msg').textContent,
    '还有未完成的今日任务：检查。“检查”请到“检查”视图完成，完成后自动勾选。'
  );
});

test('同时缺少普通任务与检查时按顺序列出全部标签', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 50;
  state.progress.refilledDay = 50;
  state.daily['50'] = { grammar: true };
  ready.forEach(function (fn) {
    fn();
  });

  document.getElementById('complete-today-btn').clickHandlers[0]();

  assert.strictEqual(
    document.getElementById('complete-today-msg').textContent,
    '还有未完成的今日任务：听力、检查。“检查”请到“检查”视图完成，完成后自动勾选。'
  );
});

test('检查进行中隐藏开始检查按钮', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 50;
  state.progress.refilledDay = 50;
  state.words = {
    '1': learningRecord(),
    '2': learningRecord(),
    '3': learningRecord(),
    '4': learningRecord(),
    '5': learningRecord()
  };
  ready.forEach(function (fn) {
    fn();
  });

  startExam(function () {
    return 0.5;
  });
  renderTestView();

  assert.strictEqual(document.getElementById('start-exam-btn').hidden, true);
  assert.strictEqual(document.getElementById('exam-progress').textContent, '第 1 / 5 题');

  renderTestView();
  assert.strictEqual(document.getElementById('exam-progress').textContent, '第 1 / 5 题');
});

test('保存失败后可以重新开始检查', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 50;
  state.progress.refilledDay = 50;
  state.words = { '1': learningRecord() };
  ready.forEach(function (fn) {
    fn();
  });

  startExam();
  const question = currentExamQuestion();
  assert.strictEqual(question.direction, 'zh2en');

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  submitSpelling('x');

  assert.strictEqual(currentExamQuestion(), null);
  assert.strictEqual(document.getElementById('start-exam-btn').hidden, false);
  assert.strictEqual(
    document.getElementById('exam-result').textContent,
    '保存失败：本地存储不可用，检查结果未保存。'
  );
  assert.strictEqual(state.tests.length, 0);
});

test('撤销确认框文字准确', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  ready.forEach(function (fn) {
    fn();
  });

  let confirmText = null;
  window.confirm = function (text) {
    confirmText = text;
    return false;
  };

  document.getElementById('undo-complete-btn').clickHandlers[0]();

  assert.strictEqual(
    confirmText,
    '撤销今天的完成，回到第 1 天。已标记“已学”的词不会恢复为未学，之后可以再次完成今天。确定吗？'
  );
  assert.strictEqual(document.getElementById('undo-complete-msg').textContent, '已取消，未撤销。');
});
