const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

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
    'today-words': createContainerFake(),
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

function setup() {
  loadAppScripts();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  ensureQueue();
}

test('新词行包含已学与我已会两个按钮', function () {
  setup();

  const row = createWordRow(WORDS[0]);

  assert.strictEqual(row.children.length, 4);
  assert.strictEqual(row.children[2].className, 'learn-btn');
  assert.strictEqual(row.children[3].className, 'known-btn');
  assert.strictEqual(row.children[3].textContent, '我已会');
});

test('我已会把词标记为已掌握并移出队列', function () {
  setup();

  assert.strictEqual(markWordKnown(1), true);
  assert.strictEqual(state.queue.length, 10);
  assert.strictEqual(state.queue.indexOf(1), -1);
  assert.deepStrictEqual(state.words['1'], knownRecord());
});

test('我已会会补入一个新词补足当天数量', function () {
  setup();

  markWordKnown(1);

  assert.strictEqual(state.queue[state.queue.length - 1], 11);
});

test('保存失败时不改动队列、词状态与补词标记', function () {
  setup();

  const queueBefore = JSON.stringify(state.queue);
  const wordsBefore = JSON.stringify(state.words);
  const refilledBefore = state.progress.refilledDay;

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  assert.strictEqual(markWordKnown(1), false);
  assert.strictEqual(JSON.stringify(state.queue), queueBefore);
  assert.strictEqual(JSON.stringify(state.words), wordsBefore);
  assert.strictEqual(state.progress.refilledDay, refilledBefore);
});

test('当天已完成时不能再我已会', function () {
  setup();
  state.progress.completedDate = todayString();

  assert.strictEqual(markWordKnown(1), false);
  assert.strictEqual(state.queue.length, 10);
});

test('点击我已会后该行变为下一个词', function () {
  setup();
  const nodes = installFakeDocument();

  renderTodayWords();
  nodes['today-words'].children[1].children[3].clickHandlers[0]();

  assert.strictEqual(state.words['1'].status, 'mastered');
  assert.strictEqual(nodes['today-words'].children[1].children[0].textContent, '2. orange n. 名词 橙子');
});
