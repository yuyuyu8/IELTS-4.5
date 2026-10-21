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

function makeNode() {
  const node = {
    hidden: false,
    className: '',
    value: '',
    children: [],
    clickHandlers: [],
    focusCalls: 0,
    selection: null,
    appendChild: function (child) {
      this.children.push(child);
    },
    focus: function () {
      node.focusCalls += 1;
    },
    setSelectionRange: function (start, end) {
      node.selection = [start, end];
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

function setupDay(day, startDate) {
  loadAppScripts();
  installFakeDocument();
  state.settings.startDate = startDate === undefined ? dateOffset(0) : startDate;
  state.progress.day = day;
  state.progress.refilledDay = day;
}

function learningRecord() {
  return { status: 'learning', reviewStep: 0, nextReview: 1, reviewCount: 0 };
}

test('未开始时给出未开始与空记录', function () {
  setupDay(1, null);

  const text = buildStudyContextText();

  assert.strictEqual(text.split('\n')[0], '# 学习上下文');
  assert.ok(text.indexOf('- 当前学习日：未开始。') !== -1);
  assert.strictEqual(text.indexOf('当前阶段'), -1);
  assert.ok(text.indexOf('- 最近一次检查：暂无。') !== -1);
  assert.ok(text.indexOf('- 写作分数记录：暂无。') !== -1);
});

test('第 1 天显示阶段、新词目标与今日任务', function () {
  setupDay(1);

  const text = buildStudyContextText();

  assert.ok(text.indexOf('- 当前学习日：第 1 天 / 500。') !== -1);
  assert.ok(text.indexOf('- 当前阶段：第一阶段。') !== -1);
  assert.ok(text.indexOf('- 今日新词目标：10 个。') !== -1);
  assert.ok(text.indexOf('- 今日任务：听力、音标。') !== -1);
  assert.ok(text.indexOf('- 已安排的语法点：暂无。') !== -1);
  assert.ok(text.indexOf('- 最近学过的 20 个词：暂无。') !== -1);
});

test('第 8 天列出第一个语法点', function () {
  setupDay(8);

  const text = buildStudyContextText();

  assert.ok(text.indexOf('- 已安排的语法点：1 / ' + GRAMMAR.length +
    ' 条。最近一条是「' + GRAMMAR[0].name + '」。') !== -1);
});

test('第 500 天语法点数量封顶', function () {
  setupDay(500);

  const text = buildStudyContextText();

  assert.ok(text.indexOf('- 已安排的语法点：' + GRAMMAR.length + ' / ' + GRAMMAR.length +
    ' 条。最近一条是「' + GRAMMAR[GRAMMAR.length - 1].name + '」。') !== -1);
});

test('最近学过的词按编号降序排列', function () {
  setupDay(121);
  state.words = {
    '1': learningRecord(),
    '3': learningRecord(),
    '5': learningRecord()
  };

  const text = buildStudyContextText();
  const line = text.split('\n').filter(function (item) {
    return item.indexOf('- 最近学过的 20 个词：') === 0;
  })[0];

  assert.strictEqual(line, '- 最近学过的 20 个词：5. ' + WORDS[4].word + ', 3. ' +
    WORDS[2].word + ', 1. ' + WORDS[0].word + '。');
  assert.ok(line.indexOf('5. ') < line.indexOf('3. '));
  assert.ok(line.indexOf('3. ') < line.indexOf('1. '));
});

test('最近学过的词最多取 20 个', function () {
  loadAppScripts();

  const words = [];
  for (let id = 1; id <= 30; id += 1) {
    words.push({ id: id, word: 'word' + id });
  }
  globalThis.WORDS = words;

  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  state.progress.refilledDay = 121;
  state.words = {};

  for (let id = 1; id <= 30; id += 1) {
    state.words[String(id)] = learningRecord();
  }

  const text = buildStudyContextText();

  assert.ok(text.indexOf('30. word30') !== -1);
  assert.strictEqual(text.indexOf('10. word10'), -1);
});

test('输出最近一次检查与最多三条写作分数', function () {
  setupDay(121);
  state.tests = [{ day: 50, total: 20, correct: 15 }];
  state.daily = {
    '121': { writingScores: { ta: 6, cc: 5.5, lr: 5.5, gra: 5, band: 5.5 } },
    '128': { writingScores: { ta: 6, cc: 6, lr: 6, gra: 6, band: 6 } }
  };

  const text = buildStudyContextText();

  assert.ok(text.indexOf('- 最近一次检查：第 50 天，答对 15 / 20。') !== -1);
  assert.ok(text.indexOf('- 写作分数记录：第128天 6、第121天 5.5。') !== -1);
});

test('点击生成按钮填入文本框并全选', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  state.progress.refilledDay = 1;
  ready.forEach(function (fn) {
    fn();
  });

  document.getElementById('build-context-btn').clickHandlers[0]();

  const output = document.getElementById('study-context-text');
  const expected = buildStudyContextText();

  assert.strictEqual(output.value, expected);
  assert.deepStrictEqual(output.selection, [0, expected.length]);
  assert.strictEqual(output.focusCalls, 1);
  assert.strictEqual(document.getElementById('study-context-msg').textContent, '已生成，长按文本框全选复制。');
});
