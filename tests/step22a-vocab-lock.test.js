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

function makeNode() {
  const node = {
    className: '',
    hidden: false,
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

function installFakeDocument() {
  const ids = [
    'today-info',
    'daily-checks',
    'writing-box',
    'writing-text',
    'today-words',
    'review-list',
    'complete-today-btn',
    'complete-today-msg'
  ];

  const nodes = {};
  ids.forEach(function (id) {
    nodes[id] = makeNode();
  });

  document.getElementById = function (id) {
    return nodes[id] === undefined ? null : nodes[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  return nodes;
}

function textsOf(node) {
  return node.children.map(function (child) {
    return child.textContent;
  });
}

test('默认状态下不锁定', function () {
  loadAppScripts();

  assert.strictEqual(state.nextWordId, 1);
  assert.strictEqual(vocabLocked, false);
});

test('旧版记录会锁定学习功能', function () {
  loadAppScripts();
  localStorage.setItem('english3000.v1', JSON.stringify({
    version: 1,
    settings: { startDate: dateOffset(0) },
    queue: [1, 2],
    nextWordId: 11,
    words: { '1': { status: 'learning', reviewStep: 0, nextReview: 2, reviewCount: 0 } },
    daily: {},
    tests: [],
    progress: { day: 2, completedDate: null, refilledDay: 2 }
  }));
  state = loadState();
  vocabLocked = computeVocabLocked();

  assert.strictEqual(vocabLocked, true);

  const before = JSON.stringify(state);
  assert.strictEqual(ensureQueue(), false);
  assert.strictEqual(JSON.stringify(state), before);

  assert.strictEqual(markWordLearned(1), false);
  assert.strictEqual(JSON.stringify(state), before);

  assert.deepStrictEqual(completeToday(), { ok: false, reason: 'vocabLocked' });
  assert.strictEqual(JSON.stringify(state), before);

  assert.strictEqual(answerReview(1, 'known'), false);
  assert.strictEqual(JSON.stringify(state), before);

  assert.strictEqual(setDailyCheck('listen', true), false);
  assert.strictEqual(JSON.stringify(state), before);

  assert.strictEqual(saveWritingText('x'), false);
  assert.strictEqual(JSON.stringify(state), before);
});

test('锁定时不写入指纹，清空后恢复并写入指纹', function () {
  loadAppScripts();
  state.nextWordId = 11;
  vocabLocked = true;

  saveState();
  const stored = JSON.parse(localStorage.getItem('english3000.v1'));
  assert.strictEqual(stored.settings.vocabularyFingerprint, undefined);

  clearAllData();
  assert.strictEqual(vocabLocked, false);

  state.settings.startDate = dateOffset(0);
  ensureQueue();

  const storedAfter = JSON.parse(localStorage.getItem('english3000.v1'));
  assert.strictEqual(storedAfter.settings.vocabularyFingerprint, vocabularyFingerprint());
});

test('导出会带上指纹，校验会识别不一致', function () {
  loadAppScripts();
  state.nextWordId = 11;

  const data = JSON.parse(exportBackupText());
  assert.strictEqual(data.settings.vocabularyFingerprint, vocabularyFingerprint());

  delete data.settings.vocabularyFingerprint;
  assert.strictEqual(validateBackup(data).reason, 'vocabMismatch');

  data.settings.vocabularyFingerprint = 'abc';
  assert.strictEqual(validateBackup(data).reason, 'vocabMismatch');

  data.settings.vocabularyFingerprint = 5;
  assert.strictEqual(validateBackup(data).reason, 'invalidSettings');

  data.settings.vocabularyFingerprint = vocabularyFingerprint();
  assert.deepStrictEqual(validateBackup(data), { ok: true });
});

test('词表指纹稳定', function () {
  loadAppScripts();

  const first = vocabularyFingerprint();
  assert.strictEqual(typeof first, 'string');
  assert.ok(first.length > 0);
  assert.strictEqual(vocabularyFingerprint(), first);
});

test('锁定时今天视图只显示锁定提示', function () {
  loadAppScripts();
  const nodes = installFakeDocument();
  state.settings.startDate = dateOffset(0);

  renderToday();
  assert.ok(nodes['daily-checks'].children.length > 0);

  vocabLocked = true;
  renderToday();

  const texts = textsOf(nodes['today-info']);
  assert.strictEqual(texts[0], LOCK_MESSAGE);
  assert.strictEqual(
    texts.some(function (text) {
      return text.indexOf('今天是第') === 0;
    }),
    false
  );
  assert.strictEqual(nodes['daily-checks'].children.length, 0);
  assert.strictEqual(nodes['writing-box'].hidden, true);
});

test('锁定时新词与复习列表只显示锁定提示', function () {
  loadAppScripts();
  const nodes = installFakeDocument();
  vocabLocked = true;

  renderTodayWords();
  renderReview();

  assert.deepStrictEqual(textsOf(nodes['today-words']), [LOCK_MESSAGE]);
  assert.deepStrictEqual(textsOf(nodes['review-list']), [LOCK_MESSAGE]);
});

test('锁定时点击完成今天只显示锁定提示', function () {
  const ready = loadAppWithReadyCallbacks();
  const nodes = installFakeDocument();
  ready.forEach(function (fn) {
    fn();
  });

  vocabLocked = true;
  const before = JSON.stringify(state);

  nodes['complete-today-btn'].clickHandlers[0]();

  assert.strictEqual(nodes['complete-today-msg'].textContent, LOCK_MESSAGE);
  assert.strictEqual(JSON.stringify(state), before);
});
