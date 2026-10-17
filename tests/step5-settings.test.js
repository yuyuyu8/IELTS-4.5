const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppWithReadyCallbacks } = require('./helpers.js');

function createFakeDom() {
  const startDateInput = { value: '' };

  const saveButton = {
    clickHandlers: [],
    addEventListener: function (type, fn) {
      if (type === 'click') {
        saveButton.clickHandlers.push(fn);
      }
    }
  };

  const message = { textContent: '' };

  const todayContainer = {
    children: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    set textContent(value) {
      if (value === '') {
        this.children = [];
      }
    }
  };

  const elements = {
    'start-date': startDateInput,
    'save-start-date': saveButton,
    'start-date-msg': message,
    'today-info': todayContainer
  };

  document.getElementById = function (id) {
    return elements[id] === undefined ? null : elements[id];
  };

  document.createElement = function () {
    return { textContent: '' };
  };

  return {
    startDateInput: startDateInput,
    saveButton: saveButton,
    message: message,
    todayContainer: todayContainer
  };
}

function runReadyCallbacks(readyCallbacks) {
  readyCallbacks.forEach(function (fn) {
    fn();
  });
}

function textsOf(container) {
  return container.children.map(function (child) {
    return child.textContent;
  });
}

test('页面加载后保存按钮只绑定了一个 click 回调', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  runReadyCallbacks(readyCallbacks);

  assert.strictEqual(dom.saveButton.clickHandlers.length, 1);
});

test('页面加载时把已保存的开始日期回填到输入框', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  state.settings.startDate = '2099-02-02';
  runReadyCallbacks(readyCallbacks);

  assert.strictEqual(dom.startDateInput.value, '2099-02-02');

  const emptyCallbacks = loadAppWithReadyCallbacks();
  const emptyDom = createFakeDom();
  runReadyCallbacks(emptyCallbacks);

  assert.strictEqual(emptyDom.startDateInput.value, '');
});

test('输入框为空时点击保存只提示选择日期', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  runReadyCallbacks(readyCallbacks);

  dom.startDateInput.value = '';
  dom.saveButton.clickHandlers[0]();

  assert.strictEqual(dom.message.textContent, '请选择日期。');
  assert.strictEqual(state.settings.startDate, null);
});

test('点击保存后写入 state 与 localStorage 并提示已保存', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  runReadyCallbacks(readyCallbacks);

  dom.startDateInput.value = '2099-01-01';
  dom.saveButton.clickHandlers[0]();

  assert.strictEqual(state.settings.startDate, '2099-01-01');
  assert.ok(
    localStorage.getItem('english3000.v1').indexOf('"startDate":"2099-01-01"') !== -1,
    'localStorage 中应包含保存的开始日期'
  );
  assert.strictEqual(dom.message.textContent, '已保存：2099-01-01');
});

test('保存成功后刷新今天视图', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  runReadyCallbacks(readyCallbacks);

  dom.startDateInput.value = '2099-01-01';
  dom.saveButton.clickHandlers[0]();

  assert.deepStrictEqual(textsOf(dom.todayContainer), ['计划将于 2099-01-01 开始。']);
});

test('写入失败时提示保存失败并把 storageOk 置为 false', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  runReadyCallbacks(readyCallbacks);

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  dom.startDateInput.value = '2099-01-01';
  dom.saveButton.clickHandlers[0]();

  assert.strictEqual(dom.message.textContent, '保存失败：本地存储不可用。');
  assert.strictEqual(storageOk, false);
});

test('设置视图中存在日期输入框、保存按钮与消息段落', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const settingsIndex = html.indexOf('id="view-settings"');
  assert.notStrictEqual(settingsIndex, -1, '应存在 id="view-settings"');

  const snippets = [
    '<input type="date" id="start-date">',
    '<button id="save-start-date">保存</button>',
    '<p id="start-date-msg"></p>'
  ];

  snippets.forEach(function (snippet) {
    const index = html.indexOf(snippet);
    assert.notStrictEqual(index, -1, '应存在 ' + snippet);
    assert.ok(index > settingsIndex, snippet + ' 应位于 view-settings 之后');
  });
});
