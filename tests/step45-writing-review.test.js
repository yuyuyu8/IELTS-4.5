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
    selection: null,
    appendChild: function (child) {
      this.children.push(child);
    },
    focus: function () {},
    setSelectionRange: function (start, end) {
      this.selection = [start, end];
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

function setupDay(day) {
  loadAppScripts();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = day;
  state.progress.refilledDay = day;
}

test('countWords 按空白切分统计', function () {
  loadAppScripts();

  assert.strictEqual(countWords('one two three\n'), 3);
  assert.strictEqual(countWords(''), 0);
  assert.strictEqual(countWords(' \n '), 0);
});

test('没有作文时返回空字符串', function () {
  setupDay(121);

  assert.strictEqual(buildWritingReviewText(), '');
});

test('生成的文字包含题目与统计', function () {
  setupDay(121);
  state.daily['121'] = { writingText: 'I think so.' };

  const text = buildWritingReviewText();
  const lines = text.split('\n');

  assert.strictEqual(lines[0], '# 雅思写作批改请求');
  assert.ok(text.indexOf('## 题目') !== -1);
  assert.ok(text.indexOf('Task 1') !== -1);
  assert.ok(text.indexOf(WRITING_TASKS[0].prompt) !== -1);
  assert.ok(text.indexOf('## 我的作文') !== -1);
  assert.ok(text.indexOf('I think so.') !== -1);
  assert.ok(text.indexOf('## 统计') !== -1);
  assert.ok(text.indexOf('字数：3 词（要求至少 150 词）') !== -1);
});

test('生成的文字包含评分要求并以句型建议结尾', function () {
  setupDay(121);
  state.daily['121'] = { writingText: 'Some words here.' };

  const text = buildWritingReviewText();

  assert.ok(text.indexOf('## 请按以下四项各给 0-9 分') !== -1);
  assert.ok(text.indexOf('任务完成度') !== -1);
  assert.ok(text.indexOf('连贯与衔接') !== -1);
  assert.ok(text.indexOf('词汇资源') !== -1);
  assert.ok(text.indexOf('语法多样性与准确性') !== -1);
  assert.strictEqual(text.slice(-9), '一个可以升级的句型');
});

test('非写作日与已完成时返回空字符串', function () {
  setupDay(120);
  state.daily['120'] = { writingText: 'Draft text.' };
  assert.strictEqual(buildWritingReviewText(), '');

  setupDay(121);
  state.daily['121'] = { writingText: 'Draft text.' };
  state.progress.completedDate = todayString();
  assert.strictEqual(buildWritingReviewText(), '');
});

test('Task 2 的写作日不含数据行', function () {
  setupDay(261);
  state.daily['261'] = { writingText: 'My essay body.' };

  const text = buildWritingReviewText();

  assert.ok(text.indexOf('Task 2') !== -1);
  assert.ok(text.indexOf('至少 250 词') !== -1);
  assert.strictEqual(text.indexOf('数据：'), -1);
});

test('没有作文时点击生成只给出提示', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  state.progress.refilledDay = 121;
  ready.forEach(function (fn) {
    fn();
  });

  document.getElementById('build-review-btn').clickHandlers[0]();

  assert.strictEqual(
    document.getElementById('writing-review-msg').textContent,
    '还没有可提交的作文，请先写并保存。'
  );
  assert.strictEqual(document.getElementById('writing-review-text').value, '');
});

test('有作文时点击生成填入文本框并选中', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  state.progress.refilledDay = 121;
  state.daily['121'] = { writingText: 'A short essay for review.' };
  ready.forEach(function (fn) {
    fn();
  });

  document.getElementById('build-review-btn').clickHandlers[0]();

  const output = document.getElementById('writing-review-text');
  assert.strictEqual(output.value, buildWritingReviewText());
  assert.deepStrictEqual(output.selection, [0, output.value.length]);
  assert.strictEqual(
    document.getElementById('writing-review-msg').textContent,
    '已生成，长按文本框全选复制。'
  );
});
