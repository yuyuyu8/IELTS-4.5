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
    value: '',
    selected: false,
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

function setupAi() {
  loadAppScripts();
  saveAiKey('k');
  state.settings.ai = {
    provider: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  };
  state.settings.startDate = dateOffset(0);
}

function setupReady() {
  const ready = loadAppWithReadyCallbacks();
  const cache = installFakeDocument();
  saveAiKey('k');
  state.settings.ai = {
    provider: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  };
  state.settings.startDate = dateOffset(0);
  ready.forEach(function (fn) {
    fn();
  });
  return cache;
}

test('modelsUrlFor 去掉具体接口后缀并补上 models', function () {
  loadAppScripts();

  assert.strictEqual(
    modelsUrlFor('https://api.deepseek.com/chat/completions'),
    'https://api.deepseek.com/models'
  );
  assert.strictEqual(
    modelsUrlFor('https://api.anthropic.com/v1/messages'),
    'https://api.anthropic.com/v1/models'
  );
  assert.strictEqual(
    modelsUrlFor('https://api.openai.com/v1/responses'),
    'https://api.openai.com/v1/models'
  );
  assert.strictEqual(
    modelsUrlFor('https://example.com/v1/models'),
    'https://example.com/v1/models'
  );
});

test('密钥为空时不发请求', async function () {
  setupAi();
  saveAiKey('');
  let called = false;
  globalThis.fetch = function () {
    called = true;
    return Promise.resolve({ ok: true, json: () => Promise.resolve({ data: [] }) });
  };

  assert.deepStrictEqual(await fetchModelList(), { ok: false, message: '请先填写密钥。' });
  assert.strictEqual(called, false);
});

test('解析 data 列表并去重排序', async function () {
  setupAi();
  globalThis.fetch = function () {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'b' }, { id: 'a' }, { id: 'a' }] })
    });
  };

  assert.deepStrictEqual(await fetchModelList(), { ok: true, models: ['a', 'b'] });
});

test('解析 models 列表', async function () {
  setupAi();
  globalThis.fetch = function () {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ models: [{ id: 'x' }] })
    });
  };

  assert.deepStrictEqual(await fetchModelList(), { ok: true, models: ['x'] });
});

test('没有列表时给出提示', async function () {
  setupAi();
  globalThis.fetch = function () {
    return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
  };

  assert.deepStrictEqual(await fetchModelList(), {
    ok: false,
    message: '返回内容里没有模型列表。'
  });
});

test('HTTP 失败时带状态码', async function () {
  setupAi();
  globalThis.fetch = function () {
    return Promise.resolve({
      ok: false,
      status: 404,
      text: () => Promise.resolve('not found')
    });
  };

  const result = await fetchModelList();

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.message.indexOf('获取模型失败：HTTP 404，'), 0);
});

test('点击获取模型后填充下拉框与空模型名', async function () {
  const cache = setupReady();
  globalThis.fetch = function () {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({
        data: [{ id: 'deepseek-reasoner' }, { id: 'deepseek-chat' }]
      })
    });
  };

  cache['ai-model'].value = '';
  await cache['fetch-models-btn'].clickHandlers[0]();

  assert.strictEqual(cache['ai-model-preset'].children.length, 2);
  assert.strictEqual(cache['ai-model-preset'].children[0].value, 'deepseek-chat');
  assert.strictEqual(cache['ai-model-preset'].children[0].selected, true);
  assert.strictEqual(cache['ai-model'].value, 'deepseek-chat');
  assert.strictEqual(cache['ai-msg'].textContent, '已获取 2 个模型。');
});

test('已有模型名时获取列表不覆盖', async function () {
  const cache = setupReady();
  globalThis.fetch = function () {
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ data: [{ id: 'deepseek-chat' }] })
    });
  };

  cache['ai-model'].value = 'my-model';
  await cache['fetch-models-btn'].clickHandlers[0]();

  assert.strictEqual(cache['ai-model'].value, 'my-model');
});
