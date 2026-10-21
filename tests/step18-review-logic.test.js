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
    reviewStep: typeof reviewStep === 'number' ? reviewStep : 0,
    nextReview: nextReview,
    reviewCount: typeof reviewCount === 'number' ? reviewCount : 0
  };
}

function setup(day, words) {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = day;
  state.words = words;
}

test('到期判断按学习日与 nextReview 比较', function () {
  const words = {
    '1': record(2),
    '2': record(5)
  };

  setup(1, words);
  assert.deepStrictEqual(getDueReviewWords(), []);

  setup(2, words);
  assert.deepStrictEqual(getDueReviewWords(), [1]);

  setup(5, words);
  assert.deepStrictEqual(getDueReviewWords(), [1, 2]);
});

test('已掌握的词不到期', function () {
  setup(10, {
    '1': { status: 'mastered', reviewStep: 5, nextReview: null, reviewCount: 6 }
  });

  assert.deepStrictEqual(getDueReviewWords(), []);
});

test('同一天到期的词按编号排序', function () {
  setup(4, {
    '3': record(4),
    '1': record(2),
    '2': record(2)
  });

  assert.deepStrictEqual(getDueReviewWords(), [1, 2, 3]);
});

test('认识时按间隔推进复习步', function () {
  setup(2, { '1': record(2, 0, 0) });

  assert.strictEqual(answerReview(1, 'known'), true);
  assert.deepStrictEqual(state.words['1'], {
    status: 'learning',
    reviewStep: 1,
    nextReview: 4,
    reviewCount: 1
  });
});

test('最后一步认识后标记为已掌握', function () {
  setup(30, { '1': record(30, 7, 7) });

  assert.strictEqual(answerReview(1, 'known'), true);
  assert.deepStrictEqual(state.words['1'], {
    status: 'mastered',
    reviewStep: 7,
    nextReview: null,
    reviewCount: 8
  });
});

test('模糊与不认识都推迟到次日，不认识退两格', function () {
  setup(4, { '1': record(4, 2, 3) });
  assert.strictEqual(answerReview(1, 'fuzzy'), true);
  assert.deepStrictEqual(state.words['1'], {
    status: 'learning',
    reviewStep: 2,
    nextReview: 5,
    reviewCount: 4
  });

  setup(7, { '1': record(7, 3, 4) });
  assert.strictEqual(answerReview(1, 'forgot'), true);
  assert.deepStrictEqual(state.words['1'], {
    status: 'learning',
    reviewStep: 1,
    nextReview: 8,
    reviewCount: 5
  });
});

test('未到期、非法答案与计划结束后都不生效', function () {
  setup(2, { '1': record(9) });

  assert.strictEqual(answerReview(1, 'known'), false);
  assert.strictEqual(state.words['1'].nextReview, 9);

  state.progress.day = 9;
  assert.strictEqual(answerReview(1, 'bogus'), false);
  assert.strictEqual(state.words['1'].reviewCount, 0);

  state.progress.day = 501;
  assert.strictEqual(answerReview(1, 'known'), false);
});

test('当天已完成时不产生复习内容', function () {
  setup(2, { '1': record(2) });
  state.progress.completedDate = todayString();

  assert.deepStrictEqual(getDueReviewWords(), []);
  assert.strictEqual(answerReview(1, 'known'), false);
  assert.deepStrictEqual(state.words['1'], {
    status: 'learning',
    reviewStep: 0,
    nextReview: 2,
    reviewCount: 0
  });
});

test('保存失败时撤销作答', function () {
  setup(2, { '1': record(2) });

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  assert.strictEqual(answerReview(1, 'known'), false);
  assert.deepStrictEqual(state.words['1'], {
    status: 'learning',
    reviewStep: 0,
    nextReview: 2,
    reviewCount: 0
  });
});
