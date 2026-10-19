const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppWithReadyCallbacks } = require('./helpers.js');

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

function createFakeDom() {
  const startDateInput = { value: '' };

  const saveButton = {
    clickHandlers: [],
    addEventListener: function (type, fn) {
      if (type === 'click') {
        saveButton.clickHandlers.push(fn);
      }
    }
  };

  const message = { textContent: '' };

  const todayContainer = {
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

  const navButtons = NAV_VIEWS.map(function (view) {
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

  const elements = {
    'start-date': startDateInput,
    'save-start-date': saveButton,
    'start-date-msg': message,
    'today-info': todayContainer
  };

  document.getElementById = function (id) {
    return elements[id] === undefined ? null : elements[id];
  };

  document.querySelectorAll = function (selector) {
    if (selector === '.nav-btn') {
      return navButtons;
    }
    return [];
  };

  document.createElement = function () {
    return { textContent: '' };
  };

  return {
    startDateInput: startDateInput,
    saveButton: saveButton,
    message: message,
    todayContainer: todayContainer,
    navButtons: navButtons
  };
}

function textsOf(container) {
  return container.children.map(function (child) {
    return child.textContent;
  });
}

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function findNavButton(navButtons, view) {
  return navButtons.filter(function (button) {
    return button.dataset.view === view;
  })[0];
}

test('页面加载后今天视图自动渲染提示信息', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  readyCallbacks.forEach(function (fn) {
    fn();
  });

  assert.deepStrictEqual(textsOf(dom.todayContainer), ['请先到设置页填写开始日期。']);
});

test('页面加载时按已保存的开始日期渲染今天视图', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  readyCallbacks.forEach(function (fn) {
    fn();
  });

  assert.deepStrictEqual(textsOf(dom.todayContainer), [
    '今天是第 1 天 / 500',
    '当前阶段：第一阶段',
    '今日新词目标：10 个',
    '本周为音标周。'
  ]);
});

test('点击导航按钮时刷新今天视图', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  readyCallbacks.forEach(function (fn) {
    fn();
  });

  assert.deepStrictEqual(textsOf(dom.todayContainer), ['请先到设置页填写开始日期。']);

  state.settings.startDate = dateOffset(0);
  findNavButton(dom.navButtons, 'review').clickHandlers[0]();

  assert.deepStrictEqual(textsOf(dom.todayContainer), [
    '今天是第 1 天 / 500',
    '当前阶段：第一阶段',
    '今日新词目标：10 个',
    '本周为音标周。'
  ]);
});

test('页面加载后每个导航按钮仍然只绑定一个 click 回调', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  readyCallbacks.forEach(function (fn) {
    fn();
  });

  dom.navButtons.forEach(function (button) {
    assert.strictEqual(
      button.clickHandlers.length,
      1,
      button.dataset.view + ' 按钮的 click 回调数量不正确'
    );
  });
});
