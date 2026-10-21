const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

const realRandom = Math.random;
const realSpeakWord = globalThis.speakWord;

test.afterEach(function () {
  Math.random = realRandom;
  globalThis.speakWord = realSpeakWord;
});

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function makeNode(tag) {
  return {
    tagName: typeof tag === 'string' ? tag.toUpperCase() : 'DIV',
    id: '',
    type: '',
    value: '',
    textContent: '',
    autocapitalize: '',
    autocorrect: '',
    spellcheck: true,
    hidden: false,
    className: '',
    children: [],
    clickHandlers: [],
    inputHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        this.clickHandlers.push(fn);
      }
      if (type === 'input') {
        this.inputHandlers.push(fn);
      }
    }
  };
}

function createContainerFake() {
  const container = {
    children: [],
    appendChild: function (child) {
      this.children.push(child);
    }
  };

  let text = '';
  Object.defineProperty(container, 'textContent', {
    get: function () {
      return text;
    },
    set: function (value) {
      text = value;
      if (value === '') {
        container.children = [];
      }
    },
    configurable: true
  });

  return container;
}

function installFakeDocument() {
  const container = createContainerFake();

  document.getElementById = function (id) {
    return id === 'dictation-box' ? container : null;
  };
  document.createElement = function (tag) {
    return makeNode(tag);
  };

  return container;
}

function setup() {
  loadAppScripts();
  const container = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  state.progress.refilledDay = 1;
  state.words = {
    '1': { status: 'learning', reviewStep: 0, nextReview: 2, reviewCount: 0 },
    '2': { status: 'learning', reviewStep: 0, nextReview: 2, reviewCount: 0 },
    '3': { status: 'learning', reviewStep: 0, nextReview: 2, reviewCount: 0 }
  };
  return container;
}

function hintText(container) {
  return container.children[3].textContent;
}

function pressHint(container) {
  container.children[2].clickHandlers[0]();
}

test('找出当天学过的新词', function () {
  setup();

  assert.deepStrictEqual(todaysLearnedIds(), [1, 2, 3]);

  state.words['2'].reviewCount = 1;
  assert.deepStrictEqual(todaysLearnedIds(), [1, 3]);

  state.words['3'].nextReview = 5;
  assert.deepStrictEqual(todaysLearnedIds(), [1]);
});

test('已掌握的词不进入听写', function () {
  setup();
  state.words['1'] = {
    status: 'mastered',
    reviewStep: 7,
    nextReview: null,
    reviewCount: 0
  };

  assert.deepStrictEqual(todaysLearnedIds(), [2, 3]);
});

test('第 1 天渲染完整的听写控件', function () {
  const container = setup();

  renderDictation();

  assert.strictEqual(container.children.length, 6);
  assert.strictEqual(container.children[0].textContent, '听写：第 1 / 3 个。');
});

test('提示按随机位置揭示字母', function () {
  const container = setup();

  renderDictation();
  assert.strictEqual(hintText(container), '_ _ _ _ _');

  Math.random = function () {
    return 0;
  };
  pressHint(container);
  assert.strictEqual(hintText(container), 'a _ _ _ _');

  Math.random = function () {
    return 0.99;
  };
  pressHint(container);
  assert.strictEqual(hintText(container), 'a _ _ _ e');
});

test('提示不会重复揭示同一位置', function () {
  const container = setup();

  Math.random = function () {
    return 0;
  };
  renderDictation();

  for (let i = 0; i < 5; i += 1) {
    pressHint(container);
  }

  assert.strictEqual(hintText(container), 'a p p l e');

  pressHint(container);
  assert.strictEqual(hintText(container), 'a p p l e');
});

test('输入正确后前进到下一个词', function () {
  const container = setup();

  renderDictation();

  const input = container.children[4];
  input.value = 'Apple';
  input.inputHandlers[0]();

  assert.strictEqual(container.children[0].textContent, '听写：第 2 / 3 个。');
  assert.strictEqual(hintText(container), '_ _ _ _ _ _');
  assert.strictEqual(container.children[4].value, '');
});

test('输入错误不前进', function () {
  const container = setup();

  renderDictation();

  const input = container.children[4];
  input.value = 'wrong';
  input.inputHandlers[0]();

  assert.strictEqual(container.children[0].textContent, '听写：第 1 / 3 个。');
});

test('跳过前进并在全部结束后显示完成', function () {
  const container = setup();

  renderDictation();

  container.children[5].clickHandlers[0]();
  assert.strictEqual(container.children[0].textContent, '听写：第 2 / 3 个。');

  container.children[5].clickHandlers[0]();
  container.children[5].clickHandlers[0]();

  assert.strictEqual(container.children.length, 1);
  assert.strictEqual(container.children[0].textContent, '听写完成。');
});

test('播放调用发音并支持当天完成时隐藏', function () {
  const container = setup();
  const spoken = [];

  globalThis.speakWord = function (word) {
    spoken.push(word);
  };

  renderDictation();
  container.children[1].clickHandlers[0]();

  assert.deepStrictEqual(spoken, ['apple']);

  state.progress.completedDate = todayString();
  renderDictation();

  assert.strictEqual(container.children.length, 0);
  assert.strictEqual(dictationState, null);
});
