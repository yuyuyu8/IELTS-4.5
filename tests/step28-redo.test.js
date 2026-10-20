const test = require('node:test');
const { afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

afterEach(function () {
  delete globalThis.confirm;
});

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function record(nextReview, reviewCount) {
  return { status: 'learning', reviewStep: 0, nextReview: nextReview, reviewCount: reviewCount };
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

function tenUnreviewedWords() {
  const words = {};
  for (let id = 1; id <= 10; id++) {
    words[String(id)] = record(2, 0);
  }
  return words;
}

test('撤销把今天标记的词放回待学列表', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  state.words = tenUnreviewedWords();
  state.queue = [];
  state.nextWordId = 11;

  assert.deepStrictEqual(undoTodayCompletion(), { ok: true, day: 1, restored: 10 });
  assert.deepStrictEqual(state.queue, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepStrictEqual(state.words, {});
  assert.strictEqual(state.nextWordId, 11);
});

test('已复习过的词不放回', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  state.words = { '1': record(2, 1), '2': record(2, 0) };

  assert.deepStrictEqual(undoTodayCompletion(), { ok: true, day: 1, restored: 1 });
  assert.deepStrictEqual(state.queue, [2]);
  assert.deepStrictEqual(state.words, { '1': record(2, 1) });
});

test('复习起点不在当前学习日的词不放回', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  state.words = { '1': record(3, 0), '2': record(2, 0) };

  assert.deepStrictEqual(undoTodayCompletion(), { ok: true, day: 1, restored: 1 });
  assert.deepStrictEqual(state.queue, [2]);
  assert.deepStrictEqual(state.words, { '1': record(3, 0) });
});

test('原有队列项保留且在放回项之后', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  state.words = { '1': record(2, 0) };
  state.queue = [11, 12];
  state.nextWordId = 13;

  assert.deepStrictEqual(undoTodayCompletion(), { ok: true, day: 1, restored: 1 });
  assert.deepStrictEqual(state.queue, [1, 11, 12]);
});

test('勾选与检查记录保留', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  state.words = { '1': record(2, 0) };
  state.daily = { '1': { listen: true, phonics: true } };
  state.tests = [{
    day: 2,
    date: dateOffset(-1),
    total: 1,
    correct: 1,
    details: [{ wordId: 1, direction: 'zh2en', correct: true }]
  }];

  const dailyBefore = JSON.stringify(state.daily);
  const testsBefore = JSON.stringify(state.tests);

  undoTodayCompletion();

  assert.strictEqual(JSON.stringify(state.daily), dailyBefore);
  assert.strictEqual(JSON.stringify(state.tests), testsBefore);
});

test('撤销后可以重新标记并再次完成今天', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  state.progress.refilledDay = 1;
  state.daily['1'] = { listen: true, phonics: true };
  state.queue = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  state.nextWordId = 11;

  for (let id = 1; id <= 10; id++) {
    assert.strictEqual(markWordLearned(id), true);
  }
  assert.strictEqual(completeToday().ok, true);

  const undone = undoTodayCompletion();
  assert.strictEqual(undone.ok, true);
  assert.deepStrictEqual(state.queue, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.deepStrictEqual(state.words, {});

  assert.strictEqual(markWordLearned(1), true);
  for (let id = 2; id <= 10; id++) {
    assert.strictEqual(markWordLearned(id), true);
  }

  const completed = completeToday();
  assert.strictEqual(completed.ok, true);
  assert.strictEqual(state.progress.day, 2);
});

test('保存失败时全部回滚', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  state.words = { '1': record(2, 0) };
  state.queue = [11];

  const dayBefore = state.progress.day;
  const dateBefore = state.progress.completedDate;
  const wordsBefore = JSON.stringify(state.words);
  const queueBefore = JSON.stringify(state.queue);

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  assert.deepStrictEqual(undoTodayCompletion(), { ok: false, reason: 'saveFailed' });
  assert.strictEqual(state.progress.day, dayBefore);
  assert.strictEqual(state.progress.completedDate, dateBefore);
  assert.strictEqual(JSON.stringify(state.words), wordsBefore);
  assert.strictEqual(JSON.stringify(state.queue), queueBefore);
});

test('确认框按放回词数给出不同文字', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  state.words = tenUnreviewedWords();
  ready.forEach(function (fn) {
    fn();
  });

  let captured = null;
  globalThis.confirm = function (text) {
    captured = text;
    return false;
  };

  document.getElementById('undo-complete-btn').clickHandlers[0]();
  assert.strictEqual(
    captured,
    '撤销今天的完成，回到第 1 天。今天标记为已学的 10 个词会回到待学列表。确定吗？'
  );

  state.words = {};
  captured = null;
  document.getElementById('undo-complete-btn').clickHandlers[0]();
  assert.strictEqual(captured, '撤销今天的完成，回到第 1 天。今天没有标记新的词。确定吗？');
});

test('按钮文字与成功消息', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  assert.ok(
    html.indexOf('<button id="undo-complete-btn" hidden>重做今天</button>') !== -1,
    '设置页按钮文字应为重做今天'
  );

  const firstReady = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  state.words = tenUnreviewedWords();
  firstReady.forEach(function (fn) {
    fn();
  });

  globalThis.confirm = function () {
    return true;
  };
  document.getElementById('undo-complete-btn').clickHandlers[0]();
  assert.strictEqual(
    document.getElementById('undo-complete-msg').textContent,
    '已撤销今天的完成，回到第 1 天，10 个词回到待学列表。'
  );

  const secondReady = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.completedDate = todayString();
  state.words = {};
  secondReady.forEach(function (fn) {
    fn();
  });

  globalThis.confirm = function () {
    return true;
  };
  document.getElementById('undo-complete-btn').clickHandlers[0]();
  assert.strictEqual(
    document.getElementById('undo-complete-msg').textContent,
    '已撤销今天的完成，回到第 1 天。'
  );
});
