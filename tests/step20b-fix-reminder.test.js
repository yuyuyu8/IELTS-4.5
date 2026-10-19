const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

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
    children: [],
    className: '',
    appendChild: function (child) {
      this.children.push(child);
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

function mountToday() {
  loadAppScripts();
  const container = makeNode();

  document.getElementById = function (id) {
    if (id === 'today-info') {
      return container;
    }
    return null;
  };
  document.createElement = function () {
    return makeNode();
  };

  state.settings.startDate = dateOffset(0);
  return container;
}

function textsOf(container) {
  return container.children.map(function (child) {
    return child.textContent;
  });
}

test('完成过学习日但从未导出备份时，今天视图提醒', function () {
  const container = mountToday();
  state.progress.day = 2;
  state.progress.completedDate = dateOffset(-1);
  renderToday();

  assert.ok(textsOf(container).indexOf('还没有导出过备份，请到设置页导出。') !== -1);
});

test('尚未完成过学习日时，从未导出备份也不提醒', function () {
  const container = mountToday();
  state.progress.day = 1;
  renderToday();

  assert.strictEqual(textsOf(container).indexOf('还没有导出过备份，请到设置页导出。'), -1);
});
