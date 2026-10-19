const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

function createElementFake() {
  return {
    textContent: '',
    className: '',
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
  const todayInfo = createContainerFake();
  const todayWords = createContainerFake();

  document.getElementById = function (id) {
    if (id === 'today-info') {
      return todayInfo;
    }
    if (id === 'today-words') {
      return todayWords;
    }
    return null;
  };

  document.createElement = function () {
    return createElementFake();
  };

  return { todayInfo: todayInfo, todayWords: todayWords };
}

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

test('每一行都有已学按钮且只绑定一个 click 回调', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  for (let i = 1; i <= 10; i++) {
    const learnButton = dom.todayWords.children[i].children[2];
    assert.strictEqual(learnButton.className, 'learn-btn', '第 ' + i + ' 行的已学按钮 className 不正确');
    assert.strictEqual(learnButton.textContent, '已学');
    assert.strictEqual(learnButton.clickHandlers.length, 1, '第 ' + i + ' 行的已学按钮回调数量不正确');
  }
});

test('点击已学后该词从列表移除并记入学习记录', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  dom.todayWords.children[1].children[2].clickHandlers[0]();

  assert.strictEqual(dom.todayWords.children.length, 10);
  assert.strictEqual(dom.todayWords.children[1].children[0].textContent, '2. orange n. 名词 橙子');
  assert.strictEqual(state.words['1'].status, 'learning');
});

test('全部标记后显示已全部标记提示', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  for (let i = 0; i < 10; i++) {
    dom.todayWords.children[1].children[2].clickHandlers[0]();
  }

  assert.strictEqual(dom.todayWords.children.length, 1);
  assert.strictEqual(dom.todayWords.children[0].textContent, '今日新词已全部标记为已学。');
});

test('第五阶段保留的旧词同样有已学按钮', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.progress.day = 241;
  state.queue = [1, 2];
  state.nextWordId = 3;
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  assert.strictEqual(dom.todayWords.children.length, 3);
  assert.strictEqual(dom.todayWords.children[0].textContent, '今日新词（共 2 个）：');
  assert.strictEqual(dom.todayWords.children[1].children[2].textContent, '已学');
});

test('页面加载后已学按钮依然可用', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  readyCallbacks.forEach(function (fn) {
    fn();
  });

  dom.todayWords.children[1].children[2].clickHandlers[0]();

  assert.strictEqual(dom.todayWords.children.length, 10);
});

test('重复渲染不会重复绑定已学按钮', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();
  renderTodayWords();

  assert.strictEqual(dom.todayWords.children.length, 11);
  assert.strictEqual(dom.todayWords.children[1].children[2].clickHandlers.length, 1);
});
