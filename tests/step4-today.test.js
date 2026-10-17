const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts } = require('./helpers.js');

function createFakeContainer() {
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

function setupDom() {
  const container = createFakeContainer();
  document.getElementById = function (id) {
    if (id === 'today-info') {
      return container;
    }
    return null;
  };
  document.createElement = function () {
    return { textContent: '' };
  };
  return container;
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

test('没有开始日期时提示去设置页填写', function () {
  loadAppScripts();
  const container = setupDom();
  renderToday();
  assert.deepStrictEqual(textsOf(container), ['请先到设置页填写开始日期。']);
});

test('存储不可用且没有开始日期时依次显示两条提示', function () {
  loadAppScripts();
  const container = setupDom();
  storageOk = false;
  renderToday();
  assert.deepStrictEqual(textsOf(container), [
    '本地存储不可用，学习记录无法保存。',
    '请先到设置页填写开始日期。'
  ]);
});

test('开始日期在未来时提示计划开始日', function () {
  loadAppScripts();
  const container = setupDom();
  state.settings.startDate = '2099-01-01';
  renderToday();
  assert.deepStrictEqual(textsOf(container), ['计划将于 2099-01-01 开始。']);
});

test('第 1 天显示新词目标与音标周，重复渲染不叠加内容', function () {
  loadAppScripts();
  const container = setupDom();
  state.settings.startDate = dateOffset(0);
  renderToday();
  renderToday();
  assert.deepStrictEqual(textsOf(container), [
    '今天是第 1 天 / 500',
    '当前阶段：第一阶段',
    '今日新词目标：10 个',
    '本周为音标周。'
  ]);
  assert.strictEqual(container.children.length, 4);
});

test('第 91 天显示第二阶段与阅读任务', function () {
  loadAppScripts();
  const container = setupDom();
  state.settings.startDate = dateOffset(-90);
  renderToday();
  assert.deepStrictEqual(textsOf(container), [
    '今天是第 91 天 / 500',
    '当前阶段：第二阶段',
    '今日新词目标：15 个',
    '今天需要完成一次短文阅读。'
  ]);
});

test('计划结束后显示完成提示', function () {
  loadAppScripts();
  const container = setupDom();
  state.settings.startDate = '2000-01-01';
  renderToday();
  assert.deepStrictEqual(textsOf(container), ['全部学习计划已完成。']);
});

test('index.html 的今天视图中存在 today-info 容器', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const containerIndex = html.indexOf('<div id="today-info"></div>');
  const todayIndex = html.indexOf('id="view-today"');
  const reviewIndex = html.indexOf('id="view-review"');

  assert.notStrictEqual(containerIndex, -1, '应存在 <div id="today-info"></div>');
  assert.ok(todayIndex !== -1 && todayIndex < containerIndex, 'today-info 应位于 view-today 之后');
  assert.ok(reviewIndex !== -1 && containerIndex < reviewIndex, 'today-info 应位于 view-review 之前');
});
