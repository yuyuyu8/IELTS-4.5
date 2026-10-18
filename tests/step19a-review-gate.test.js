const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function record(nextReview) {
  return { status: 'learning', reviewStep: 0, nextReview: nextReview, reviewCount: 0 };
}

function makeNode() {
  const node = {
    children: [],
    clickHandlers: [],
    className: '',
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

function setupDueDay(dueIds) {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.refilledDay = 2;
  state.words = {};
  dueIds.forEach(function (id) {
    state.words[String(id)] = record(2);
  });
}

function startWithFakeDom(prepare) {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const elements = {
    'complete-today-btn': makeNode(),
    'complete-today-msg': makeNode(),
    'today-info': makeNode(),
    'today-words': makeNode()
  };

  document.getElementById = function (id) {
    return elements[id] === undefined ? null : elements[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  prepare();
  readyCallbacks.forEach(function (fn) {
    fn();
  });

  return elements;
}

test('有到期复习时不能完成今天', function () {
  setupDueDay([1]);

  assert.deepStrictEqual(completeToday(), {
    ok: false,
    reason: 'reviewsRemaining',
    remaining: 1
  });
  assert.strictEqual(state.progress.day, 2);
});

test('作答完全部到期复习后才能完成今天', function () {
  setupDueDay([1, 2]);

  assert.strictEqual(answerReview(1, 'known'), true);
  assert.deepStrictEqual(completeToday(), {
    ok: false,
    reason: 'reviewsRemaining',
    remaining: 1
  });

  assert.strictEqual(answerReview(2, 'fuzzy'), true);
  assert.deepStrictEqual(completeToday(), { ok: true, day: 3 });
});

test('新词检查先于复习检查', function () {
  setupDueDay([1]);
  state.queue = [5];

  assert.deepStrictEqual(completeToday(), {
    ok: false,
    reason: 'wordsRemaining',
    remaining: 1
  });
});

test('点击完成今天时提示剩余到期复习数量', function () {
  const elements = startWithFakeDom(function () {
    state.settings.startDate = dateOffset(0);
    state.progress.day = 2;
    state.progress.refilledDay = 2;
    state.words = { '1': record(2) };
  });

  elements['complete-today-btn'].clickHandlers[0]();

  assert.strictEqual(
    elements['complete-today-msg'].textContent,
    '还有 1 个到期复习未作答，请先到复习视图全部作答。'
  );
  assert.strictEqual(state.progress.day, 2);
});
