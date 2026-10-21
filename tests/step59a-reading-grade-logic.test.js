const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

const realFetch = globalThis.fetch;

test.afterEach(function () {
  globalThis.fetch = realFetch;
});

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function setup(day) {
  loadAppScripts();
  localStorage.removeItem('english3000.ai');
  saveAiKey('k');
  state.settings.ai = {
    provider: 'openai-chat',
    baseUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat'
  };
  state.settings.startDate = dateOffset(0);
  state.progress.day = day;
  state.progress.refilledDay = day;
}

function makeQuiz() {
  return {
    articleNo: readingArticleFor(61).no,
    questions: [
      { type: 'mcq', prompt: 'Q1?', options: ['A', 'B', 'C', 'D'], answer: 'A' },
      { type: 'mcq', prompt: 'Q2?', options: ['E', 'F', 'G', 'H'], answer: 'E' },
      { type: 'mcq', prompt: 'Q3?', options: ['I', 'J', 'K', 'L'], answer: 'I' },
      { type: 'fill', prompt: 'Wind power is the ____ of energy.', answer: 'conversion' },
      { type: 'fill', prompt: 'It has many ____.', answer: 'turbines' },
      { type: 'short', prompt: 'Why?', answer: 'Because it is clean.' }
    ],
    answers: ['x', 'x', 'x', 'x', 'x', 'x']
  };
}

function validGradeText() {
  return JSON.stringify({
    items: [
      { correct: true, feedback: '回答正确。' },
      { correct: false, feedback: '答错了，注意文中细节。' },
      { correct: true, feedback: '回答正确。' },
      { correct: false, feedback: '填空应使用原文词汇。' },
      { correct: true, feedback: '回答正确。' },
      { correct: false, feedback: '简答需要更完整的句子。' }
    ],
    comment: '整体理解不错，最需要改进的是回到原文核对细节。'
  });
}

test('非阅读日或没有题目时不出评分提示', function () {
  setup(62);
  assert.strictEqual(buildReadingGradePrompt(makeQuiz()), '');

  setup(61);
  assert.strictEqual(buildReadingGradePrompt(null), '');
});

test('评分提示包含文章、题目、作答与参考答案', function () {
  setup(61);

  const article = readingArticleFor(61);
  const prompt = buildReadingGradePrompt(makeQuiz());

  assert.ok(prompt.indexOf('# 阅读理解评分') !== -1);
  assert.ok(prompt.indexOf(article.text.slice(0, 40)) !== -1);
  assert.ok(prompt.indexOf('第 1 题') !== -1);
  assert.ok(prompt.indexOf('学习者作答：') !== -1);
  assert.ok(prompt.indexOf('## 参考答案') !== -1);
  assert.ok(prompt.indexOf('只输出一个 JSON 对象') !== -1);
});

test('未作答显示为未作答', function () {
  setup(61);

  const quiz = makeQuiz();
  quiz.answers[0] = '';

  assert.ok(buildReadingGradePrompt(quiz).indexOf('学习者作答：未作答') !== -1);
});

test('解析合法的评分结果', function () {
  loadAppScripts();

  const result = parseReadingGrade(validGradeText(), 6);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.items.length, 6);
  assert.strictEqual(result.comment, '整体理解不错，最需要改进的是回到原文核对细节。');
});

test('解析代码块包裹的评分结果', function () {
  loadAppScripts();

  const result = parseReadingGrade('```json\n' + validGradeText() + '\n```', 6);

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.items.length, 6);
});

test('拒绝不合规的 items 与 comment', function () {
  loadAppScripts();

  function textWith(items, comment) {
    return JSON.stringify({ items: items, comment: comment });
  }

  const base = JSON.parse(validGradeText()).items;

  assert.strictEqual(parseReadingGrade(textWith('x', 'ok'), 6).reason, 'invalidShape');
  assert.strictEqual(parseReadingGrade(textWith(base.slice(0, 5), 'ok'), 6).reason, 'invalidCount');

  const badCorrect = JSON.parse(validGradeText());
  badCorrect.items[0].correct = 'yes';
  assert.strictEqual(parseReadingGrade(JSON.stringify(badCorrect), 6).reason, 'invalidItem');

  const noFeedback = JSON.parse(validGradeText());
  delete noFeedback.items[0].feedback;
  assert.strictEqual(parseReadingGrade(JSON.stringify(noFeedback), 6).reason, 'invalidItem');

  const badComment = JSON.parse(validGradeText());
  badComment.comment = 5;
  assert.strictEqual(parseReadingGrade(JSON.stringify(badComment), 6).reason, 'invalidComment');
});

test('没有密钥时不发请求', async function () {
  setup(61);
  saveAiKey('');
  let called = false;
  globalThis.fetch = function () {
    called = true;
    return Promise.resolve({ ok: true, text: () => Promise.resolve(validGradeText()) });
  };

  assert.deepStrictEqual(await gradeReadingQuiz(makeQuiz()), {
    ok: false,
    message: '请先在设置页填写 AI 接口。'
  });
  assert.strictEqual(called, false);
});

test('成功响应与无法解析的响应', async function () {
  setup(61);
  globalThis.fetch = function () {
    return Promise.resolve({ ok: true, text: () => Promise.resolve(validGradeText()) });
  };

  const success = await gradeReadingQuiz(makeQuiz());

  assert.strictEqual(success.ok, true);
  assert.strictEqual(success.items.length, 6);

  globalThis.fetch = function () {
    return Promise.resolve({ ok: true, text: () => Promise.resolve('not json') });
  };

  const failure = await gradeReadingQuiz(makeQuiz());

  assert.strictEqual(failure.ok, false);
  assert.strictEqual(failure.message.indexOf('返回内容不符合要求（invalidJson）'), 0);
});
