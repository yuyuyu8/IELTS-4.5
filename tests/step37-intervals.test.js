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

function setup(day, recordValue) {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = day;
  state.words = { '1': recordValue };
}

test('复习间隔为八阶', function () {
  loadAppScripts();

  assert.deepStrictEqual(PLAN.reviewIntervals, [1, 2, 4, 8, 16, 32, 64, 128]);
});

test('第 0 阶答认识推进到第 1 阶', function () {
  setup(2, record(2, 0, 0));

  assert.strictEqual(answerReview(1, 'known'), true);
  assert.strictEqual(state.words['1'].reviewStep, 1);
  assert.strictEqual(state.words['1'].nextReview, 4);
});

test('第 3 阶答认识推进到第 4 阶', function () {
  setup(16, record(16, 3, 3));

  assert.strictEqual(answerReview(1, 'known'), true);
  assert.strictEqual(state.words['1'].reviewStep, 4);
  assert.strictEqual(state.words['1'].nextReview, 32);
});

test('第 5 阶答认识推进到第 6 阶', function () {
  setup(63, record(63, 5, 5));

  assert.strictEqual(answerReview(1, 'known'), true);
  assert.strictEqual(state.words['1'].reviewStep, 6);
  assert.strictEqual(state.words['1'].nextReview, 127);
});

test('最后一阶答认识后标记为已掌握', function () {
  setup(200, record(200, 7, 7));

  assert.strictEqual(answerReview(1, 'known'), true);
  assert.strictEqual(state.words['1'].status, 'mastered');
  assert.strictEqual(state.words['1'].nextReview, null);
});

test('不认识退两格，最低为零', function () {
  setup(30, record(30, 4, 4));
  assert.strictEqual(answerReview(1, 'forgot'), true);
  assert.strictEqual(state.words['1'].reviewStep, 2);
  assert.strictEqual(state.words['1'].nextReview, 31);

  setup(5, record(5, 1, 1));
  assert.strictEqual(answerReview(1, 'forgot'), true);
  assert.strictEqual(state.words['1'].reviewStep, 0);

  setup(5, record(5, 0, 0));
  assert.strictEqual(answerReview(1, 'forgot'), true);
  assert.strictEqual(state.words['1'].reviewStep, 0);
});
