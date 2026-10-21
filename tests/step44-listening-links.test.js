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
    textContent: '',
    href: '',
    target: '',
    rel: '',
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
  const container = createContainerFake();

  document.getElementById = function (id) {
    if (id === 'listening-box') {
      return container;
    }
    return null;
  };
  document.createElement = function () {
    return makeNode();
  };

  return container;
}

function loadRealData() {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'data.js' });
  return sandbox.window;
}

test('LISTENING_LINKS 字段完整且为 https 地址', function () {
  const data = loadRealData();

  assert.ok(data.LISTENING_LINKS.length >= 3, '链接数量应不少于 3');

  data.LISTENING_LINKS.forEach(function (link, index) {
    assert.strictEqual(link.no, index + 1, '第 ' + (index + 1) + ' 条的 no 不正确');
    assert.ok(link.name.length > 0, '第 ' + link.no + ' 条的名称为空');
    assert.ok(link.note.length > 0, '第 ' + link.no + ' 条的说明为空');
    assert.strictEqual(link.url.indexOf('https://'), 0, '第 ' + link.no + ' 条的地址不是 https');
  });
});

test('听力区在音频之后追加标题与链接列表', function () {
  loadAppScripts();
  const container = installFakeDocument();
  state.settings.startDate = dateOffset(0);

  renderListening();

  assert.strictEqual(container.children.length, 5);
  assert.strictEqual(container.children[0].textContent, '听力：' + LESSONS[0].title);
  assert.strictEqual(
    container.children[1].textContent,
    '第 1 课，共 49 课。建议听两到三遍，听不懂的地方对照“阅读”里的课文。'
  );
  assert.strictEqual(container.children[2].src, LESSONS[0].audioFile);
});

test('链接区标题文字正确', function () {
  loadAppScripts();
  const container = installFakeDocument();
  state.settings.startDate = dateOffset(0);

  renderListening();

  assert.strictEqual(container.children[3].textContent, '也可以到这些站点听（双语对照、可变速）：');
});

test('链接列表按数据逐条渲染', function () {
  loadAppScripts();
  const container = installFakeDocument();
  state.settings.startDate = dateOffset(0);

  renderListening();

  const list = container.children[4];
  assert.strictEqual(list.className, 'link-list');
  assert.strictEqual(list.children.length, LISTENING_LINKS.length);

  list.children.forEach(function (row) {
    assert.strictEqual(row.className, 'link-row');
    assert.strictEqual(row.children.length, 2);
  });
});

test('链接属性与说明文字正确', function () {
  loadAppScripts();
  const container = installFakeDocument();
  state.settings.startDate = dateOffset(0);

  renderListening();

  const row = container.children[4].children[0];
  const anchor = row.children[0];
  const note = row.children[1];

  assert.strictEqual(anchor.href, LISTENING_LINKS[0].url);
  assert.strictEqual(anchor.target, '_blank');
  assert.strictEqual(anchor.rel, 'noopener noreferrer');
  assert.strictEqual(anchor.textContent, LISTENING_LINKS[0].name);
  assert.strictEqual(note.textContent, '— ' + LISTENING_LINKS[0].note);
});

test('当天已完成时不显示听力与外链', function () {
  loadAppScripts();
  const container = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.completedDate = todayString();

  renderListening();

  assert.strictEqual(container.children.length, 0);
});
