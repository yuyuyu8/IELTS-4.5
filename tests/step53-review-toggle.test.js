const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppWithReadyCallbacks } = require('./helpers.js');

function readHtml() {
  return fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
}

function makeNode() {
  const node = {
    hidden: false,
    className: '',
    value: '',
    children: [],
    clickHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        node.clickHandlers.push(fn);
      }
    },
    focus: function () {},
    setSelectionRange: function () {}
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

function installFakeDocument() {
  const cache = {};

  document.getElementById = function (id) {
    if (cache[id] === undefined) {
      cache[id] = makeNode();
    }
    return cache[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  return cache;
}

test('评审面板默认隐藏并包住三个元素', function () {
  const html = readHtml();
  const start = html.indexOf('<div id="writing-review-panel"');
  const end = html.indexOf('</div>', start);
  const panel = html.slice(start, end);

  assert.ok(start !== -1);
  assert.ok(/<div id="writing-review-panel"[^>]*\bhidden\b/.test(panel));
  assert.ok(panel.indexOf('id="build-review-btn"') !== -1);
  assert.ok(panel.indexOf('id="writing-review-text"') !== -1);
  assert.ok(panel.indexOf('id="writing-review-msg"') !== -1);
  assert.strictEqual(panel.indexOf('id="grade-writing-btn"'), -1);
});

test('切换按钮文字与位置正确', function () {
  const html = readHtml();
  const button = html.match(/<button id="toggle-writing-review-btn">([^<]*)<\/button>/);
  const buttonIndex = html.indexOf('id="toggle-writing-review-btn"');
  const panelIndex = html.indexOf('id="writing-review-panel"');

  assert.ok(button !== null);
  assert.strictEqual(button[1], '显示评审文字');
  assert.ok(buttonIndex < panelIndex);
});

test('点击切换面板显示与隐藏', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  ready.forEach(function (fn) {
    fn();
  });

  const toggle = document.getElementById('toggle-writing-review-btn');
  const panel = document.getElementById('writing-review-panel');
  panel.hidden = true;

  toggle.clickHandlers[0]();

  assert.strictEqual(panel.hidden, false);
  assert.strictEqual(toggle.textContent, '隐藏评审文字');

  toggle.clickHandlers[0]();

  assert.strictEqual(panel.hidden, true);
  assert.strictEqual(toggle.textContent, '显示评审文字');
});

test('元素缺失时切换函数不抛异常', function () {
  loadAppWithReadyCallbacks();
  document.getElementById = function () {
    return null;
  };

  assert.doesNotThrow(function () {
    handleToggleWritingReview();
  });
});

test('刷新后默认保持收起', function () {
  const html = readHtml();
  const tag = html.match(/<div id="writing-review-panel"[^>]*>/);

  assert.ok(tag !== null);
  assert.ok(/\bhidden\b/.test(tag[0]));
});
