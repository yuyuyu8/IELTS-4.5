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

function mountReview() {
  loadAppScripts();
  const container = createContainerFake();
  const todayContainer = createContainerFake();

  document.getElementById = function (id) {
    if (id === 'review-list') {
      return container;
    }
    if (id === 'today-info') {
      return todayContainer;
    }
    return null;
  };
  document.createElement = function () {
    return makeNode();
  };

  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.words = {
    '1': { status: 'learning', reviewStep: 0, nextReview: 2, reviewCount: 0 }
  };

  renderReview();
  return container;
}

function rowOf(container) {
  return container.children[1];
}

test('复习行只显示编号与单词，不显示释义', function () {
  const container = mountReview();
  const row = rowOf(container);

  assert.strictEqual(row.children.length, 5);
  assert.strictEqual(row.children[0].textContent.indexOf('apple') !== -1, true);
  assert.strictEqual(row.children[0].textContent.indexOf('苹果'), -1);
});

test('显示释义按钮初始可见', function () {
  const container = mountReview();
  const button = rowOf(container).children[2];

  assert.strictEqual(button.className, 'reveal-btn');
  assert.strictEqual(button.textContent, '显示释义');
  assert.strictEqual(button.hidden, false);
});

test('答案区与作答区初始隐藏', function () {
  const container = mountReview();
  const row = rowOf(container);

  assert.strictEqual(row.children[3].hidden, true);
  assert.strictEqual(row.children[3].className, 'review-answer');
  assert.strictEqual(row.children[4].hidden, true);
  assert.strictEqual(row.children[4].className, 'review-actions');
});

test('点击显示释义后揭示答案区与作答区', function () {
  const container = mountReview();
  const row = rowOf(container);

  row.children[2].clickHandlers[0]();

  assert.strictEqual(row.children[2].hidden, true);
  assert.strictEqual(row.children[3].hidden, false);
  assert.strictEqual(row.children[4].hidden, false);
});

test('答案区包含词性分类释义与例句', function () {
  const container = mountReview();
  const row = rowOf(container);

  WORDS[0].example = 'An apple a day.';
  renderReview();

  const fresh = rowOf(container);
  fresh.children[2].clickHandlers[0]();

  assert.strictEqual(fresh.children[3].children[0].textContent, 'n. 名词 苹果');
  assert.strictEqual(fresh.children[3].children.length, 2);
  assert.strictEqual(fresh.children[3].children[1].textContent, 'An apple a day.');

  WORDS[0].example = '';
});

test('揭示后作答按钮生效', function () {
  const container = mountReview();
  const row = rowOf(container);

  row.children[2].clickHandlers[0]();
  row.children[4].children[0].clickHandlers[0]();

  assert.deepStrictEqual(state.words['1'], {
    status: 'learning',
    reviewStep: 1,
    nextReview: 4,
    reviewCount: 1
  });
});

test('未揭示时单词行不含释义文字', function () {
  const container = mountReview();
  const row = rowOf(container);

  assert.strictEqual(row.children[0].textContent.indexOf(WORDS[0].meaning), -1);
});

test('重新渲染后回到未揭示状态', function () {
  const container = mountReview();
  const row = rowOf(container);

  row.children[2].clickHandlers[0]();
  renderReview();

  assert.strictEqual(rowOf(container).children[2].hidden, false);
});
