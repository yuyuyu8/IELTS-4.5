const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function makeNode(tag) {
  const node = {
    tagName: typeof tag === 'string' ? tag.toUpperCase() : 'DIV',
    hidden: false,
    className: '',
    value: '',
    checked: false,
    name: '',
    type: '',
    rows: 0,
    children: [],
    clickHandlers: [],
    changeHandlers: [],
    inputHandlers: [],
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
      if (type === 'input') {
        node.inputHandlers.push(fn);
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

function installFakeDocument() {
  const cache = {};

  document.getElementById = function (id) {
    if (cache[id] === undefined) {
      cache[id] = makeNode('div');
    }
    return cache[id];
  };
  document.createElement = function (tag) {
    return makeNode(tag);
  };

  return cache;
}

function validQuestions() {
  return [
    { type: 'mcq', prompt: 'Q1?', options: ['A', 'B', 'C', 'D'], answer: 'A' },
    { type: 'mcq', prompt: 'Q2?', options: ['E', 'F', 'G', 'H'], answer: 'E' },
    { type: 'mcq', prompt: 'Q3?', options: ['I', 'J', 'K', 'L'], answer: 'I' },
    { type: 'fill', prompt: 'Wind power is the ____ of energy.', answer: 'conversion' },
    { type: 'fill', prompt: 'It has many ____.', answer: 'turbines' },
    { type: 'short', prompt: 'Why?', answer: 'Because it is clean.' }
  ];
}

function setupDay() {
  loadAppScripts();
  const cache = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 61;
  state.progress.refilledDay = 61;
  renderReading();
  return cache;
}

function setupReady() {
  const ready = loadAppWithReadyCallbacks();
  const cache = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 61;
  state.progress.refilledDay = 61;
  ready.forEach(function (fn) {
    fn();
  });
  return cache;
}

async function generateQuiz() {
  generateReadingQuiz = function () {
    return Promise.resolve({ ok: true, questions: validQuestions() });
  };

  await document.getElementById('gen-quiz-btn').clickHandlers[0]();
}

test('index.html 的阅读分组包含生成题目控件', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const start = html.indexOf('id="group-reading"');
  const end = html.indexOf('</details>', start);
  const section = html.slice(start, end);

  ['gen-quiz-btn', 'quiz-msg', 'quiz-area'].forEach(function (id) {
    assert.ok(section.indexOf('id="' + id + '"') !== -1, id + ' 应在阅读分组内');
  });
});

test('尚未生成时题目区为空', function () {
  const cache = setupDay();

  assert.strictEqual(cache['quiz-area'].children.length, 0);
});

test('生成成功后填入六道题与空答案', async function () {
  const cache = setupReady();

  await generateQuiz();

  assert.notStrictEqual(readingQuiz, null);
  assert.strictEqual(readingQuiz.articleNo, readingArticleFor(61).no);
  assert.deepStrictEqual(readingQuiz.answers, ['', '', '', '', '', '']);
  assert.strictEqual(cache['quiz-area'].children.length, 7);
});

test('选择题渲染题干与四个单选项', async function () {
  const cache = setupReady();

  await generateQuiz();

  const item = cache['quiz-area'].children[0];

  assert.strictEqual(item.className, 'quiz-item');
  assert.strictEqual(item.children[0].textContent.indexOf('1. ') === 0, true);
  assert.strictEqual(item.children.length, 5);

  for (let i = 1; i <= 4; i += 1) {
    assert.strictEqual(item.children[i].tagName, 'LABEL');
    assert.strictEqual(item.children[i].children[0].type, 'radio');
  }
});

test('选项答案写回并在重新渲染后保留', async function () {
  const cache = setupReady();

  await generateQuiz();

  const firstInput = cache['quiz-area'].children[0].children[1].children[0];
  firstInput.changeHandlers[0]();

  assert.strictEqual(readingQuiz.answers[0], 'A');

  renderReading();

  const rerendered = cache['quiz-area'].children[0].children[1].children[0];

  assert.strictEqual(rerendered.checked, true);
});

test('填空题输入写回答案', async function () {
  const cache = setupReady();

  await generateQuiz();

  const fillInput = cache['quiz-area'].children[3].children[1];
  fillInput.value = 'abc';
  fillInput.inputHandlers[0]();

  assert.strictEqual(readingQuiz.answers[3], 'abc');
});

test('简答题渲染为三行文本框', async function () {
  const cache = setupReady();

  await generateQuiz();

  const shortInput = cache['quiz-area'].children[5].children[1];

  assert.strictEqual(shortInput.tagName, 'TEXTAREA');
  assert.strictEqual(shortInput.rows, 3);
});

test('切换文章后清空旧题目', async function () {
  const cache = setupReady();

  await generateQuiz();

  state.progress.day = 64;
  state.progress.refilledDay = 64;
  renderReading();

  assert.strictEqual(readingQuiz, null);
  assert.strictEqual(cache['quiz-area'].children.length, 0);
});
