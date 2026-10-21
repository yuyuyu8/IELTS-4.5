const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

function settingsSection() {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const start = html.indexOf('id="view-settings"');
  const end = html.indexOf('</section>', start);
  return html.slice(start, end);
}

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

test('设置页有九个分组，AI 接口在最后且只有第一组展开', function () {
  const section = settingsSection();
  const tags = section.match(/<details class="settings-group"[^>]*>/g) || [];

  assert.strictEqual(tags.length, 9);
  assert.ok(/\bopen\b/.test(tags[0]));
  assert.strictEqual(tags.slice(1).filter(function (tag) {
    return /\bopen\b/.test(tag);
  }).length, 0);

  const lastIndex = section.lastIndexOf('<details');
  const lastSummary = section.slice(lastIndex).match(/<summary>([^<]*)<\/summary>/);
  assert.strictEqual(lastSummary[1], 'AI 接口（可选）');
});

test('九个分组标题顺序正确', function () {
  const section = settingsSection();
  const summaries = [];
  const regex = /<summary>([^<]*)<\/summary>/g;
  let match = regex.exec(section);

  while (match !== null) {
    summaries.push(match[1]);
    match = regex.exec(section);
  }

  assert.deepStrictEqual(summaries, [
    '计划开始日期',
    '进度',
    '备份与恢复',
    '清空数据',
    '发音方式',
    '发音口音',
    '学习上下文',
    '测试：跳到指定学习日',
    'AI 接口（可选）'
  ]);
});

test('关键元素仍位于设置页内', function () {
  const section = settingsSection();
  const ids = [
    'start-date',
    'undo-complete-btn',
    'backup-text',
    'clear-data-btn',
    'voice-mode-btn',
    'accent-btn',
    'build-context-btn',
    'ai-provider'
  ];

  ids.forEach(function (id) {
    assert.ok(section.indexOf('id="' + id + '"') !== -1, id + ' 应在设置页内');
  });
});

test('额外要求为空时输出不变', function () {
  loadAppScripts();

  const base = buildStudyContextText();

  assert.strictEqual(buildStudyContextText(''), base);
  assert.strictEqual(buildStudyContextText(' '), base);
  assert.strictEqual(buildStudyContextText(' ').indexOf('## 额外要求'), -1);
});

test('额外要求插在请据此出题之前', function () {
  loadAppScripts();

  const text = buildStudyContextText('出一道关于环境的话题');

  assert.ok(text.indexOf('## 额外要求') !== -1);
  assert.ok(text.indexOf('出一道关于环境的话题') !== -1);
  assert.ok(text.indexOf('## 额外要求') < text.indexOf('## 请据此出题'));
});

test('点击生成时读取额外要求输入框', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  state.progress.refilledDay = 1;
  ready.forEach(function (fn) {
    fn();
  });

  document.getElementById('study-context-extra').value = 'A';
  document.getElementById('build-context-btn').clickHandlers[0]();

  const value = document.getElementById('study-context-text').value;

  assert.ok(value.indexOf('## 额外要求') !== -1);
  assert.ok(value.indexOf('A') !== -1);
});
