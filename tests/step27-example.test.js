const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

function makeNode() {
  return {
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

function installDom() {
  document.createElement = function () {
    return makeNode();
  };
  document.getElementById = function () {
    return null;
  };
}

function sampleWord() {
  return {
    id: 1,
    word: 'apple',
    pos: 'n.',
    category: '名词',
    meaning: '苹果',
    phonetic: '',
    example: 'An example.'
  };
}

test('有例句时行末尾多一个说明元素', function () {
  loadAppScripts();
  installDom();

  const row = createWordsRow(sampleWord(), 'unlearned');

  assert.strictEqual(row.children.length, 3);
  assert.strictEqual(row.children[2].className, 'word-example');
  assert.strictEqual(row.children[2].textContent, 'An example.');
});

test('例句为空时不添加说明元素', function () {
  loadAppScripts();
  installDom();

  const word = sampleWord();
  word.example = '';

  const row = createWordsRow(word, 'unlearned');

  assert.strictEqual(row.children.length, 2);
  assert.strictEqual(
    row.children.some(function (child) {
      return child.className === 'word-example';
    }),
    false
  );
});

test('词条文字不包含例句', function () {
  loadAppScripts();
  installDom();

  const row = createWordsRow(sampleWord(), 'learning');

  assert.strictEqual(row.children[0].textContent, '1. apple n. 名词 苹果 ［学习中］');
  assert.strictEqual(row.children[0].textContent.indexOf('An example.'), -1);
});
