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

function makeNode(tag) {
  const node = {
    tagName: typeof tag === 'string' ? tag.toUpperCase() : 'DIV',
    id: '',
    type: '',
    className: '',
    textContent: '',
    value: '',
    checked: false,
    min: '',
    max: '',
    step: '',
    hidden: false,
    children: [],
    clickHandlers: [],
    changeHandlers: [],
    inputHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        node.clickHandlers.push(fn);
      }
      if (type === 'change') {
        node.changeHandlers.push(fn);
      }
      if (type === 'input') {
        node.inputHandlers.push(fn);
      }
    }
  };

  return node;
}

function createContainerFake() {
  const container = {
    children: [],
    appendChild: function (child) {
      this.children.push(child);
    }
  };

  let text = '';
  Object.defineProperty(container, 'textContent', {
    get: function () {
      return text;
    },
    set: function (value) {
      text = value;
      if (value === '') {
        container.children = [];
      }
    },
    configurable: true
  });

  return container;
}

function installFakeDocument() {
  const container = createContainerFake();
  const cache = { 'speaking-box': container };

  document.getElementById = function (id) {
    return cache[id] === undefined ? null : cache[id];
  };
  document.createElement = function (tag) {
    return makeNode(tag);
  };

  return container;
}

function setupDay(day) {
  loadAppScripts();
  const container = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = day;
  state.progress.refilledDay = day;
  return container;
}

test('口语题库条数与字段符合要求', function () {
  loadAppScripts();

  assert.strictEqual(SPEAKING_PART1.length, 40);
  assert.strictEqual(SPEAKING_PART2.length, 12);

  SPEAKING_PART1.forEach(function (item, index) {
    assert.strictEqual(item.no, index + 1);
    assert.strictEqual(item.prepareSeconds, 0);
    assert.strictEqual(item.speakSeconds, 30);
  });

  SPEAKING_PART2.forEach(function (item, index) {
    assert.strictEqual(item.no, index + 41);
    assert.strictEqual(item.prepareSeconds, 60);
    assert.strictEqual(item.speakSeconds, 120);
    assert.ok(item.points.length > 0);
  });
});

test('PLAN 口语参数正确', function () {
  loadAppScripts();

  assert.strictEqual(PLAN.speakingStartDay, 15);
  assert.strictEqual(PLAN.speakingPart2Every, 7);
});

test('Part 1 按学习日循环取题', function () {
  loadAppScripts();

  assert.strictEqual(speakingPart1For(14), null);
  assert.strictEqual(speakingPart1For(15), SPEAKING_PART1[0]);
  assert.strictEqual(speakingPart1For(16), SPEAKING_PART1[1]);
  assert.strictEqual(speakingPart1For(0), null);
  assert.strictEqual(speakingPart1For(501), null);
});

test('Part 2 每七天出现并循环', function () {
  loadAppScripts();

  assert.strictEqual(speakingPart2For(15), SPEAKING_PART2[0]);
  assert.strictEqual(speakingPart2For(17), null);
  assert.strictEqual(speakingPart2For(22), SPEAKING_PART2[1]);
  assert.strictEqual(speakingPart2For(15 + 7 * 12), SPEAKING_PART2[0]);
});

test('第 15 天同时渲染 Part 1 与 Part 2', function () {
  const container = setupDay(15);

  renderSpeaking();

  assert.strictEqual(container.children.length, 9);
  assert.strictEqual(container.children[0].textContent, '今日口语：Part 1');
  assert.strictEqual(container.children[2].textContent, '建议作答 30 秒。');
  assert.strictEqual(container.children[3].textContent, '本周 Part 2');
  assert.strictEqual(
    container.children[6].textContent,
    '建议准备 60 秒，作答 120 秒。'
  );
  assert.strictEqual(container.children[7].className, 'check-row');
});

test('非 Part 2 日只渲染 Part 1 与作答控件', function () {
  const container = setupDay(16);

  renderSpeaking();

  assert.strictEqual(container.children.length, 5);

  const checkRow = container.children[3];
  const scoreRow = container.children[4];

  assert.strictEqual(checkRow.className, 'check-row');
  assert.strictEqual(checkRow.children[0].type, 'checkbox');
  assert.strictEqual(scoreRow.children[1].type, 'number');
  assert.strictEqual(scoreRow.children[1].step, '0.5');
});

test('保存口语完成状态与自评分', function () {
  setupDay(15);

  assert.strictEqual(saveSpeakingRecord(true, 6), true);
  assert.strictEqual(state.daily['15'].speakingDone, true);
  assert.strictEqual(state.daily['15'].speakingScore, 6);

  assert.strictEqual(saveSpeakingRecord(false, null), true);
  assert.strictEqual(state.daily['15'].speakingDone, false);
  assert.strictEqual(state.daily['15'].speakingScore, null);
});

test('拒绝非法的完成状态与分数', function () {
  setupDay(15);

  assert.strictEqual(saveSpeakingRecord('yes', 6), false);
  assert.strictEqual(saveSpeakingRecord(true, 9.5), false);
  assert.strictEqual(saveSpeakingRecord(true, 6.3), false);
  assert.strictEqual(state.daily['15'], undefined);
});

test('备份校验接受口语字段并拒绝非法值', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);

  function backupWith(record) {
    state.daily = { '15': record };
    return JSON.parse(exportBackupText());
  }

  const valid = { speakingDone: true, speakingScore: 6 };
  assert.deepStrictEqual(validateBackup(backupWith(valid)), { ok: true });

  assert.strictEqual(
    validateBackup(backupWith({ speakingDone: 1, speakingScore: 6 })).reason,
    'invalidDaily'
  );
  assert.strictEqual(
    validateBackup(backupWith({ speakingDone: true, speakingScore: 10 })).reason,
    'invalidDaily'
  );
});

test('未开始口语日、已完成或锁定时不渲染', function () {
  let container = setupDay(14);
  renderSpeaking();
  assert.strictEqual(container.children.length, 0);

  container = setupDay(15);
  state.progress.completedDate = todayString();
  renderSpeaking();
  assert.strictEqual(container.children.length, 0);

  container = setupDay(15);
  vocabLocked = true;
  renderSpeaking();
  assert.strictEqual(container.children.length, 0);
});
