const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

function makeNode() {
  const node = {
    value: '',
    className: '',
    hidden: false,
    children: [],
    clickHandlers: [],
    changeHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        node.clickHandlers.push(fn);
      }
      if (type === 'change') {
        node.changeHandlers.push(fn);
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
  const elements = {
    'today-info': makeNode(),
    'today-words': makeNode(),
    'review-list': makeNode(),
    'daily-checks': makeNode(),
    'writing-box': makeNode(),
    'writing-text': makeNode(),
    'words-summary': makeNode(),
    'words-category': makeNode(),
    'words-state': makeNode(),
    'words-list': makeNode(),
    'words-more': makeNode()
  };

  document.getElementById = function (id) {
    return elements[id] === undefined ? null : elements[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  return elements;
}

function textsOf(node) {
  return node.children.map(function (child) {
    return child.textContent;
  });
}

test('index.html 的单词视图中存在筛选与列表元素', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const wordsIndex = html.indexOf('id="view-words"');
  const testIndex = html.indexOf('id="view-test"');
  const snippets = [
    'id="words-summary"',
    'id="words-category"',
    'id="words-state"',
    'id="words-list"',
    'id="words-more"'
  ];

  snippets.forEach(function (snippet) {
    const index = html.indexOf(snippet);
    assert.notStrictEqual(index, -1, '应存在 ' + snippet);
    assert.ok(index > wordsIndex && index < testIndex, snippet + ' 应位于单词视图之内');
  });
});

test('wordStateOf 返回四种状态', function () {
  loadAppScripts();
  state.words = {
    '1': { status: 'mastered', reviewStep: 5, nextReview: null, reviewCount: 6 },
    '2': { status: 'learning', reviewStep: 0, nextReview: 3, reviewCount: 0 }
  };
  state.queue = [3];

  assert.strictEqual(wordStateOf(1), 'mastered');
  assert.strictEqual(wordStateOf(2), 'learning');
  assert.strictEqual(wordStateOf(3), 'queued');
  assert.strictEqual(wordStateOf(4), 'unlearned');
});

test('汇总与分类进度按实际数据计算', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.words = {
    '1': { status: 'learning', reviewStep: 0, nextReview: 3, reviewCount: 0 },
    '2': { status: 'mastered', reviewStep: 5, nextReview: null, reviewCount: 6 }
  };
  state.queue = [3];

  renderWords();

  const texts = textsOf(dom['words-summary']);
  assert.strictEqual(texts[0], '总进度：已学 2 / ' + WORDS.length + ' 个（学习中 1，已掌握 1）。');

  const categories = Object.keys(PLAN.categoryTargets);
  assert.strictEqual(texts.length, 1 + categories.length);

  categories.forEach(function (name, index) {
    const expectedEnd = '/ ' + PLAN.categoryTargets[name];
    const line = texts[1 + index];
    assert.strictEqual(line.indexOf(name + '：已学 '), 0);
    assert.strictEqual(line.slice(-expectedEnd.length), expectedEnd);
  });
});

test('分类筛选只显示该分类的词', function () {
  loadAppScripts();
  const dom = createFakeDom();
  dom['words-category'].value = '名词';
  renderWords();

  const nounCount = WORDS.filter(function (word) {
    return word.category === '名词';
  }).length;

  const rows = dom['words-list'].children;
  assert.strictEqual(rows.length, Math.min(nounCount, 200));
  rows.forEach(function (row) {
    assert.ok(row.children[0].textContent.indexOf('名词') !== -1);
  });
});

test('状态筛选只显示已掌握的词', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.words = {
    '1': { status: 'mastered', reviewStep: 5, nextReview: null, reviewCount: 6 },
    '2': { status: 'mastered', reviewStep: 5, nextReview: null, reviewCount: 6 }
  };
  dom['words-state'].value = 'mastered';
  renderWords();

  assert.strictEqual(dom['words-list'].children.length, 2);
});

test('超过 200 条时只显示前 200 条', function () {
  loadAppScripts();
  const dom = createFakeDom();
  const original = WORDS;

  globalThis.WORDS = [];
  for (let i = 1; i <= 250; i++) {
    WORDS.push({ id: i, word: 'w' + i, pos: 'n.', category: '名词', meaning: 'm' + i, phonetic: '', example: '' });
  }

  try {
    renderWords();
    assert.strictEqual(dom['words-list'].children.length, 200);
    assert.ok(dom['words-more'].textContent.indexOf('仅显示前 200 个') !== -1);
  } finally {
    globalThis.WORDS = original;
  }
});

test('筛选无结果时提示没有符合条件的单词', function () {
  loadAppScripts();
  const dom = createFakeDom();
  dom['words-category'].value = '名词';
  dom['words-state'].value = 'mastered';
  renderWords();

  assert.strictEqual(dom['words-list'].children.length, 0);
  assert.strictEqual(dom['words-more'].textContent, '没有符合条件的单词。');
  assert.ok(dom['words-summary'].children.length > 0);
});

test('发音按钮绑定一次并朗读该行单词', function () {
  loadAppScripts();
  const dom = createFakeDom();
  const calls = [];
  window.speakWord = function (text) {
    calls.push(text);
  };

  renderWords();

  const button = dom['words-list'].children[0].children[1];
  assert.strictEqual(button.clickHandlers.length, 1);
  button.clickHandlers[0]();

  assert.deepStrictEqual(calls, [WORDS[0].word]);
});

test('下拉框的 change 会刷新列表', function () {
  const ready = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  ready.forEach(function (fn) {
    fn();
  });

  assert.strictEqual(dom['words-category'].changeHandlers.length, 1);
  assert.strictEqual(dom['words-state'].changeHandlers.length, 1);

  dom['words-category'].value = '动词';
  dom['words-category'].changeHandlers[0]();

  const rows = dom['words-list'].children;
  assert.ok(rows.length > 0);
  rows.forEach(function (row) {
    assert.ok(row.children[0].textContent.indexOf('动词') !== -1);
  });
});

test('点击单词导航后列表已渲染', function () {
  const ready = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  const navViews = ['today', 'review', 'words', 'test', 'settings'];
  const navButtons = navViews.map(function (view) {
    const button = {
      dataset: { view: view },
      classList: { add: function () {}, remove: function () {} },
      clickHandlers: [],
      addEventListener: function (type, fn) {
        if (type === 'click') {
          button.clickHandlers.push(fn);
        }
      }
    };
    return button;
  });

  document.querySelectorAll = function (selector) {
    if (selector === '.nav-btn') {
      return navButtons;
    }
    return [];
  };

  ready.forEach(function (fn) {
    fn();
  });

  dom['words-list'].textContent = '';
  navButtons[2].clickHandlers[0]();

  assert.ok(dom['words-list'].children.length > 0);
});

test('锁定时只显示锁定提示', function () {
  loadAppScripts();
  const dom = createFakeDom();
  vocabLocked = true;

  renderWords();

  assert.strictEqual(dom['words-summary'].textContent, LOCK_MESSAGE);
  assert.strictEqual(dom['words-list'].children.length, 0);
  assert.strictEqual(dom['words-more'].textContent, '');
});
