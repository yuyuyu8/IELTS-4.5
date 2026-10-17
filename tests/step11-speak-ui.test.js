const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

function createElementFake() {
  return {
    textContent: '',
    className: '',
    children: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function () {}
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
  const container = createContainerFake();

  document.getElementById = function (id) {
    if (id === 'today-words') {
      return container;
    }
    return null;
  };

  document.createElement = function () {
    return createElementFake();
  };

  return { container: container };
}

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

test('第 1 天渲染标题与 10 行词条', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  assert.strictEqual(dom.container.children.length, 11);
  assert.strictEqual(dom.container.children[0].textContent, '今日新词（共 10 个）：');
  assert.strictEqual(dom.container.children[0].children.length, 0);
});

test('词条行是 word-row 且含两个子元素', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  assert.strictEqual(dom.container.children[1].className, 'word-row');
  assert.strictEqual(dom.container.children[1].children.length, 2);
});

test('词条文字放在 word-text 中', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  const text = dom.container.children[1].children[0];
  assert.strictEqual(text.className, 'word-text');
  assert.strictEqual(text.textContent, '1. apple n. 名词 苹果');
});

test('每一行都有发音按钮', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  const firstButton = dom.container.children[1].children[1];
  assert.strictEqual(firstButton.className, 'speak-btn');
  assert.strictEqual(firstButton.textContent, '发音');

  assert.strictEqual(dom.container.children[10].children[1].textContent, '发音');
});

test('有音标时把音标插在单词与词性之间', function () {
  loadAppScripts();
  const dom = createFakeDom();
  WORDS[0].phonetic = '/ˈæpl/';
  state.settings.startDate = dateOffset(0);

  try {
    renderTodayWords();
    assert.strictEqual(
      dom.container.children[1].children[0].textContent,
      '1. apple /ˈæpl/ n. 名词 苹果'
    );
  } finally {
    WORDS[0].phonetic = '';
  }
});

test('第 270 天显示今日无新词且没有词条行', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 270;
  renderTodayWords();

  assert.strictEqual(dom.container.children.length, 1);
  assert.strictEqual(dom.container.children[0].textContent, '今日无新词。');
  assert.strictEqual(dom.container.children[0].children.length, 0);
});
