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

function validQuestions() {
  return [
    {
      type: 'mcq',
      prompt: 'What is the main idea of the article?',
      options: ['A', 'B', 'C', 'D'],
      answer: 'A'
    },
    {
      type: 'mcq',
      prompt: 'What does the article say about cost?',
      options: ['Low', 'High', 'Unknown', 'Changing'],
      answer: 'Low'
    },
    {
      type: 'mcq',
      prompt: 'What does the word wind mean here?',
      options: ['Air movement', 'Water', 'Light', 'Heat'],
      answer: 'Air movement'
    },
    {
      type: 'fill',
      prompt: 'Wind power is the ____ of the energy in wind.',
      answer: 'conversion'
    },
    {
      type: 'fill',
      prompt: 'Wind farms can have ____ turbines.',
      answer: 'many'
    },
    {
      type: 'short',
      prompt: 'Why do some people object to wind farms?',
      answer: 'They say the farms are noisy or change the view.'
    }
  ];
}

function validQuizText() {
  return JSON.stringify({ questions: validQuestions() });
}

test('出题提示包含当天文章并区分阅读日', function () {
  setup(62);
  assert.strictEqual(buildReadingQuizPrompt(), '');

  state.progress.day = 61;
  state.progress.refilledDay = 61;

  const article = readingArticleFor(61);
  const prompt = buildReadingQuizPrompt();

  assert.ok(prompt.indexOf('# 阅读理解出题') !== -1);
  assert.ok(prompt.indexOf(article.title) !== -1);
  assert.ok(prompt.indexOf(article.text) !== -1);
  assert.ok(prompt.indexOf('只输出一个 JSON 对象') !== -1);
});

test('解析合法题目并统计类型', function () {
  setup(61);

  const result = parseReadingQuiz(validQuizText());

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.questions.length, 6);

  const counts = { mcq: 0, fill: 0, short: 0 };
  result.questions.forEach(function (item) {
    counts[item.type] += 1;
  });

  assert.strictEqual(counts.mcq, 3);
  assert.strictEqual(counts.fill, 2);
  assert.strictEqual(counts.short, 1);
});

test('解析代码块包裹的 JSON', function () {
  setup(61);

  const result = parseReadingQuiz('```json\n' + validQuizText() + '\n```');

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.questions.length, 6);
});

test('拒绝非数组、数量不对与类型计数不对', function () {
  setup(61);

  assert.strictEqual(parseReadingQuiz('{"questions":"x"}').reason, 'invalidShape');

  const five = validQuestions().slice(0, 5);
  assert.strictEqual(parseReadingQuiz(JSON.stringify({ questions: five })).reason, 'invalidCount');

  const changed = validQuestions();
  changed[0].type = 'fill';
  assert.strictEqual(parseReadingQuiz(JSON.stringify({ questions: changed })).reason, 'invalidCount');
});

test('拒绝不合规的选项、答案与填空', function () {
  setup(61);

  const threeOptions = validQuestions();
  threeOptions[0].options = ['A', 'B', 'C'];
  assert.strictEqual(
    parseReadingQuiz(JSON.stringify({ questions: threeOptions })).reason,
    'invalidMcq'
  );

  const missingAnswer = validQuestions();
  missingAnswer[0].answer = 'Z';
  assert.strictEqual(
    parseReadingQuiz(JSON.stringify({ questions: missingAnswer })).reason,
    'invalidMcq'
  );

  const noBlank = validQuestions();
  noBlank[3].prompt = 'Wind power is the conversion of energy.';
  assert.strictEqual(
    parseReadingQuiz(JSON.stringify({ questions: noBlank })).reason,
    'invalidFill'
  );

  const emptyShort = validQuestions();
  emptyShort[5].answer = '';
  assert.strictEqual(
    parseReadingQuiz(JSON.stringify({ questions: emptyShort })).reason,
    'invalidShort'
  );
});

test('没有密钥时不发请求', async function () {
  setup(61);
  saveAiKey('');
  let called = false;
  globalThis.fetch = function () {
    called = true;
    return Promise.resolve({ ok: true, text: () => Promise.resolve(validQuizText()) });
  };

  assert.deepStrictEqual(await generateReadingQuiz(), {
    ok: false,
    message: '请先在设置页填写 AI 接口。'
  });
  assert.strictEqual(called, false);
});

test('成功响应返回六道题', async function () {
  setup(61);
  globalThis.fetch = function () {
    return Promise.resolve({ ok: true, text: () => Promise.resolve(validQuizText()) });
  };

  const result = await generateReadingQuiz();

  assert.strictEqual(result.ok, true);
  assert.strictEqual(result.questions.length, 6);
});

test('无法解析的响应给出原因', async function () {
  setup(61);
  globalThis.fetch = function () {
    return Promise.resolve({ ok: true, text: () => Promise.resolve('not json') });
  };

  const result = await generateReadingQuiz();

  assert.strictEqual(result.ok, false);
  assert.strictEqual(result.message.indexOf('返回内容不符合要求（invalidJson）'), 0);
});
