const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { REPO_ROOT, installBrowserStubs } = require('./helpers.js');

const CATEGORIES = ['名词', '动词', '形容词', '副词'];

function loadRealData() {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'data.js' });
  return sandbox.window;
}

test('词表条数等于最后阶段的 wordEnd', function () {
  const data = loadRealData();
  const lastStage = data.PLAN.stages[data.PLAN.stages.length - 1];

  assert.strictEqual(data.WORDS.length, lastStage.wordEnd);
});

test('id 连续且等于下标加一', function () {
  const data = loadRealData();

  data.WORDS.forEach(function (entry, index) {
    assert.strictEqual(entry.id, index + 1);
  });
});

test('四个分类的数量等于目标值', function () {
  const data = loadRealData();
  const counts = {};

  CATEGORIES.forEach(function (name) {
    counts[name] = 0;
  });

  data.WORDS.forEach(function (entry) {
    if (counts[entry.category] !== undefined) {
      counts[entry.category] += 1;
    }
  });

  CATEGORIES.forEach(function (name) {
    assert.strictEqual(counts[name], data.PLAN.categoryTargets[name], name + ' 数量不正确');
  });
});

test('每条字段完整且分类合法', function () {
  const data = loadRealData();

  data.WORDS.forEach(function (entry) {
    ['word', 'pos', 'category', 'meaning', 'phonetic'].forEach(function (field) {
      assert.strictEqual(typeof entry[field], 'string', 'id ' + entry.id + ' 的 ' + field + ' 不是字符串');
      assert.ok(entry[field].length > 0, 'id ' + entry.id + ' 的 ' + field + ' 为空');
    });

    assert.ok(CATEGORIES.indexOf(entry.category) !== -1, 'id ' + entry.id + ' 的分类不合法');
    assert.strictEqual(typeof entry.example, 'string', 'id ' + entry.id + ' 的 example 不是字符串');
  });
});

test('单词忽略大小写后没有重复', function () {
  const data = loadRealData();
  const seen = new Set();

  data.WORDS.forEach(function (entry) {
    const key = entry.word.toLowerCase();
    assert.strictEqual(seen.has(key), false, '重复单词：' + entry.word);
    seen.add(key);
  });
});

test('应用加载正式词表并生成指纹', function () {
  installBrowserStubs();

  const dataSource = fs.readFileSync(path.join(REPO_ROOT, 'data.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(REPO_ROOT, 'app.js'), 'utf8');

  vm.runInThisContext(dataSource, { filename: 'data.js' });
  vm.runInThisContext(appSource, { filename: 'app.js' });

  assert.deepStrictEqual(
    WORDS.slice(0, 10).map(function (entry) {
      return entry.word;
    }),
    ['be', 'have', 'do', 'say', 'go', 'get', 'make', 'know', 'time', 'year']
  );
  assert.strictEqual(WORDS[WORDS.length - 1].word, 'ubiquitously');
  assert.strictEqual(vocabularyFingerprint().indexOf('3000-'), 0);
});
