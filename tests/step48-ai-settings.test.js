const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

const realFetch = globalThis.fetch;

test.afterEach(function () {
  globalThis.fetch = realFetch;
});

function start() {
  loadAppScripts();
  localStorage.removeItem('english3000.ai');
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

test('未设置时返回默认的 AI 设置', function () {
  start();

  assert.deepStrictEqual(currentAiSettings(), {
    provider: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-sonnet-4-5'
  });
});

test('密钥单独存取，空字符串时删除', function () {
  start();

  assert.strictEqual(saveAiKey('abc'), true);
  assert.strictEqual(loadAiKey(), 'abc');

  assert.strictEqual(saveAiKey(''), true);
  assert.strictEqual(loadAiKey(), '');
  assert.strictEqual(localStorage.getItem('english3000.ai'), null);
});

test('密钥不进入导出备份', function () {
  start();
  saveAiKey('secret');

  assert.strictEqual(exportBackupText().indexOf('secret'), -1);
});

test('Anthropic 请求带齐头部与消息体', function () {
  start();
  saveAiKey('key-123');
  saveAiSettings({
    provider: 'anthropic',
    baseUrl: 'https://example.test/v1/messages',
    model: 'claude-test'
  });

  const request = buildAiRequest('hello world');
  const body = JSON.parse(request.options.body);

  assert.strictEqual(request.url, 'https://example.test/v1/messages');
  assert.strictEqual(request.options.method, 'POST');
  assert.strictEqual(request.options.headers['content-type'], 'application/json');
  assert.strictEqual(request.options.headers['x-api-key'], 'key-123');
  assert.strictEqual(request.options.headers['anthropic-version'], '2023-06-01');
  assert.strictEqual(request.options.headers['anthropic-dangerous-direct-browser-access'], 'true');
  assert.strictEqual(body.model, 'claude-test');
  assert.strictEqual(body.messages[0].content, 'hello world');
});

test('OpenAI 请求使用 authorization 与 input', function () {
  start();
  saveAiKey('key-456');
  saveAiSettings({
    provider: 'openai',
    baseUrl: 'https://example.test/v1/responses',
    model: 'gpt-test'
  });

  const request = buildAiRequest('hi there');
  const body = JSON.parse(request.options.body);

  assert.strictEqual(request.options.headers.authorization, 'Bearer key-456');
  assert.strictEqual(body.input, 'hi there');
});

test('密钥为空时不发请求', async function () {
  start();
  state.settings.ai = {
    provider: 'anthropic',
    baseUrl: 'https://example.test/v1/messages',
    model: 'claude-test'
  };
  let called = false;
  globalThis.fetch = function () {
    called = true;
    return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
  };

  const result = await testAiConnection();

  assert.deepStrictEqual(result, { ok: false, message: '请先填写模型名与密钥。' });
  assert.strictEqual(called, false);
});

test('响应成功时返回连接成功', async function () {
  start();
  saveAiKey('key-789');
  saveAiSettings({
    provider: 'anthropic',
    baseUrl: 'https://example.test/v1/messages',
    model: 'claude-test'
  });
  globalThis.fetch = function () {
    return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
  };

  assert.deepStrictEqual(await testAiConnection(), { ok: true, message: '连接成功。' });
});

test('响应失败时带状态码与文字', async function () {
  start();
  saveAiKey('key-789');
  saveAiSettings({
    provider: 'anthropic',
    baseUrl: 'https://example.test/v1/messages',
    model: 'claude-test'
  });
  globalThis.fetch = function () {
    return Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('bad key') });
  };

  assert.deepStrictEqual(await testAiConnection(), {
    ok: false,
    message: '连接失败：HTTP 401，bad key'
  });
});

test('fetch 抛异常时附加跨域提示', async function () {
  start();
  saveAiKey('key-789');
  saveAiSettings({
    provider: 'anthropic',
    baseUrl: 'https://example.test/v1/messages',
    model: 'claude-test'
  });
  globalThis.fetch = function () {
    throw new Error('boom');
  };

  const result = await testAiConnection();

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.message.indexOf('连接失败：'), 0);
  assert.ok(result.message.indexOf('boom') !== -1);
  assert.ok(result.message.endsWith('。可能是网络或跨域被拦截。'));
});

test('点击测试连接会先保存再请求', async function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  localStorage.removeItem('english3000.ai');
  ready.forEach(function (fn) {
    fn();
  });

  document.getElementById('ai-provider').value = 'anthropic';
  document.getElementById('ai-base-url').value = 'https://example.test/v1/messages';
  document.getElementById('ai-model').value = 'claude-test';
  document.getElementById('ai-key').value = 'sk-test';

  let messageDuringFetch = null;
  globalThis.fetch = function () {
    messageDuringFetch = document.getElementById('ai-msg').textContent;
    return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
  };

  await document.getElementById('test-ai-btn').clickHandlers[0]();

  assert.strictEqual(messageDuringFetch, '正在测试连接……');
  assert.strictEqual(document.getElementById('ai-msg').textContent, '连接成功。');

  const storedState = JSON.parse(localStorage.getItem('english3000.v1'));
  assert.deepStrictEqual(storedState.settings.ai, {
    provider: 'anthropic',
    baseUrl: 'https://example.test/v1/messages',
    model: 'claude-test'
  });
  assert.deepStrictEqual(JSON.parse(localStorage.getItem('english3000.ai')), { apiKey: 'sk-test' });
});
