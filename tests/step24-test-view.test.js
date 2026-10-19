const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts, loadAppWithReadyCallbacks } = require('./helpers.js');

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
    value: '',
    className: '',
    hidden: false,
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

const EXAM_IDS = [
  'today-info',
  'test-status',
  'start-exam-btn',
  'exam-area',
  'exam-progress',
  'exam-question',
  'exam-input',
  'exam-submit-btn',
  'exam-reveal-btn',
  'exam-know-btn',
  'exam-forget-btn',
  'exam-result'
];

function createExamDom() {
  const elements = {};
  EXAM_IDS.forEach(function (id) {
    elements[id] = makeNode();
  });

  document.getElementById = function (id) {
    return elements[id] === undefined ? null : elements[id];
  };
  document.createElement = function () {
    return makeNode();
  };

  return elements;
}

function learningRecord() {
  return { status: 'learning', reviewStep: 0, nextReview: 100, reviewCount: 0 };
}

test('index.html 的检查视图中存在检查元素', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const testIndex = html.indexOf('id="view-test"');
  const settingsIndex = html.indexOf('id="view-settings"');
  const snippets = [
    'id="test-status"',
    'id="start-exam-btn"',
    'id="exam-area"',
    'id="exam-input"',
    'id="exam-submit-btn"',
    'id="exam-reveal-btn"',
    'id="exam-know-btn"',
    'id="exam-forget-btn"',
    'id="exam-result"'
  ];

  snippets.forEach(function (snippet) {
    const index = html.indexOf(snippet);
    assert.notStrictEqual(index, -1, '应存在 ' + snippet);
    assert.ok(index > testIndex && index < settingsIndex, snippet + ' 应位于检查视图之内');
  });
});

test('检查日会多出一项检查任务', function () {
  loadAppScripts();

  assert.ok(DAILY_CHECK_NAMES.indexOf('test') !== -1);
  assert.ok(requiredDailyChecks(getDayInfoByDay(50)).indexOf('test') !== -1);
  assert.ok(requiredDailyChecks(getDayInfoByDay(500)).indexOf('test') !== -1);
  assert.strictEqual(requiredDailyChecks(getDayInfoByDay(49)).indexOf('test'), -1);
  assert.strictEqual(requiredDailyChecks(getDayInfoByDay(51)).indexOf('test'), -1);
});

test('检查不能手动勾选', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  const before = JSON.stringify(state.daily);

  assert.strictEqual(setDailyCheck('test', true), false);
  assert.strictEqual(JSON.stringify(state.daily), before);
  assert.deepStrictEqual(state.daily, {});
});

test('buildExam 题数与方向分配正确', function () {
  loadAppScripts();
  const pool = [];
  for (let id = 1; id <= 30; id++) {
    pool.push(id);
  }

  const questions = buildExam(pool, function () {
    return 0.5;
  });

  const count = Math.min(PLAN.testQuestionCount, pool.length);
  assert.strictEqual(questions.length, count);

  const zh2en = questions.filter(function (question) {
    return question.direction === 'zh2en';
  }).length;
  assert.strictEqual(zh2en, Math.ceil(count / 2));

  const ids = questions.map(function (question) {
    return question.wordId;
  });
  assert.strictEqual(new Set(ids).size, ids.length);
  ids.forEach(function (id) {
    assert.ok(pool.indexOf(id) !== -1);
  });
});

test('池中只有 5 个词时出 5 题', function () {
  loadAppScripts();

  const questions = buildExam([1, 2, 3, 4, 5], function () {
    return 0.3;
  });

  assert.strictEqual(questions.length, 5);
});

test('normalizeAnswer 忽略首尾空格与大小写', function () {
  loadAppScripts();

  assert.strictEqual(normalizeAnswer(' Apple '), normalizeAnswer('apple'));
  assert.notStrictEqual(normalizeAnswer(' appel '), normalizeAnswer('apple'));
});

