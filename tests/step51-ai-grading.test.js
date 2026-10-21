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

function makeNode() {
  const node = {
    hidden: false,
    className: '',
    value: '',
    children: [],
    clickHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    focus: function () {},
    setSelectionRange: function () {},
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
      cache[id] = makeNode();
    }
    return cache[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  return cache;
}

function setup() {
  loadAppScripts();
  localStorage.removeItem('english3000.ai');
  saveAiKey('k');
  state.settings.ai = {
    provider: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  };
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  state.progress.refilledDay = 121;
}

function validReply() {
  return JSON.stringify({
    ta: 6,
    cc: 5.5,
    lr: 5.5,
    gra: 5,
    comment: '这是一段中文点评。'
  });
}

test('没有作文时返回空字符串', function () {
  setup();

  assert.strictEqual(buildGradingPrompt(), '');
});

test('有作文时要求 JSON 输出并包含原文', function () {
  setup();
  state.daily['121'] = { writingText: 'I think this is good.' };

  const prompt = buildGradingPrompt();

  assert.ok(prompt.indexOf('## 输出格式') !== -1);
  assert.ok(prompt.indexOf('只输出一个 JSON 对象') !== -1);
  assert.ok(prompt.indexOf('I think this is good.') !== -1);
});

test('解析合法的评分数值', function () {
  loadAppScripts();

  assert.deepStrictEqual(
    parseGradingReply('{"ta":6,"cc":5.5,"lr":5.5,"gra":5,"comment":"ok"}'),
    { ok: true, ta: 6, cc: 5.5, lr: 5.5, gra: 5, comment: 'ok' }
  );
});

test('解析代码块包裹的 JSON', function () {
  loadAppScripts();

  const json = '{"ta":6,"cc":5.5,"lr":5.5,"gra":5,"comment":"ok"}';
  const result = parseGradingReply('```json\n' + json + '\n```');

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.ta, 6);
  assert.strictEqual(result.comment, 'ok');
});

test('解析拒绝越界、非法步长、非字符串点评与坏 JSON', function () {
  loadAppScripts();

  assert.strictEqual(
    parseGradingReply('{"ta":10,"cc":6,"lr":6,"gra":6,"comment":"ok"}').reason,
    'invalidScores'
  );
  assert.strictEqual(
    parseGradingReply('{"ta":6.3,"cc":6,"lr":6,"gra":6,"comment":"ok"}').reason,
    'invalidScores'
  );
  assert.strictEqual(
    parseGradingReply('{"ta":6,"cc":6,"lr":6,"gra":6,"comment":5}').reason,
    'invalidComment'
  );
  assert.strictEqual(parseGradingReply('not json').reason, 'invalidJson');
});

test('没有密钥时不发请求', async function () {
  setup();
  saveAiKey('');
  let called = false;
  globalThis.fetch = function () {
    called = true;
    return Promise.resolve({ ok: true, text: () => Promise.resolve(validReply()) });
  };

  assert.deepStrictEqual(await gradeWriting(), {
    ok: false,
    message: '请先在设置页填写 AI 接口。'
  });
  assert.strictEqual(called, false);
});

test('成功响应解析出四项分数与点评', async function () {
  setup();
  state.daily['121'] = { writingText: 'My essay.' };
  globalThis.fetch = function () {
    return Promise.resolve({ ok: true, text: () => Promise.resolve(validReply()) });
  };

  const result = await gradeWriting();

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.ta, 6);
  assert.strictEqual(result.cc, 5.5);
  assert.strictEqual(result.lr, 5.5);
  assert.strictEqual(result.gra, 5);
  assert.strictEqual(result.comment, '这是一段中文点评。');
});

test('HTTP 失败时带状态码', async function () {
  setup();
  state.daily['121'] = { writingText: 'My essay.' };
  globalThis.fetch = function () {
    return Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('denied') });
  };

  const result = await gradeWriting();

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.message.indexOf('评分失败：HTTP 401，'), 0);
});

test('点击评分按钮填入分数并显示点评', async function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();

  localStorage.removeItem('english3000.ai');
  saveAiKey('k');
  state.settings.ai = {
    provider: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  };
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  state.progress.refilledDay = 121;
  state.daily['121'] = { writingText: 'My essay.' };

  globalThis.fetch = function () {
    return Promise.resolve({ ok: true, text: () => Promise.resolve(validReply()) });
  };

  ready.forEach(function (fn) {
    fn();
  });

  await document.getElementById('grade-writing-btn').clickHandlers[0]();

  assert.strictEqual(document.getElementById('writing-ta').value, '6');
  assert.strictEqual(document.getElementById('writing-cc').value, '5.5');
  assert.strictEqual(document.getElementById('writing-lr').value, '5.5');
  assert.strictEqual(document.getElementById('writing-gra').value, '5');

  const message = document.getElementById('grade-writing-msg').textContent;

  assert.strictEqual(
    message.indexOf('评分：TA 6.0 / CC 5.5 / LR 5.5 / GRA 5.0，总分 5.5。'),
    0
  );
  assert.ok(message.endsWith('这是一段中文点评。'));
});
