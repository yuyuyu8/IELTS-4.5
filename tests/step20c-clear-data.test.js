const test = require('node:test');
const { afterEach } = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

afterEach(function () {
  delete globalThis.confirm;
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
    value: '',
    className: '',
    children: [],
    clickHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        node.clickHandlers.push(fn);
      }
    },
    focus: function () {},
    setSelectionRange: function () {}
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

const FAKE_IDS = [
  'today-info',
  'today-words',
  'review-list',
  'start-date',
  'start-date-msg',
  'save-start-date',
  'complete-today-btn',
  'complete-today-msg',
  'backup-status',
  'backup-text',
  'backup-msg',
  'export-backup-btn',
  'import-backup-btn',
  'clear-data-btn',
  'clear-data-msg'
];

function installFakeDocument() {
  const nodes = {};
  FAKE_IDS.forEach(function (id) {
    nodes[id] = makeNode();
  });

  document.getElementById = function (id) {
    return nodes[id] === undefined ? null : nodes[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  return nodes;
}

function textsOf(node) {
  return node.children.map(function (child) {
    return child.textContent;
  });
}

function startAndLoad() {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const nodes = installFakeDocument();
  readyCallbacks.forEach(function (fn) {
    fn();
  });
  return nodes;
}

test('index.html 的设置视图中存在清空数据的按钮与消息段落', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const settingsIndex = html.indexOf('id="view-settings"');
  const snippets = [
    '<button id="clear-data-btn">清空全部数据</button>',
    '<p id="clear-data-msg"></p>'
  ];

  snippets.forEach(function (snippet) {
    const index = html.indexOf(snippet);
    assert.notStrictEqual(index, -1, '应存在 ' + snippet);
    assert.ok(index > settingsIndex, snippet + ' 应位于 view-settings 之后');
  });
});

test('清空后 state 与 localStorage 都恢复默认', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 5;
  state.words = { '1': { status: 'learning', reviewStep: 0, nextReview: 6, reviewCount: 0 } };

  assert.deepStrictEqual(clearAllData(), { ok: true });
  assert.deepStrictEqual(state, makeDefaultState());
  assert.deepStrictEqual(JSON.parse(localStorage.getItem('english3000.v1')), makeDefaultState());
});

test('保存失败时不改动数据', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 5;
  const before = JSON.stringify(state);

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  assert.deepStrictEqual(clearAllData(), { ok: false, reason: 'saveFailed' });
  assert.strictEqual(JSON.stringify(state), before);
});

test('确认后点击清空：数据重置并刷新界面', function () {
  const nodes = startAndLoad();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 5;
  nodes['backup-text'].value = 'old';
  globalThis.confirm = function () {
    return true;
  };

  nodes['clear-data-btn'].clickHandlers[0]();

  assert.deepStrictEqual(state, makeDefaultState());
  assert.strictEqual(nodes['clear-data-msg'].textContent, '已清空全部数据。');
  assert.strictEqual(nodes['backup-text'].value, '');
  assert.strictEqual(nodes['start-date'].value, '');
  assert.deepStrictEqual(textsOf(nodes['today-info']), ['请先到设置页填写开始日期。']);
});

test('确认框取消时不清空', function () {
  const nodes = startAndLoad();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 5;
  const before = JSON.stringify(state);
  globalThis.confirm = function () {
    return false;
  };

  nodes['clear-data-btn'].clickHandlers[0]();

  assert.strictEqual(nodes['clear-data-msg'].textContent, '已取消，未清空任何数据。');
  assert.strictEqual(JSON.stringify(state), before);
});

test('写入失败时点击清空不改动数据并给出提示', function () {
  const nodes = startAndLoad();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 5;
  const before = JSON.stringify(state);
  globalThis.confirm = function () {
    return true;
  };

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  nodes['clear-data-btn'].clickHandlers[0]();

  assert.strictEqual(nodes['clear-data-msg'].textContent, '清空失败：本地存储不可用，数据保持不变。');
  assert.strictEqual(JSON.stringify(state), before);
});

test('页面加载后清空按钮只绑定一个 click 回调', function () {
  const nodes = startAndLoad();

  assert.strictEqual(nodes['clear-data-btn'].clickHandlers.length, 1);
});

test('清空之后仍可导入清空前导出的备份', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 5;

  const text = exportBackupText();

  clearAllData();

  assert.deepStrictEqual(importBackupText(text), { ok: true });
  assert.strictEqual(state.progress.day, 5);
});