test('完成检查后写入记录并勾选检查任务', function () {
  loadAppScripts();
  createExamDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 50;

  examState = {
    questions: [
      { wordId: 1, direction: 'zh2en' },
      { wordId: 2, direction: 'en2zh' }
    ],
    index: 2,
    results: [
      { wordId: 1, direction: 'zh2en', correct: true },
      { wordId: 2, direction: 'en2zh', correct: false }
    ]
  };

  const before = JSON.stringify(state.progress);
  const result = finishExam();

  assert.deepStrictEqual(result, { ok: true, correct: 1, total: 2 });
  assert.strictEqual(state.tests.length, 1);
  assert.strictEqual(state.tests[0].day, 50);
  assert.strictEqual(state.tests[0].date, todayString());
  assert.strictEqual(state.tests[0].total, 2);
  assert.strictEqual(state.tests[0].correct, 1);
  assert.deepStrictEqual(state.tests[0].details, [
    { wordId: 1, direction: 'zh2en', correct: true },
    { wordId: 2, direction: 'en2zh', correct: false }
  ]);
  assert.strictEqual(state.daily['50'].test, true);
  assert.strictEqual(JSON.stringify(state.progress), before);
});

test('保存失败时不写入检查记录', function () {
  loadAppScripts();
  createExamDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 50;

  examState = {
    questions: [{ wordId: 1, direction: 'zh2en' }],
    index: 1,
    results: [{ wordId: 1, direction: 'zh2en', correct: true }]
  };

  const beforeTests = JSON.stringify(state.tests);
  const beforeDaily = JSON.stringify(state.daily);

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  assert.deepStrictEqual(finishExam(), { ok: false, reason: 'saveFailed' });
  assert.strictEqual(JSON.stringify(state.tests), beforeTests);
  assert.strictEqual(JSON.stringify(state.daily), beforeDaily);
});

test('检查日未完成检查时不能完成今天', function () {
  loadAppScripts();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 50;
  state.progress.refilledDay = 50;
  state.daily['50'] = { listen: true, grammar: true };

  assert.deepStrictEqual(completeToday(), {
    ok: false,
    reason: 'checksRemaining',
    missing: ['test']
  });
});

test('点击开始检查并逐题作答后写入结果', function () {
  const ready = loadAppWithReadyCallbacks();
  const dom = createExamDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 50;
  state.progress.refilledDay = 50;
  state.words = {
    '1': learningRecord(),
    '2': learningRecord(),
    '3': learningRecord(),
    '4': learningRecord(),
    '5': learningRecord()
  };
  ready.forEach(function (fn) {
    fn();
  });

  dom['start-exam-btn'].clickHandlers[0]();
  assert.ok(examState !== null);

  let guard = 0;
  while (examState !== null && guard < 40) {
    guard += 1;
    const question = examState.questions[examState.index];
    const word = WORDS[question.wordId - 1];

    if (question.direction === 'zh2en') {
      dom['exam-input'].value = question.wordId % 2 === 0 ? word.word : 'wrong';
      dom['exam-submit-btn'].clickHandlers[0]();
    } else {
      dom['exam-reveal-btn'].clickHandlers[0]();
      dom['exam-know-btn'].clickHandlers[0]();
    }
  }

  assert.strictEqual(state.tests.length, 1);

  const record = state.tests[0];
  assert.strictEqual(
    dom['exam-result'].textContent,
    '检查完成：答对 ' + record.correct + ' / ' + record.total + '。今天的“检查”任务已自动勾选。'
  );
});

test('非检查日显示下一次检查日', function () {
  loadAppScripts();
  const dom = createExamDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 49;

  renderTestView();

  assert.strictEqual(dom['test-status'].textContent, '下一次检查：第 50 天（当前第 49 天）。');
});

test('锁定时不能开始检查', function () {
  const ready = loadAppWithReadyCallbacks();
  const dom = createExamDom();
  ready.forEach(function (fn) {
    fn();
  });

  vocabLocked = true;
  dom['start-exam-btn'].clickHandlers[0]();

  assert.strictEqual(examState, null);
  assert.strictEqual(dom['test-status'].textContent, LOCK_MESSAGE);
});
