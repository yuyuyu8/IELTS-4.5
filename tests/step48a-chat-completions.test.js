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
      cache[id] = makeNode();
    }
    return cache[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  return cache;
}

test('未设置时默认使用 DeepSeek 的 Chat Completions', function () {
  start();

  assert.deepStrictEqual(currentAiSettings(), {
    provider: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  });
});

test('地址或模型为空时回退到服务商默认值', function () {
  start();
  state.settings.ai = { provider: 'openai-chat', baseUrl: '', model: '' };

  assert.deepStrictEqual(currentAiSettings(), {
    provider: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  });
});

test('未知服务商按 openai-chat 处理', function () {
  start();
  state.settings.ai = { provider: 'piano', baseUrl: '', model: '' };

  assert.deepStrictEqual(currentAiSettings(), {
    provider: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  });
});

test('Chat Completions 请求使用 messages 与 Bearer 头', function () {
  start();
  saveAiKey('chat-key');
  saveAiSettings({
    provider: 'openai-chat',
    baseUrl: 'https://example.test/chat/completions',
    model: 'deepseek-test'
  });

  const request = buildAiRequest('make a sentence');
  const body = JSON.parse(request.options.body);

  assert.strictEqual(request.url, 'https://example.test/chat/completions');
  assert.strictEqual(request.options.headers.authorization, 'Bearer chat-key');
  assert.strictEqual(body.model, 'deepseek-test');
  assert.strictEqual(body.messages[0].content, 'make a sentence');
});

test('extractAiText 解析三种回复结构', function () {
  loadAppScripts();

  assert.strictEqual(extractAiText({ content: [{ text: 'A' }] }, 'anthropic'), 'A');
  assert.strictEqual(extractAiText({ choices: [{ message: { content: 'B' } }] }, 'openai-chat'), 'B');
  assert.strictEqual(extractAiText({ output_text: 'C' }, 'openai-responses'), 'C');
  assert.strictEqual(
    extractAiText({ output: [{ content: [{ text: 'D' }] }] }, 'openai-responses'),
    'D'
  );
  assert.strictEqual(extractAiText(null, 'anthropic'), '');
  assert.strictEqual(extractAiText({ choices: [] }, 'openai-chat'), '');
});

test('切换服务商自动填入该服务商的默认地址与模型', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  localStorage.removeItem('english3000.ai');
  ready.forEach(function (fn) {
    fn();
  });

  const provider = document.getElementById('ai-provider');
  const baseUrl = document.getElementById('ai-base-url');
  const model = document.getElementById('ai-model');

  provider.value = 'anthropic';
  provider.changeHandlers[0]();

  assert.strictEqual(baseUrl.value, 'https://api.anthropic.com/v1/messages');
  assert.strictEqual(model.value, 'claude-sonnet-4-5');

  provider.value = 'openai-chat';
  provider.changeHandlers[0]();

  assert.strictEqual(baseUrl.value, 'https://api.deepseek.com/chat/completions');
  assert.strictEqual(model.value, 'deepseek-chat');
});

test('Chat Completions 模式连接成功', async function () {
  start();
  saveAiKey('chat-key');
  saveAiSettings({
    provider: 'openai-chat',
    baseUrl: 'https://example.test/chat/completions',
    model: 'deepseek-test'
  });
  globalThis.fetch = function () {
    return Promise.resolve({ ok: true, text: () => Promise.resolve('{}') });
  };

  assert.deepStrictEqual(await testAiConnection(), { ok: true, message: '连接成功。' });
});
