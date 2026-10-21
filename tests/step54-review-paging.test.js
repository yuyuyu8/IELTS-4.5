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
  return {
    hidden: false,
    className: '',
    textContent: '',
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

function generateWords(count) {
  const words = [];

  for (let id = 1; id <= count; id += 1) {
    words.push({
      id: id,
      word: 'word' + id,
      pos: 'n.',
      category: '名词',
      meaning: '释义' + id,
      phonetic: '',
      example: ''
    });
  }

  return words;
}

function mount(count) {
  loadAppScripts();
  globalThis.WORDS = generateWords(count);

  const container = createContainerFake();
  const todayContainer = createContainerFake();

  document.getElementById = function (id) {
    if (id === 'review-list') {
      return container;
    }
    if (id === 'today-info') {
      return todayContainer;
    }
    return null;
  };
  document.createElement = function () {
    return makeNode();
  };

  state.settings.startDate = dateOffset(0);
  state.progress.day = 100;
  state.progress.refilledDay = 100;
  state.words = {};

  for (let id = 1; id <= count; id += 1) {
    state.words[String(id)] = {
      status: 'learning',
      reviewStep: 0,
      nextReview: 100,
      reviewCount: 0
    };
  }

  renderReview();
  return container;
}

function lastText(container) {
  return container.children[container.children.length - 1].textContent;
}

test('每页数量为 30', function () {
  loadAppScripts();

  assert.strictEqual(REVIEW_PAGE_SIZE, 30);
});

test('到期词 10 个时全部显示且没有分页提示', function () {
  const container = mount(10);

  assert.strictEqual(container.children.length, 11);
  container.children.forEach(function (child) {
    assert.strictEqual(child.textContent.indexOf('本轮显示前'), -1);
  });
});

test('到期词 30 个时没有分页提示', function () {
  const container = mount(30);

  assert.strictEqual(container.children.length, 31);
  assert.strictEqual(lastText(container).indexOf('本轮显示前'), -1);
});

test('到期词 31 个时提示还有 1 个', function () {
  const container = mount(31);

  assert.strictEqual(container.children.length, 32);
  assert.strictEqual(
    lastText(container),
    '本轮显示前 30 个，还有 1 个未显示；答完这 30 个后会自动显示下一批。'
  );
});

test('到期词 150 个时提示还有 120 个', function () {
  const container = mount(150);

  assert.strictEqual(container.children.length, 32);
  assert.ok(lastText(container).indexOf('还有 120 个未显示') !== -1);
});

test('答完第一个词后显示下一批', function () {
  const container = mount(150);
  const firstRow = container.children[1];

  firstRow.children[4].children[0].clickHandlers[0]();

  assert.strictEqual(container.children[0].textContent, '待复习（共 149 个）：');
  assert.ok(container.children[1].children[0].textContent.indexOf('2. word2') !== -1);
  assert.ok(lastText(container).indexOf('还有 119 个未显示') !== -1);
});
