const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { REPO_ROOT, installBrowserStubs } = require('./helpers.js');

const VIEW_IDS = ['view-today', 'view-review', 'view-words', 'view-test', 'view-settings'];
const NAV_VIEWS = ['today', 'review', 'words', 'test', 'settings'];

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

function loadAppAndRecordReadyCallbacks() {
  const stubs = installBrowserStubs();
  const readyCallbacks = [];
  stubs.document.addEventListener = function (type, fn) {
    if (type === 'DOMContentLoaded') {
      readyCallbacks.push(fn);
    }
  };
  const dataSource = fs.readFileSync(path.join(REPO_ROOT, 'data.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(REPO_ROOT, 'app.js'), 'utf8');
  vm.runInThisContext(dataSource, { filename: 'data.js' });
  vm.runInThisContext(appSource, { filename: 'app.js' });
  return { stubs: stubs, readyCallbacks: readyCallbacks };
}

function setupFakeDom(stubs) {
  const views = VIEW_IDS.map(function (id) {
    return { id: id, classList: createClassList() };
  });
  const buttons = NAV_VIEWS.map(function (view) {
    const button = {
      dataset: { view: view },
      classList: createClassList(),
      clickHandlers: [],
      addEventListener: function (type, fn) {
        if (type === 'click') {
          button.clickHandlers.push(fn);
        }
      }
    };
    return button;
  });
  stubs.document.querySelectorAll = function (selector) {
    if (selector === 'section.view') {
      return views;
    }
    if (selector === '.nav-btn') {
      return buttons;
    }
    return [];
  };
  return { views: views, buttons: buttons };
}

function activeViewIds(dom) {
  return dom.views
    .filter(function (view) {
      return view.classList.contains('active');
    })
    .map(function (view) {
      return view.id;
    });
}

function activeNavViews(dom) {
  return dom.buttons
    .filter(function (button) {
      return button.classList.contains('active');
    })
    .map(function (button) {
      return button.dataset.view;
    });
}

function startApp() {
  const loaded = loadAppAndRecordReadyCallbacks();
  const dom = setupFakeDom(loaded.stubs);
  loaded.readyCallbacks.forEach(function (fn) {
    fn();
  });
  return dom;
}

test('页面加载后默认只显示今天视图', function () {
  const dom = startApp();
  assert.deepStrictEqual(activeViewIds(dom), ['view-today']);
  assert.deepStrictEqual(activeNavViews(dom), ['today']);
});

test('每个导航按钮都绑定了且只绑定了一个 click 回调', function () {
  const dom = startApp();
  dom.buttons.forEach(function (button) {
    assert.strictEqual(
      button.clickHandlers.length,
      1,
      button.dataset.view + ' 按钮的 click 回调数量不正确'
    );
  });
});

test('点击每个导航按钮后，只显示对应视图并高亮对应按钮', function () {
  const dom = startApp();
  dom.buttons.forEach(function (button) {
    const target = button.dataset.view;
    button.clickHandlers[0]();
    assert.deepStrictEqual(
      activeViewIds(dom),
      ['view-' + target],
      '点击 ' + target + ' 后显示的视图不正确'
    );
    assert.deepStrictEqual(
      activeNavViews(dom),
      [target],
      '点击 ' + target + ' 后高亮的按钮不正确'
    );
  });
});
