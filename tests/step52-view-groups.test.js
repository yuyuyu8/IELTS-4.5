const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts } = require('./helpers.js');

function readHtml() {
  return fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
}

function sectionSlice(html, id) {
  const start = html.indexOf('id="' + id + '"');
  const end = html.indexOf('</section>', start);
  return html.slice(start, end);
}

function groupTags(section) {
  return section.match(/<details class="settings-group"[^>]*>/g) || [];
}

function makeNode() {
  const node = {
    hidden: false,
    className: '',
    value: '',
    checked: false,
    disabled: false,
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

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

test('四个视图共十五个分组', function () {
  const html = readHtml();

  assert.strictEqual(groupTags(sectionSlice(html, 'view-today')).length, 9);
  assert.strictEqual(groupTags(sectionSlice(html, 'view-review')).length, 1);
  assert.strictEqual(groupTags(sectionSlice(html, 'view-words')).length, 3);
  assert.strictEqual(groupTags(sectionSlice(html, 'view-test')).length, 2);
});

test('今天视图的分组顺序正确', function () {
  const tags = groupTags(sectionSlice(readHtml(), 'view-today'));
  const ids = tags.map(function (tag) {
    const match = tag.match(/id="([^"]+)"/);
    return match === null ? '' : match[1];
  });

  assert.deepStrictEqual(ids, [
    'group-today-info',
    'group-phonics',
    'group-daily-checks',
    'group-today-words',
    'group-listening',
    'group-reading',
    'group-writing',
    'group-speaking',
    'group-overview'
  ]);
});

test('今天视图只有指定分组默认展开', function () {
  const tags = groupTags(sectionSlice(readHtml(), 'view-today'));
  const openIds = tags.filter(function (tag) {
    return /\bopen\b/.test(tag);
  }).map(function (tag) {
    return tag.match(/id="([^"]+)"/)[1];
  });

  assert.deepStrictEqual(openIds, [
    'group-today-info',
    'group-phonics',
    'group-daily-checks',
    'group-today-words',
    'group-writing'
  ]);
});

test('完成今天按钮在所有分组之后', function () {
  const section = sectionSlice(readHtml(), 'view-today');
  const lastDetailsEnd = section.lastIndexOf('</details>');
  const buttonIndex = section.indexOf('id="complete-today-btn"');
  const messageIndex = section.indexOf('id="complete-today-msg"');

  assert.ok(lastDetailsEnd !== -1);
  assert.ok(buttonIndex > lastDetailsEnd);
  assert.ok(messageIndex > buttonIndex);
  assert.strictEqual(section.slice(lastDetailsEnd).indexOf('<details'), -1);
});

test('第 1 天各分组按容器内容显示或隐藏', function () {
  loadAppScripts();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  state.progress.refilledDay = 1;

  renderToday();
  renderTodayWords();
  syncTodayGroups();

  assert.strictEqual(document.getElementById('group-phonics').hidden, false);
  assert.strictEqual(document.getElementById('group-daily-checks').hidden, false);
  assert.strictEqual(document.getElementById('group-today-words').hidden, false);
  assert.strictEqual(document.getElementById('group-listening').hidden, false);
  assert.strictEqual(document.getElementById('group-writing').hidden, true);
  assert.strictEqual(document.getElementById('group-overview').hidden, false);
});

test('容器清空后对应分组隐藏', function () {
  loadAppScripts();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 1;
  state.progress.refilledDay = 1;

  renderToday();
  renderTodayWords();

  ['phonics-list', 'daily-checks', 'today-words', 'listening-box', 'today-overview'].forEach(function (id) {
    document.getElementById(id).textContent = '';
  });

  syncTodayGroups();

  assert.strictEqual(document.getElementById('group-phonics').hidden, true);
  assert.strictEqual(document.getElementById('group-daily-checks').hidden, true);
  assert.strictEqual(document.getElementById('group-today-words').hidden, true);
  assert.strictEqual(document.getElementById('group-listening').hidden, true);
  assert.strictEqual(document.getElementById('group-overview').hidden, true);
});

test('元素缺失时同步函数不抛异常', function () {
  loadAppScripts();
  document.getElementById = function () {
    return null;
  };

  assert.doesNotThrow(function () {
    syncTodayGroups();
  });
});
