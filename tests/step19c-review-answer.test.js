const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function record(nextReview) {
  return { status: 'learning', reviewStep: 0, nextReview: nextReview, reviewCount: 0 };
}

function makeNode() {
  const node = {
    children: [],
    clickHandlers: [],
    className: '',
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        node.clickHandlers.push(fn);
      }
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

function textsOf(node) {
  return node.children.map(function (child) {
    return child.textContent;
  });
}

function mount(day, words) {
  loadAppScripts();
  const nodes = {
    'review-list': makeNode(),
    'today-info': makeNode()
  };

  document.getElementById = function (id) {
    return nodes[id] === undefined ? null : nodes[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  state.settings.startDate = dateOffset(0);
  state.progress.day = day;
  state.words = words;

  renderReview();
  return nodes;
}

function buttonOf(nodes, index, buttonIndex) {
  return nodes['review-list'].children[index].children[1].children[buttonIndex];
}

test('复习行的四个按钮都只绑定一个 click 回调', function () {
  const nodes = mount(2, { '1': record(2), '2': record(2) });

  for (let index = 1; index <= 2; index++) {
    for (let buttonIndex = 0; buttonIndex <= 3; buttonIndex++) {
      assert.strictEqual(
        buttonOf(nodes, index, buttonIndex).clickHandlers.length,
        1,
        '第 ' + index + ' 行第 ' + buttonIndex + ' 个按钮的回调数量不正确'
      );
    }
  }
});

test('点击认识会推进复习步并刷新列表', function () {
  const nodes = mount(2, { '1': record(2), '2': record(2) });

  buttonOf(nodes, 1, 1).clickHandlers[0]();

  assert.deepStrictEqual(state.words['1'], {
    status: 'learning',
    reviewStep: 1,
    nextReview: 4,
    reviewCount: 1
  });
  assert.strictEqual(nodes['review-list'].children.length, 2);
  assert.strictEqual(nodes['review-list'].children[0].textContent, '待复习（共 1 个）：');
  assert.strictEqual(nodes['review-list'].children[1].children[0].textContent, '2. orange n. 名词 橙子');
});

test('点击模糊会推迟到次日并刷新列表', function () {
  const nodes = mount(2, { '1': record(2), '2': record(2) });

  buttonOf(nodes, 1, 2).clickHandlers[0]();

  assert.deepStrictEqual(state.words['1'], {
    status: 'learning',
    reviewStep: 0,
    nextReview: 3,
    reviewCount: 1
  });
  assert.strictEqual(nodes['review-list'].children[0].textContent, '待复习（共 1 个）：');
});

test('点击不认识会重置复习步并刷新列表', function () {
  const nodes = mount(2, {
    '1': { status: 'learning', reviewStep: 2, nextReview: 2, reviewCount: 4 }
  });

  buttonOf(nodes, 1, 3).clickHandlers[0]();

  assert.deepStrictEqual(state.words['1'], {
    status: 'learning',
    reviewStep: 0,
    nextReview: 3,
    reviewCount: 5
  });
  assert.deepStrictEqual(textsOf(nodes['review-list']), ['今天没有到期的复习。']);
});

test('点击复习导航会渲染复习列表', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const nodes = {
    'today-info': makeNode(),
    'review-list': makeNode()
  };

  const navViews = ['today', 'review', 'words', 'test', 'settings'];
  const navButtons = navViews.map(function (view) {
    const button = {
      dataset: { view: view },
      classList: {
        add: function () {},
        remove: function () {}
      },
      clickHandlers: [],
      addEventListener: function (type, fn) {
        if (type === 'click') {
          button.clickHandlers.push(fn);
        }
      }
    };
    return button;
  });

  document.getElementById = function (id) {
    return nodes[id] === undefined ? null : nodes[id];
  };
  document.createElement = function () {
    return makeNode();
  };
  document.querySelectorAll = function (selector) {
    if (selector === '.nav-btn') {
      return navButtons;
    }
    return [];
  };

  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.refilledDay = 2;
  state.words = { '1': record(2) };

  readyCallbacks.forEach(function (fn) {
    fn();
  });

  navButtons[1].clickHandlers[0]();

  assert.strictEqual(nodes['review-list'].children[0].textContent, '待复习（共 1 个）：');
  assert.strictEqual(nodes['review-list'].children[1].children[0].textContent, '1. apple n. 名词 苹果');
});

test('点击发音按钮朗读该行单词', function () {
  const nodes = mount(2, { '1': record(2) });
  const calls = [];
  window.speakWord = function (text) {
    calls.push(text);
  };

  buttonOf(nodes, 1, 0).clickHandlers[0]();

  assert.deepStrictEqual(calls, ['apple']);
});

test('今天视图显示待复习数量', function () {
  loadAppScripts();
  const nodes = { 'today-info': makeNode() };

  document.getElementById = function (id) {
    return nodes[id] === undefined ? null : nodes[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;
  state.progress.refilledDay = 2;
  state.words = { '1': record(2) };

  renderToday();

  assert.strictEqual(
    textsOf(nodes['today-info'])[4],
    '待复习：1 个。完成今天前必须全部作答，请到复习视图。'
  );
});
