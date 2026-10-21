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

function setupDay(day) {
  loadAppScripts();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = day;
  state.progress.refilledDay = day;
}

function scoreInput(ta, cc, lr, gra) {
  return { ta: ta, cc: cc, lr: lr, gra: gra };
}

test('roundToHalf 四舍五入到 0.5', function () {
  loadAppScripts();

  assert.strictEqual(roundToHalf(5.25), 5.5);
  assert.strictEqual(roundToHalf(5.24), 5.0);
  assert.strictEqual(roundToHalf(6.75), 7.0);
  assert.strictEqual(roundToHalf(0), 0);
});

test('writingBand 取四项平均并四舍五入', function () {
  loadAppScripts();

  assert.strictEqual(writingBand(scoreInput(6, 6, 6, 6)), 6);
  assert.strictEqual(writingBand(scoreInput(6, 5.5, 5.5, 5)), 5.5);
});

test('saveWritingScores 保存四项与总分', function () {
  setupDay(121);

  assert.strictEqual(saveWritingScores(scoreInput(6, 5.5, 5.5, 5)), true);
  assert.deepStrictEqual(state.daily['121'].writingScores, {
    ta: 6,
    cc: 5.5,
    lr: 5.5,
    gra: 5,
    band: 5.5
  });
});

test('saveWritingScores 拒绝越界、非法步长、字符串与缺项', function () {
  const cases = [
    scoreInput(9.5, 5, 5, 5),
    scoreInput(6.3, 5, 5, 5),
    scoreInput('6', 5, 5, 5),
    { ta: 6, cc: 5, lr: 5 }
  ];

  for (const scores of cases) {
    setupDay(121);
    assert.strictEqual(saveWritingScores(scores), false);
    assert.strictEqual(state.daily['121'], undefined);
  }
});

test('当天已完成时不保存分数', function () {
  setupDay(121);
  state.progress.completedDate = todayString();

  assert.strictEqual(saveWritingScores(scoreInput(6, 5.5, 5.5, 5)), false);
});

test('保存失败时不留下记录', function () {
  setupDay(121);
  localStorage.setItem = function () {
    throw new Error('storage unavailable');
  };

  assert.strictEqual(saveWritingScores(scoreInput(6, 5.5, 5.5, 5)), false);
  assert.strictEqual(state.daily['121'], undefined);
});

test('备份校验接受四项分数并拒绝非法值', function () {
  loadAppScripts();

  function backupWith(scores) {
    state.daily = { '121': { writingScores: scores } };
    return JSON.parse(exportBackupText());
  }

  const valid = { ta: 6, cc: 5.5, lr: 5.5, gra: 5, band: 5.5 };
  assert.deepStrictEqual(validateBackup(backupWith(valid)), { ok: true });

  const tooHigh = Object.assign({}, valid, { ta: 10 });
  assert.strictEqual(validateBackup(backupWith(tooHigh)).reason, 'invalidDaily');

  const badBand = Object.assign({}, valid, { band: 'x' });
  assert.strictEqual(validateBackup(backupWith(badBand)).reason, 'invalidDaily');

  const extraKey = Object.assign({}, valid, { foo: 1 });
  assert.strictEqual(validateBackup(backupWith(extraKey)).reason, 'invalidDaily');
});

test('写作日渲染时回填已有分数与消息', function () {
  setupDay(121);
  state.daily['121'] = {
    writingScores: { ta: 6, cc: 5.5, lr: 5.5, gra: 5, band: 5.5 }
  };

  renderWritingBox();

  assert.strictEqual(document.getElementById('writing-ta').value, '6');
  assert.strictEqual(document.getElementById('writing-cc').value, '5.5');
  assert.strictEqual(document.getElementById('writing-lr').value, '5.5');
  assert.strictEqual(document.getElementById('writing-gra').value, '5');
  assert.strictEqual(
    document.getElementById('writing-score-msg').textContent,
    '已记录：TA 6.0 / CC 5.5 / LR 5.5 / GRA 5.0，总分 5.5。'
  );
});

test('点击保存分数写入记录，空值给出提示且不改记录', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 121;
  state.progress.refilledDay = 121;
  ready.forEach(function (fn) {
    fn();
  });

  const ta = document.getElementById('writing-ta');
  const cc = document.getElementById('writing-cc');
  const lr = document.getElementById('writing-lr');
  const gra = document.getElementById('writing-gra');
  const button = document.getElementById('save-writing-score-btn');
  const message = document.getElementById('writing-score-msg');

  ta.value = '6';
  cc.value = '5.5';
  lr.value = '5.5';
  gra.value = '5';
  button.clickHandlers[0]();

  assert.strictEqual(state.daily['121'].writingScores.band, 5.5);
  assert.strictEqual(message.textContent, '已记录：TA 6.0 / CC 5.5 / LR 5.5 / GRA 5.0，总分 5.5。');

  gra.value = '';
  button.clickHandlers[0]();

  assert.strictEqual(message.textContent, '请把四项都填成 0 到 9 之间、可含 0.5 的数字。');
  assert.strictEqual(state.daily['121'].writingScores.band, 5.5);
});
