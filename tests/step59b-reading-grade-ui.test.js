const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

const realFetch = globalThis.fetch;

test.afterEach(function () {
  globalThis.fetch = realFetch;
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
  const node = {
    tagName: typeof tag === 'string' ? tag.toUpperCase() : 'DIV',
    id: '',
    hidden: false,
    className: '',
    value: '',
    checked: false,
    children: [],
    clickHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        node.clickHandlers.push(fn);
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
      cache[id].id = id;
    }
    return cache[id];
  };
  document.createElement = function (tag) {
    const node = makeNode(tag);
    let idValue = '';

    Object.defineProperty(node, 'id', {
      get: function () {
        return idValue;
      },
      set: function (value) {
        idValue = value;
        if (value !== '') {
          cache[value] = node;
        }
      },
      configurable: true
    });

    return node;
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

function quizText() {
  return JSON.stringify({ questions: validQuestions() });
}

function gradeText() {
  return JSON.stringify({
    items: [
      { correct: true, feedback: '对。' },
      { correct: true, feedback: '对。' },
      { correct: false, feedback: '错了。' },
      { correct: false, feedback: '应为 conversion。' },
      { correct: true, feedback: '对。' },
      { correct: true, feedback: '简答合理。' }
    ],
    comment: '整体不错，注意回到原文核对细节。'
  });
}

function setup() {
  const ready = loadAppWithReadyCallbacks();
  const cache = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 61;
  state.progress.refilledDay = 61;
  saveAiKey('k');
  state.settings.ai = {
    provider: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  };

  let fetchCalls = 0;
  globalThis.fetch = function (url, options) {
    fetchCalls += 1;
    const body = options && options.body ? String(options.body) : '';

    if (body.indexOf('# 阅读理解评分') !== -1) {
      return Promise.resolve({ ok: true, text: () => Promise.resolve(gradeText()) });
    }

    return Promise.resolve({ ok: true, text: () => Promise.resolve(quizText()) });
  };

  ready.forEach(function (fn) {
    fn();
  });

  cache.fetchCalls = function () {
    return fetchCalls;
  };

  return cache;
}

async function prepare(cache) {
  renderReading();
  await document.getElementById('gen-quiz-btn').clickHandlers[0]();
  return cache;
}

function answerAll() {
  for (let i = 0; i < readingQuiz.answers.length; i += 1) {
    readingQuiz.answers[i] = 'a';
  }
}

test('生成题目后出现提交按钮', async function () {
  const cache = setup();
  await prepare(cache);

  const last = cache['quiz-area'].children[cache['quiz-area'].children.length - 1];

  assert.strictEqual(last.id, 'submit-quiz-btn');
  assert.strictEqual(last.textContent, '提交作答');
});

test('有未作答的题时只提示不评分', async function () {
  const cache = setup();
  await prepare(cache);

  await cache['quiz-area'].children[cache['quiz-area'].children.length - 1].clickHandlers[0]();

  assert.strictEqual(cache['quiz-msg'].textContent, '还有 6 道题没有作答。');
  assert.strictEqual(cache.fetchCalls(), 1);
});

test('全部作答后提交评分', async function () {
  const cache = setup();
  await prepare(cache);
  answerAll();

  await document.getElementById('submit-quiz-btn').clickHandlers[0]();

  assert.strictEqual(cache.fetchCalls(), 2);
  assert.strictEqual(cache['quiz-msg'].textContent, '评分完成。');
  assert.notStrictEqual(readingQuiz.result, null);
});

test('评分结果写入当天记录', async function () {
  const cache = setup();
  await prepare(cache);
  answerAll();

  await document.getElementById('submit-quiz-btn').clickHandlers[0]();

  assert.deepStrictEqual(state.daily['61'].readingResult, {
    articleNo: readingArticleFor(61).no,
    correct: 4,
    total: 6,
    comment: '整体不错，注意回到原文核对细节。'
  });
});

test('题目区显示总分与每题说明', async function () {
  const cache = setup();
  await prepare(cache);
  answerAll();

  await document.getElementById('submit-quiz-btn').clickHandlers[0]();

  const children = cache['quiz-area'].children;

  assert.strictEqual(children[7].textContent, '本次评分：答对 4 / 6。');
  assert.strictEqual(children[8].textContent, '第 1 题：对。');
  assert.strictEqual(children[9].textContent, '第 2 题：对。');
  assert.strictEqual(children[10].textContent, '第 3 题：错了。');
  assert.strictEqual(children[11].textContent, '第 4 题：应为 conversion。');
  assert.strictEqual(children[12].textContent, '第 5 题：对。');
  assert.strictEqual(children[13].textContent, '第 6 题：简答合理。');
  assert.strictEqual(children[14].textContent, '整体不错，注意回到原文核对细节。');
});

test('刷新后仍显示已保存的评分与总评', async function () {
  const cache = setup();
  await prepare(cache);
  answerAll();

  await document.getElementById('submit-quiz-btn').clickHandlers[0]();

  readingQuiz = null;
  renderReading();

  const children = cache['reading-box'].children;
  let scoreIndex = -1;
  let genIndex = -1;
  let hasComment = false;

  for (let i = 0; i < children.length; i += 1) {
    if (children[i].textContent === '本次评分：答对 4 / 6。') {
      scoreIndex = i;
    }
    if (children[i].id === 'gen-quiz-btn') {
      genIndex = i;
    }
    if (children[i].textContent === '整体不错，注意回到原文核对细节。') {
      hasComment = true;
    }
  }

  assert.notStrictEqual(scoreIndex, -1);
  assert.notStrictEqual(genIndex, -1);
  assert.ok(scoreIndex < genIndex);
  assert.ok(hasComment);
});

test('文章与记录不匹配时不显示旧评分', function () {
  const cache = setup();
  const article = readingArticleFor(61);

  state.daily['61'] = {
    readingResult: {
      articleNo: article.no + 1,
      correct: 4,
      total: 6,
      comment: '旧的点评。'
    }
  };

  renderReading();

  const children = cache['reading-box'].children;

  for (let i = 0; i < children.length; i += 1) {
    assert.strictEqual(children[i].textContent.indexOf('本次评分'), -1);
  }
});

test('保存失败仍保留本次评分', async function () {
  const cache = setup();
  await prepare(cache);
  answerAll();

  localStorage.setItem = function () {
    throw new Error('storage unavailable');
  };

  await document.getElementById('submit-quiz-btn').clickHandlers[0]();

  assert.strictEqual(cache['quiz-msg'].textContent, '评分已生成，但保存失败：本地存储不可用。');
  assert.notStrictEqual(readingQuiz.result, null);
});

test('备份校验接受阅读评分并拒绝非法值', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);

  function backupWith(result) {
    state.daily = { '61': { readingResult: result } };
    return JSON.parse(exportBackupText());
  }

  const valid = { articleNo: 1, correct: 4, total: 6, comment: 'ok' };
  assert.deepStrictEqual(validateBackup(backupWith(valid)), { ok: true });

  assert.strictEqual(
    validateBackup(backupWith(Object.assign({}, valid, { correct: 7 }))).reason,
    'invalidDaily'
  );
  assert.strictEqual(
    validateBackup(backupWith(Object.assign({}, valid, { articleNo: 0 }))).reason,
    'invalidDaily'
  );
  assert.strictEqual(
    validateBackup(backupWith(Object.assign({}, valid, { foo: 1 }))).reason,
    'invalidDaily'
  );
});
