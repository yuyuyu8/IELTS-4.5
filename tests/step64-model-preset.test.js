const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

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

function setupReady() {
  const ready = loadAppWithReadyCallbacks();
  const cache = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  ready.forEach(function (fn) {
    fn();
  });
  return cache;
}

test('modelPresetsFor 返回各服务商的预设', function () {
  loadAppScripts();

  assert.deepStrictEqual(modelPresetsFor('anthropic'), [
    'claude-sonnet-4-5',
    'claude-opus-4-1',
    'claude-haiku-4-5'
  ]);
  assert.deepStrictEqual(modelPresetsFor('openai-chat'), ['deepseek-chat', 'deepseek-reasoner']);
  assert.deepStrictEqual(modelPresetsFor('openai-responses'), ['gpt-4o', 'gpt-4o-mini']);
  assert.deepStrictEqual(modelPresetsFor('piano'), modelPresetsFor('openai-chat'));
});

test('切换服务商重建选项并填入第一个模型', function () {
  const cache = setupReady();
  const provider = cache['ai-provider'];

  provider.value = 'anthropic';
  provider.changeHandlers[0]();

  assert.strictEqual(cache['ai-model-preset'].children.length, 3);
  assert.strictEqual(cache['ai-model-preset'].children[0].value, 'claude-sonnet-4-5');
  assert.strictEqual(cache['ai-model-preset'].children[1].value, 'claude-opus-4-1');
  assert.strictEqual(cache['ai-model-preset'].children[2].value, 'claude-haiku-4-5');
  assert.strictEqual(cache['ai-model'].value, 'claude-sonnet-4-5');
});

test('切到 DeepSeek 时填入 deepseek-chat', function () {
  const cache = setupReady();
  const provider = cache['ai-provider'];

  provider.value = 'openai-chat';
  provider.changeHandlers[0]();

  assert.strictEqual(cache['ai-model-preset'].children.length, 2);
  assert.strictEqual(cache['ai-model'].value, 'deepseek-chat');
});

test('下拉框变化时把模型名写入输入框', function () {
  const cache = setupReady();
  const preset = cache['ai-model-preset'];

  preset.value = preset.children[1].value;
  preset.changeHandlers[0]();

  assert.strictEqual(cache['ai-model'].value, 'deepseek-reasoner');
});

test('进入页面时选当前模型且不覆盖输入框', function () {
  const ready = loadAppWithReadyCallbacks();
  const cache = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.settings.ai = {
    provider: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-reasoner'
  };
  ready.forEach(function (fn) {
    fn();
  });

  assert.strictEqual(cache['ai-model-preset'].children.length, 2);
  assert.strictEqual(cache['ai-model-preset'].children[1].selected, true);
  assert.strictEqual(cache['ai-model'].value, 'deepseek-reasoner');
});

test('保存设置读取手改后的模型名', function () {
  const cache = setupReady();

  cache['ai-provider'].value = 'openai-chat';
  cache['ai-base-url'].value = 'https://example.test/v1';
  cache['ai-key'].value = 'k';
  cache['ai-model-preset'].value = cache['ai-model-preset'].children[1].value;
  cache['ai-model'].value = 'my-model';
  cache['save-ai-btn'].clickHandlers[0]();

  assert.strictEqual(state.settings.ai.model, 'my-model');
});
