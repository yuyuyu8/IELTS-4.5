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

function makeNode() {
  const node = {
    className: '',
    hidden: false,
    children: [],
    clickHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        node.clickHandlers.push(fn);
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

function createFakeDom() {
  const ids = [
    'today-info',
    'today-words',
    'review-list',
    'daily-checks',
    'writing-box',
    'writing-text',
    'test-status',
    'progress-info',
    'undo-complete-btn',
    'undo-complete-msg'
  ];

  const elements = {};
  ids.forEach(function (id) {
    elements[id] = makeNode();
  });

  document.getElementById = function (id) {
    return elements[id] === undefined ? null : elements[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  return elements;
}

test('index.html 的设置页中存在进度与撤销元素', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const settingsIndex = html.indexOf('id="view-settings"');
  const snippets = [
    'id="progress-info"',
    '<button id="undo-complete-btn" hidden>撤销今天的完成</button>',
    'id="undo-complete-msg"'
  ];

  snippets.forEach(function (snippet) {
    const index = html.indexOf(snippet);
    assert.notStrictEqual(index, -1, '应存在 ' + snippet);
    assert.ok(index > settingsIndex, snippet + ' 应位于设置视图之内');
  });
});

test('当天未完成时不能撤销', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  const before = JSON.stringify(state);

  assert.deepStrictEqual(undoTodayCompletion(), { ok: false, reason: 'notCompletedToday' });
  assert.strictEqual(JSON.stringify(state), before);
});

test('撤销后学习日减一并清空完成日期', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  state.progress.refilledDay = 2;
  state.queue = [11, 12];
  state.nextWordId = 13;
  state.words = { '1': { status: 'learning', reviewStep: 0, nextReview: 5, reviewCount: 1 } };
  state.daily = { '1': { listen: true } };
  state.tests = [];

  const queueBefore = JSON.stringify(state.queue);
  const nextBefore = state.nextWordId;
  const wordsBefore = JSON.stringify(state.words);
  const dailyBefore = JSON.stringify(state.daily);
  const testsBefore = JSON.stringify(state.tests);

  assert.deepStrictEqual(undoTodayCompletion(), { ok: true, day: 1 });
  assert.strictEqual(state.progress.day, 1);
  assert.strictEqual(state.progress.completedDate, null);
  assert.strictEqual(JSON.stringify(state.queue), queueBefore);
  assert.strictEqual(state.nextWordId, nextBefore);
  assert.strictEqual(JSON.stringify(state.words), wordsBefore);
  assert.strictEqual(JSON.stringify(state.daily), dailyBefore);
  assert.strictEqual(JSON.stringify(state.tests), testsBefore);
});

test('撤销后可以再次完成今天', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.refilledDay = 2;
  state.queue = [];
  state.daily['2'] = { listen: true, phonics: true };

  assert.strictEqual(completeToday().ok, true);
  assert.strictEqual(state.progress.day, 3);

  const undone = undoTodayCompletion();
  assert.strictEqual(undone.ok, true);
  assert.strictEqual(state.progress.day, 2);

  assert.strictEqual(completeToday().ok, true);
  assert.strictEqual(state.progress.day, 3);
});

test('锁定时不能撤销', function () {
  loadAppScripts();
  localStorage.setItem('english3000.v1', JSON.stringify({
    version: 1,
    settings: { startDate: dateOffset(0) },
    queue: [],
    nextWordId: 11,
    words: {},
    daily: {},
    tests: [],
    progress: { day: 2, completedDate: todayString(), refilledDay: 2 }
  }));
  state = loadState();
  vocabLocked = computeVocabLocked();

  assert.strictEqual(vocabLocked, true);
  const before = JSON.stringify(state);

  assert.deepStrictEqual(undoTodayCompletion(), { ok: false, reason: 'vocabLocked' });
  assert.strictEqual(JSON.stringify(state), before);
});

test('保存失败时撤销不生效', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  const before = JSON.stringify(state);

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  assert.deepStrictEqual(undoTodayCompletion(), { ok: false, reason: 'saveFailed' });
  assert.strictEqual(state.progress.day, 2);
  assert.strictEqual(state.progress.completedDate, todayString());
  assert.strictEqual(JSON.stringify(state), before);
});

test('撤销按钮按完成状态显示', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = null;

  renderUndoButton();
  assert.strictEqual(dom['undo-complete-btn'].hidden, true);

  state.progress.completedDate = todayString();
  renderUndoButton();
  assert.strictEqual(dom['undo-complete-btn'].hidden, false);

  vocabLocked = true;
  renderUndoButton();
  assert.strictEqual(dom['undo-complete-btn'].hidden, true);
});

test('取消确认时不撤销', function () {
  const ready = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  ready.forEach(function (fn) {
    fn();
  });

  const before = JSON.stringify(state);
  window.confirm = function () {
    return false;
  };

  dom['undo-complete-btn'].clickHandlers[0]();

  assert.strictEqual(dom['undo-complete-msg'].textContent, '已取消，未撤销。');
  assert.strictEqual(JSON.stringify(state), before);
});

test('确认后撤销并更新显示', function () {
  const ready = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  ready.forEach(function (fn) {
    fn();
  });

  window.confirm = function () {
    return true;
  };

  dom['undo-complete-btn'].clickHandlers[0]();

  assert.strictEqual(dom['progress-info'].textContent, '当前学习日：第 1 天 / 500。');
  assert.strictEqual(dom['undo-complete-msg'].textContent, '已撤销今天的完成，回到第 1 天。');
  assert.strictEqual(dom['undo-complete-btn'].hidden, true);
});
