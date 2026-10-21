const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

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
    open: false,
    textContent: '',
    children: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function () {}
  };
}

function setup(completed) {
  loadAppScripts();
  const cache = {};

  document.getElementById = function (id) {
    if (cache[id] === undefined) {
      cache[id] = makeNode();
    }
    return cache[id];
  };

  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  state.progress.completedDate = completed ? todayString() : null;

  const group = document.getElementById('group-progress');
  group.open = false;

  renderUndoButton();

  return cache;
}

test('设置页的进度分组标题包含重做今天', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const start = html.indexOf('id="group-progress"');
  const end = html.indexOf('</details>', start);
  const section = html.slice(start, end);

  assert.ok(start !== -1);
  assert.ok(section.indexOf('<summary>进度与重做今天</summary>') !== -1);
  assert.ok(section.indexOf('id="progress-info"') !== -1);
  assert.ok(section.indexOf('id="undo-complete-btn"') !== -1);
});

test('当天已完成时显示按钮并自动展开分组', function () {
  const cache = setup(true);

  assert.strictEqual(cache['undo-complete-btn'].hidden, false);
  assert.strictEqual(cache['group-progress'].open, true);
});

test('当天未完成时按钮隐藏且分组不自动展开', function () {
  const cache = setup(false);

  assert.strictEqual(cache['undo-complete-btn'].hidden, true);
  assert.strictEqual(cache['group-progress'].open, false);
});
