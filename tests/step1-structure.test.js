const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts } = require('./helpers.js');

const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');

function findTags(source, tagName) {
  const pattern = new RegExp('<' + tagName + '\\b[^>]*>', 'g');
  return source.match(pattern) || [];
}

function getAttr(tag, name) {
  const match = tag.match(new RegExp('\\b' + name + '="([^"]*)"'));
  return match ? match[1] : null;
}

function hasClass(tag, className) {
  const value = getAttr(tag, 'class');
  return value !== null && value.split(/\s+/).indexOf(className) !== -1;
}

function createClassList() {
  const set = new Set();
  return {
    add: function (name) {
      set.add(name);
    },
    remove: function (name) {
      set.delete(name);
    },
    contains: function (name) {
      return set.has(name);
    }
  };
}

test('index.html 中 5 个 section.view 的 id 顺序正确', function () {
  const sections = findTags(html, 'section').filter(function (tag) {
    return hasClass(tag, 'view');
  });
  assert.deepStrictEqual(
    sections.map(function (tag) {
      return getAttr(tag, 'id');
    }),
    ['view-today', 'view-review', 'view-words', 'view-test', 'view-settings']
  );
});

test('index.html 中 5 个 .nav-btn 的 data-view 顺序正确', function () {
  const buttons = findTags(html, 'button').filter(function (tag) {
    return hasClass(tag, 'nav-btn');
  });
  assert.deepStrictEqual(
    buttons.map(function (tag) {
      return getAttr(tag, 'data-view');
    }),
    ['today', 'review', 'words', 'test', 'settings']
  );
});

test('head 中包含 viewport meta 标签与 data: 图标', function () {
  const viewport = findTags(html, 'meta').filter(function (tag) {
    return getAttr(tag, 'name') === 'viewport';
  });
  assert.strictEqual(viewport.length, 1, '应存在且只存在一个 name="viewport" 的 meta 标签');
  assert.strictEqual(getAttr(viewport[0], 'content'), 'width=device-width, initial-scale=1');

  const icon = findTags(html, 'link').filter(function (tag) {
    return getAttr(tag, 'rel') === 'icon';
  });
  assert.strictEqual(icon.length, 1, '应存在且只存在一个 rel="icon" 的 link 标签');
  assert.strictEqual(getAttr(icon[0], 'href'), 'data:,');
});

test('data.js 的 script 标签位于 app.js 之前', function () {
  const dataIndex = html.indexOf('<script src="data.js"></script>');
  const appIndex = html.indexOf('<script src="app.js"></script>');
  assert.notStrictEqual(dataIndex, -1, '应存在引入 data.js 的 script 标签');
  assert.notStrictEqual(appIndex, -1, '应存在引入 app.js 的 script 标签');
  assert.ok(dataIndex < appIndex, 'data.js 必须位于 app.js 之前');
});

test('showView 切换视图、切换导航高亮并滚动到顶部', function () {
  const stubs = loadAppScripts();
  const document = stubs.document;
  const window = stubs.window;

  assert.strictEqual(typeof showView, 'function', 'app.js 应定义全局函数 showView');

  const viewIds = ['view-today', 'view-review', 'view-words', 'view-test', 'view-settings'];
  const navViews = ['today', 'review', 'words', 'test', 'settings'];

  const views = viewIds.map(function (id) {
    return { id: id, classList: createClassList() };
  });
  const buttons = navViews.map(function (view) {
    return { dataset: { view: view }, classList: createClassList() };
  });

  document.querySelectorAll = function (selector) {
    if (selector === 'section.view') {
      return views;
    }
    if (selector === '.nav-btn') {
      return buttons;
    }
    return [];
  };

  const scrollCalls = [];
  window.scrollTo = function (x, y) {
    scrollCalls.push([x, y]);
  };

  showView('review');

  views.forEach(function (view, index) {
    assert.strictEqual(
      view.classList.contains('active'),
      viewIds[index] === 'view-review',
      view.id + ' 的 active 状态不正确'
    );
  });

  buttons.forEach(function (button, index) {
    assert.strictEqual(
      button.classList.contains('active'),
      navViews[index] === 'review',
      navViews[index] + ' 按钮的 active 状态不正确'
    );
  });

  assert.deepStrictEqual(scrollCalls, [[0, 0]], 'showView 应调用 window.scrollTo(0, 0)');
});
