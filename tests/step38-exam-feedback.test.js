const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function record(nextReview, reviewStep, reviewCount) {
  return {
    status: 'learning',
    reviewStep: reviewStep,
    nextReview: nextReview,
    reviewCount: reviewCount
  };
}

function mastered(reviewStep, reviewCount) {
  return {
    status: 'mastered',
    reviewStep: reviewStep,
    nextReview: null,
    reviewCount: reviewCount
  };
}

function makeNode() {
  return {
    hidden: false,
    className: '',
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

function installFakeDocument() {
  const nodes = {
    'today-info': createContainerFake()
  };

  document.getElementById = function (id) {
    return nodes[id] === undefined ? null : nodes[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  return nodes;
}

function setupExam(words, results) {
  loadAppScripts();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 50;
  state.progress.refilledDay = 50;
  state.words = words;

  examState = {
    questions: results.map(function (item) {
      return { wordId: item.wordId, direction: item.direction };
    }),
    index: results.length,
    results: results
  };
}

test('答错的已掌握词退回学习状态并排在次日', function () {
  setupExam(
    { '1': mastered(7, 5) },
    [{ wordId: 1, direction: 'zh2en', correct: false }]
  );

  assert.deepStrictEqual(finishExam(), { ok: true, correct: 0, total: 1 });
  assert.deepStrictEqual(state.words['1'], {
    status: 'learning',
    reviewStep: 5,
    nextReview: 51,
    reviewCount: 6
  });
});

test('答错的学习中词退两格', function () {
  setupExam(
    { '1': record(30, 1, 2) },
    [{ wordId: 1, direction: 'en2zh', correct: false }]
  );

  finishExam();
  assert.strictEqual(state.words['1'].reviewStep, 0);
  assert.strictEqual(state.words['1'].nextReview, 51);
  assert.strictEqual(state.words['1'].reviewCount, 3);
});

test('全部答对时不改动任何词', function () {
  const words = {
    '1': record(30, 1, 2),
    '2': mastered(7, 5)
  };
  setupExam(words, [
    { wordId: 1, direction: 'zh2en', correct: true },
    { wordId: 2, direction: 'en2zh', correct: true }
  ]);

  const before = JSON.stringify(state.words);
  finishExam();

  assert.strictEqual(JSON.stringify(state.words), before);
});

test('检查记录与每日勾选仍照常写入', function () {
  setupExam(
    { '1': record(30, 1, 2), '2': record(30, 3, 4) },
    [
      { wordId: 1, direction: 'zh2en', correct: false },
      { wordId: 2, direction: 'en2zh', correct: true }
    ]
  );

  const result = finishExam();

  assert.deepStrictEqual(result, { ok: true, correct: 1, total: 2 });
  assert.strictEqual(state.tests.length, 1);
  assert.strictEqual(state.tests[0].correct, 1);
  assert.strictEqual(state.tests[0].total, 2);
  assert.strictEqual(state.daily['50'].test, true);
});

test('答错的词次日到期', function () {
  setupExam(
    { '1': mastered(7, 5) },
    [{ wordId: 1, direction: 'zh2en', correct: false }]
  );
  finishExam();

  state.progress.day = 51;
  state.progress.completedDate = dateOffset(-1);

  assert.ok(getDueReviewWords().indexOf(1) !== -1);
});

test('保存失败时检查记录、每日勾选与词状态一起回滚', function () {
  setupExam(
    { '1': record(30, 1, 2) },
    [{ wordId: 1, direction: 'zh2en', correct: false }]
  );

  const testsBefore = JSON.stringify(state.tests);
  const dailyBefore = JSON.stringify(state.daily);
  const wordsBefore = JSON.stringify(state.words);

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  assert.deepStrictEqual(finishExam(), { ok: false, reason: 'saveFailed' });
  assert.strictEqual(JSON.stringify(state.tests), testsBefore);
  assert.strictEqual(JSON.stringify(state.daily), dailyBefore);
  assert.strictEqual(JSON.stringify(state.words), wordsBefore);
});
