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
    'today-overview': createContainerFake(),
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

test('countLearnedWords 统计学习中与已掌握', function () {
  loadAppScripts();

  state.words = {
    '1': { status: 'learning', reviewStep: 0, nextReview: 3, reviewCount: 0 },
    '2': { status: 'learning', reviewStep: 1, nextReview: 4, reviewCount: 1 },
    '3': { status: 'mastered', reviewStep: 7, nextReview: null, reviewCount: 8 }
  };

  assert.deepStrictEqual(countLearnedWords(), { total: 3, learning: 2, mastered: 1 });

  state.words = {};
  assert.deepStrictEqual(countLearnedWords(), { total: 0, learning: 0, mastered: 0 });
});

test('第一天的预计用时为 35 分钟', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  state.queue = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  state.words = {};

  assert.strictEqual(estimatedMinutes(), 35);
});

test('有到期复习时按每题 0.2 分钟计入', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 61;
  state.queue = [];
  for (let id = 1; id <= 15; id++) {
    state.queue.push(id);
  }
  state.words = {};
  for (let id = 1; id <= 40; id++) {
    state.words[String(id)] = { status: 'learning', reviewStep: 0, nextReview: 61, reviewCount: 0 };
  }

  assert.strictEqual(getDueReviewWords().length, 40);
  assert.strictEqual(estimatedMinutes(), 60);
});

test('写作日的预计用时包含写作时间', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  state.queue = [];
  for (let id = 1; id <= 15; id++) {
    state.queue.push(id);
  }
  state.words = {};

  assert.strictEqual(estimatedMinutes(), 80);
});

test('renderOverview 输出累计已学与预计用时', function () {
  loadAppScripts();
  const nodes = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  state.words = {};

  renderOverview();

  assert.strictEqual(nodes['today-overview'].children.length, 2);
  assert.strictEqual(textsOf(nodes['today-overview'])[0], '累计已学：0 个（学习中 0，已掌握 0）。');
  assert.strictEqual(textsOf(nodes['today-overview'])[1].indexOf('今日预计用时：约 '), 0);
  assert.strictEqual(textsOf(nodes['today-overview'])[1].slice(-4), ' 分钟。');
});

test('当天已完成或锁定时不显示概览', function () {
  loadAppScripts();
  let nodes = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  state.progress.completedDate = todayString();

  renderOverview();
  assert.strictEqual(nodes['today-overview'].children.length, 0);

  loadAppScripts();
  nodes = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  vocabLocked = true;

  renderOverview();
  assert.strictEqual(nodes['today-overview'].children.length, 0);
});

test('renderToday 会渲染进度概览', function () {
  loadAppScripts();
  const nodes = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  state.words = {};

  renderToday();

  assert.strictEqual(nodes['today-overview'].children.length, 2);
});
