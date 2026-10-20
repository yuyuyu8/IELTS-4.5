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
    setSelectionRange: function (start, end) {
      this.selection = [start, end];
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
  const ids = [
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
    'import-backup-btn'
  ];

  const nodes = {};
  ids.forEach(function (id) {
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

function sampleBackupText() {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  ensureQueue();
  markWordLearned(1);
  state.progress.day = 2;
  return exportBackupText();
}

test('index.html 的设置视图中存在备份区域的各个元素', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const settingsIndex = html.indexOf('id="view-settings"');
  const snippets = [
    'id="backup-status"',
    'id="export-backup-btn"',
    '<textarea id="backup-text"',
    'id="import-backup-btn"',
    'id="backup-msg"'
  ];

  snippets.forEach(function (snippet) {
    const index = html.indexOf(snippet);
    assert.notStrictEqual(index, -1, '应存在 ' + snippet);
    assert.ok(index > settingsIndex, snippet + ' 应位于 view-settings 之后');
  });
});

test('daysSinceBackup 未导出过返回 null，否则返回日历天数差', function () {
  loadAppScripts();

  assert.strictEqual(daysSinceBackup(), null);

  state.settings.lastBackupDate = dateOffset(-4);
  assert.strictEqual(daysSinceBackup(), 4);

  state.settings.lastBackupDate = 'abc';
  assert.strictEqual(daysSinceBackup(), null);
});

test('距离上次备份超过 3 天时今天视图提醒，3 天及以内不提醒', function () {
  loadAppScripts();
  const nodes = installFakeDocument();
  state.settings.startDate = dateOffset(0);

  state.settings.lastBackupDate = dateOffset(-3);
  renderToday();
  assert.strictEqual(textsOf(nodes['today-info']).length, 3);

  state.settings.lastBackupDate = dateOffset(-4);
  renderToday();
  assert.strictEqual(textsOf(nodes['today-info'])[3], '距离上次备份已 4 天，请到设置页导出备份。');
});

test('备份状态文字：未导出过时给出提示，超过 3 天时提醒', function () {
  loadAppScripts();
  const nodes = installFakeDocument();

  renderBackupStatus();
  assert.strictEqual(nodes['backup-status'].textContent, '尚未导出过备份。正式记录前请先导出一次。');

  state.settings.lastBackupDate = dateOffset(-5);
  renderBackupStatus();
  assert.strictEqual(
    nodes['backup-status'].textContent,
    '上次备份：' + dateOffset(-5) + '，已 5 天未备份，请尽快导出。'
  );
});

test('点击导出备份：填入文本并选中，记录导出日期', function () {
  const ready = loadAppWithReadyCallbacks();
  const nodes = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  ready.forEach(function (fn) {
    fn();
  });

  nodes['export-backup-btn'].clickHandlers[0]();

  const text = nodes['backup-text'].value;
  assert.deepStrictEqual(JSON.parse(text), state);
  assert.strictEqual(state.settings.lastBackupDate, todayString());
  assert.deepStrictEqual(nodes['backup-text'].selection, [0, text.length]);
  assert.strictEqual(nodes['backup-msg'].textContent, '已生成备份。请长按下方文本框全选并复制，保存到备忘录。');
  assert.strictEqual(nodes['backup-status'].textContent, '上次备份：' + todayString() + '。');
});

test('点击导入备份（确认后）：恢复学习记录并刷新今天视图', function () {
  const text = sampleBackupText();
  const ready = loadAppWithReadyCallbacks();
  const nodes = installFakeDocument();
  globalThis.confirm = function () {
    return true;
  };
  ready.forEach(function (fn) {
    fn();
  });

  nodes['backup-text'].value = text;
  nodes['import-backup-btn'].clickHandlers[0]();

  assert.strictEqual(state.progress.day, 2);
  assert.strictEqual(nodes['backup-msg'].textContent, '已导入备份，学习记录已恢复。');
  assert.strictEqual(textsOf(nodes['today-info'])[0], '今天是第 2 天 / 500');
});

test('导入的文字无法解析时提示，且不修改数据', function () {
  const ready = loadAppWithReadyCallbacks();
  const nodes = installFakeDocument();
  globalThis.confirm = function () {
    return true;
  };
  state.settings.startDate = dateOffset(0);
  ready.forEach(function (fn) {
    fn();
  });
  const before = JSON.stringify(state);

  nodes['backup-text'].value = 'broken{';
  nodes['import-backup-btn'].clickHandlers[0]();

  assert.strictEqual(nodes['backup-msg'].textContent, '备份内容不是有效的文本，请确认已完整粘贴。');
  assert.strictEqual(JSON.stringify(state), before);
});

test('确认框取消时不导入', function () {
  const text = sampleBackupText();
  const ready = loadAppWithReadyCallbacks();
  const nodes = installFakeDocument();
  globalThis.confirm = function () {
    return false;
  };
  ready.forEach(function (fn) {
    fn();
  });
  const before = JSON.stringify(state);

  nodes['backup-text'].value = text;
  nodes['import-backup-btn'].clickHandlers[0]();

  assert.strictEqual(nodes['backup-msg'].textContent, '已取消导入，未做任何修改。');
  assert.strictEqual(JSON.stringify(state), before);
});

test('写入失败时导入不生效并给出提示', function () {
  const text = sampleBackupText();
  const ready = loadAppWithReadyCallbacks();
  const nodes = installFakeDocument();
  globalThis.confirm = function () {
    return true;
  };
  ready.forEach(function (fn) {
    fn();
  });
  const before = JSON.stringify(state);

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };
  nodes['backup-text'].value = text;
  nodes['import-backup-btn'].clickHandlers[0]();

  assert.strictEqual(nodes['backup-msg'].textContent, '保存失败：本地存储不可用，未导入。');
  assert.strictEqual(JSON.stringify(state), before);
});

test('页面加载后导出与导入按钮各只绑定一个 click 回调，并显示备份状态', function () {
  const ready = loadAppWithReadyCallbacks();
  const nodes = installFakeDocument();
  ready.forEach(function (fn) {
    fn();
  });

  assert.strictEqual(nodes['export-backup-btn'].clickHandlers.length, 1);
  assert.strictEqual(nodes['import-backup-btn'].clickHandlers.length, 1);
  assert.strictEqual(nodes['backup-status'].textContent, '尚未导出过备份。正式记录前请先导出一次。');
});

test('导入后设置页的开始日期输入框同步为导入数据中的日期', function () {
  const text = sampleBackupText();
  const ready = loadAppWithReadyCallbacks();
  const nodes = installFakeDocument();
  globalThis.confirm = function () {
    return true;
  };
  ready.forEach(function (fn) {
    fn();
  });

  nodes['start-date'].value = '';
  nodes['backup-text'].value = text;
  nodes['import-backup-btn'].clickHandlers[0]();

  assert.strictEqual(nodes['start-date'].value, dateOffset(0));
});
