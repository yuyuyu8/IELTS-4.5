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

function markFirstTenLearned() {
  ensureQueue();
  for (let id = 1; id <= 10; id++) {
    assert.strictEqual(markWordLearned(id), true);
  }
}

function createElementFake() {
  return {
    textContent: '',
    className: '',
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

test('未勾选当天任务时不能完成今天', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  markFirstTenLearned();

  assert.deepStrictEqual(completeToday(), {
    ok: false,
    reason: 'checksRemaining',
    missing: ['listen', 'phonics']
  });
  assert.strictEqual(state.progress.day, 1);
});

test('只勾选一部分时仍然不能完成今天', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  markFirstTenLearned();
  setDailyCheck('listen', true);

  assert.deepStrictEqual(completeToday(), { ok: false, reason: 'checksRemaining', missing: ['phonics'] });
});

test('全部勾选后可以完成今天', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  markFirstTenLearned();
  setDailyCheck('listen', true);
  setDailyCheck('phonics', true);

  assert.deepStrictEqual(completeToday(), { ok: true, day: 2 });
});

test('第 8 天必须勾选语法', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 8;
  state.progress.refilledDay = 8;
  setDailyCheck('listen', true);

  assert.deepStrictEqual(completeToday(), { ok: false, reason: 'checksRemaining', missing: ['grammar'] });
  assert.strictEqual(state.progress.day, 8);
});

test('第 8 天勾选语法后可以完成今天', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 8;
  state.progress.refilledDay = 8;
  setDailyCheck('listen', true);
  setDailyCheck('grammar', true);

  assert.deepStrictEqual(completeToday(), { ok: true, day: 9 });
});

test('到期复习优先于每日任务检查', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.refilledDay = 2;
  state.words = { '1': record(2) };

  assert.deepStrictEqual(completeToday(), { ok: false, reason: 'reviewsRemaining', remaining: 1 });
});

test('点击完成今天时，消息列出未勾选的任务', function () {
  const ready = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  ready.forEach(function (fn) {
    fn();
  });
  for (let id = 1; id <= 10; id++) {
    assert.strictEqual(markWordLearned(id), true);
  }

  dom['complete-today-btn'].clickHandlers[0]();

  assert.strictEqual(
    dom['complete-today-msg'].textContent,
    '还有未勾选的今日任务：听力、音标。请先勾选，再点“完成今天”。'
  );
  assert.strictEqual(state.progress.day, 1);
});
