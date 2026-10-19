const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

function createElementFake() {
  return {
    textContent: '',
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

function createFakeDom() {
  const elements = {
    'start-date': createElementFake(),
    'start-date-msg': createElementFake(),
    'save-start-date': createElementFake(),
    'today-info': createContainerFake(),
    'today-words': createContainerFake()
  };

  document.getElementById = function (id) {
    return elements[id] === undefined ? null : elements[id];
  };

  document.createElement = function () {
    return createElementFake();
  };

  return elements;
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

test('第五阶段仍有旧词时今天视图不显示“进入全面复习”', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 241;
  state.queue = [1, 2, 3];
  state.nextWordId = 4;

  renderToday();

  const texts = textsOf(dom['today-info']);
  assert.ok(texts.indexOf('第五阶段不再引入新词，请先完成剩余的 3 个旧词。') !== -1);
  assert.ok(texts.indexOf('今日无新词，进入全面复习。') === -1);
});

test('保存开始日期后立即显示今日新词列表', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  readyCallbacks.forEach(function (fn) {
    fn();
  });

  dom['start-date'].value = dateOffset(0);
  dom['save-start-date'].clickHandlers[0]();

  assert.strictEqual(dom['today-words'].children.length, 11);
  assert.strictEqual(dom['today-words'].children[0].textContent, '今日新词（共 10 个）：');
});
