const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { REPO_ROOT, loadAppScripts } = require('./helpers.js');

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function makeNode() {
  return {
    hidden: false,
    className: '',
    value: '',
    checked: false,
    type: '',
    children: [],
    clickHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        this.clickHandlers.push(fn);
      }
    }
  };
}

function createContainerFake() {
  return {
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
}

function installFakeDocument() {
  const nodes = {
    'writing-box': makeNode(),
    'writing-text': makeNode(),
    'writing-msg': makeNode(),
    'writing-task': createContainerFake(),
    'today-info': createContainerFake()
  };

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

function loadRealData() {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'data.js' });
  return sandbox.window;
}

test('WRITING_TASKS 共 40 条且类型分段正确', function () {
  const data = loadRealData();

  assert.strictEqual(data.WRITING_TASKS.length, 40);

  data.WRITING_TASKS.forEach(function (item, index) {
    assert.strictEqual(item.no, index + 1, '第 ' + (index + 1) + ' 条的 no 不正确');
  });

  data.WRITING_TASKS.forEach(function (item) {
    if (item.no <= 20) {
      assert.strictEqual(item.type, 'task1', '第 ' + item.no + ' 条应为 task1');
    } else {
      assert.strictEqual(item.type, 'task2', '第 ' + item.no + ' 条应为 task2');
    }
  });
});

test('每条写作题字段完整且合法', function () {
  const data = loadRealData();

  data.WRITING_TASKS.forEach(function (item) {
    assert.ok(item.prompt.length > 0, '第 ' + item.no + ' 条的题目为空');

    if (item.type === 'task1') {
      assert.ok(item.data.length > 0, '第 ' + item.no + ' 条的 Task 1 数据为空');
    } else {
      assert.strictEqual(item.data, '', '第 ' + item.no + ' 条的 Task 2 数据应为空');
    }

    assert.ok(item.minWords === 150 || item.minWords === 250, '第 ' + item.no + ' 条的最少字数不合法');
    assert.ok(item.minutes === 20 || item.minutes === 40, '第 ' + item.no + ' 条的建议分钟不合法');

    [item.prompt, item.data].forEach(function (value) {
      assert.strictEqual(value.indexOf('http://'), -1);
      assert.strictEqual(value.indexOf('https://'), -1);
    });
  });
});

test('writingTaskFor 按写作日顺序循环取题', function () {
  loadAppScripts();

  assert.strictEqual(writingTaskFor(121).no, 1);
  assert.strictEqual(writingTaskFor(128).no, 2);
  assert.strictEqual(writingTaskFor(121 + 7 * 39).no, 40);
  assert.strictEqual(writingTaskFor(121 + 7 * 40).no, 1);

  assert.strictEqual(writingTaskFor(120), null);
  assert.strictEqual(writingTaskFor(0), null);
  assert.strictEqual(writingTaskFor(501), null);
});

test('写作日显示题目与要求说明', function () {
  loadAppScripts();
  const nodes = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;

  renderWritingBox();

  assert.strictEqual(nodes['writing-box'].hidden, false);
  assert.strictEqual(nodes['writing-task'].children.length, 4);
});

test('Task 1 的题目、数据与要求文字正确', function () {
  loadAppScripts();
  const nodes = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;

  renderWritingBox();

  const texts = textsOf(nodes['writing-task']);
  assert.strictEqual(texts[0], '今日写作：Task 1');
  assert.ok(texts[1].indexOf(WRITING_TASKS[0].prompt) === 0);
  assert.strictEqual(texts[2], '数据：' + WRITING_TASKS[0].data);
});

test('Task 2 没有数据段', function () {
  loadAppScripts();
  const nodes = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121 + 7 * 20;

  renderWritingBox();

  const texts = textsOf(nodes['writing-task']);
  assert.strictEqual(texts[0], '今日写作：Task 2');
  assert.strictEqual(nodes['writing-task'].children.length, 3);
  assert.strictEqual(texts[1], WRITING_TASKS[20].prompt);
  assert.strictEqual(texts[2], '至少 250 词，建议 40 分钟。');
});

test('非写作日隐藏写作框且题目区为空', function () {
  loadAppScripts();
  const nodes = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 120;

  renderWritingBox();

  assert.strictEqual(nodes['writing-box'].hidden, true);
  assert.strictEqual(nodes['writing-task'].children.length, 0);
});
