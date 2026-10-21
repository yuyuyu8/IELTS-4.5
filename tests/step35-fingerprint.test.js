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

function writeRecord(fingerprint) {
  const settings = { startDate: dateOffset(0) };

  if (fingerprint !== undefined) {
    settings.vocabularyFingerprint = fingerprint;
  }

  localStorage.setItem('english3000.v1', JSON.stringify({
    version: 1,
    settings: settings,
    queue: [],
    nextWordId: 11,
    words: {},
    daily: {},
    tests: [],
    progress: { day: 1, completedDate: null, refilledDay: 0 }
  }));
}

test('改释义不影响指纹', function () {
  loadAppScripts();
  const before = vocabularyFingerprint();

  WORDS[0].meaning = '完全不同的释义内容';

  assert.strictEqual(vocabularyFingerprint(), before);
});

test('改单词会改变指纹', function () {
  loadAppScripts();
  const before = vocabularyFingerprint();

  WORDS[0].word = 'anotherword';

  assert.notStrictEqual(vocabularyFingerprint(), before);
});

test('改编号会改变指纹', function () {
  loadAppScripts();
  const before = vocabularyFingerprint();

  WORDS[0].id = 9999;

  assert.notStrictEqual(vocabularyFingerprint(), before);
});

test('词条数量变化会改变指纹', function () {
  loadAppScripts();
  const before = vocabularyFingerprint();

  globalThis.WORDS = WORDS.slice(0, 19);

  assert.notStrictEqual(vocabularyFingerprint(), before);
});

test('旧算法指纹会被视为一致并自动迁移', function () {
  loadAppScripts();
  writeRecord(legacyVocabularyFingerprint());

  state = loadState();
  vocabLocked = computeVocabLocked();
  assert.strictEqual(vocabLocked, false);

  saveState();
  const stored = JSON.parse(localStorage.getItem('english3000.v1'));
  assert.strictEqual(stored.settings.vocabularyFingerprint, vocabularyFingerprint());
});

test('指纹不符或缺失时仍然锁定', function () {
  loadAppScripts();

  writeRecord('abc');
  state = loadState();
  vocabLocked = computeVocabLocked();
  assert.strictEqual(vocabLocked, true);

  writeRecord(undefined);
  state = loadState();
  vocabLocked = computeVocabLocked();
  assert.strictEqual(vocabLocked, true);
});
