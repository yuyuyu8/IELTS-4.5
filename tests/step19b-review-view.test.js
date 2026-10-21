const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts } = require('./helpers.js');

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
    className: '',
    clickHandlers: [],
    addEventListener: function (type, fn) {
      if (type === 'click') {
        this.clickHandlers.push(fn);
      }
    },
    appendChild: function (child) {
      this.children.push(child);
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

function textsOf(node) {
  return node.children.map(function (child) {
    return child.textContent;
  });
}

function mountReview() {
  loadAppScripts();
  const container = makeNode();

  document.getElementById = function (id) {
    if (id === 'review-list') {
      return container;
    }
    return null;
  };

  document.createElement = function () {
    return makeNode();
  };

  return container;
}

test('index.html 的复习视图中存在 review-list 容器', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const listIndex = html.indexOf('<div id="review-list"></div>');
  const reviewIndex = html.indexOf('id="view-review"');
  const wordsIndex = html.indexOf('id="view-words"');

  assert.notStrictEqual(listIndex, -1, '应存在 <div id="review-list"></div>');
  assert.ok(reviewIndex !== -1 && reviewIndex < listIndex, 'review-list 应位于 view-review 之后');
  assert.ok(wordsIndex !== -1 && listIndex < wordsIndex, 'review-list 应位于 view-words 之前');
});

test('没有开始日期时提示计划开始后显示复习', function () {
  const container = mountReview();
  renderReview();

  assert.deepStrictEqual(textsOf(container), ['计划开始后，这里会显示到期的复习。']);
});

test('计划结束后提示已完成', function () {
  const container = mountReview();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 501;
  renderReview();

  assert.deepStrictEqual(textsOf(container), ['全部学习计划已完成。']);
});

test('当天已完成时提示复习已锁定', function () {
  const container = mountReview();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.words = { '1': record(2) };
  state.progress.completedDate = todayString();
  renderReview();

  assert.deepStrictEqual(textsOf(container), ['今天已完成，复习已锁定。']);
});

test('没有到期复习时提示今日无复习', function () {
  const container = mountReview();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  state.words = {};
  renderReview();

  assert.deepStrictEqual(textsOf(container), ['今天没有到期的复习。']);
});

test('到期复习按顺序渲染为词条行与操作区', function () {
  const container = mountReview();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.words = { '2': record(2), '1': record(2) };
  renderReview();

  assert.strictEqual(container.children[0].textContent, '待复习（共 2 个）：');

  assert.strictEqual(container.children[1].className, 'review-item');
  assert.strictEqual(container.children[1].children[0].textContent, '1. apple');
  assert.strictEqual(container.children[2].children[0].textContent, '2. orange');

  assert.strictEqual(container.children[1].children[1].textContent, '发音');
  assert.strictEqual(container.children[1].children[2].textContent, '显示释义');

  const buttons = container.children[1].children[4].children;
  assert.deepStrictEqual(
    buttons.map(function (button) {
      return button.textContent;
    }),
    ['认识', '模糊', '不认识']
  );
  assert.deepStrictEqual(
    buttons.map(function (button) {
      return button.className;
    }),
    ['review-btn review-known', 'review-btn review-fuzzy', 'review-btn review-forgot']
  );
});
