const test = require('node:test');
const assert = require('node:assert');

const { loadAppWithReadyCallbacks } = require('./helpers.js');

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

test('切换服务商清空模型下拉框且不改模型名', function () {
  const ready = loadAppWithReadyCallbacks();
  const cache = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.settings.ai = {
    provider: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'keep-model'
  };
  ready.forEach(function (fn) {
    fn();
  });

  cache['ai-provider'].value = 'anthropic';
  cache['ai-provider'].changeHandlers[0]();

  assert.strictEqual(cache['ai-model-preset'].children.length, 0);
  assert.strictEqual(cache['ai-model'].value, 'keep-model');
  assert.strictEqual(cache['ai-base-url'].value, 'https://api.anthropic.com/v1/messages');
});
