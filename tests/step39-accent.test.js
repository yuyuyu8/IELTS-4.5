const test = require('node:test');
const { afterEach } = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, loadAppWithReadyCallbacks, installSpeech } = require('./helpers.js');

afterEach(function () {
  if (typeof clearFallbackTimer === 'function') {
    clearFallbackTimer();
  }
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
  delete globalThis.Audio;
});

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

test('未设置或非法口音时按美式处理', function () {
  loadAppScripts();
  assert.strictEqual(currentAccent(), 'us');

  state.settings.accent = 'uk';
  assert.strictEqual(currentAccent(), 'uk');

  state.settings.accent = 'piano';
  assert.strictEqual(currentAccent(), 'us');
});

test('美式下外部音频使用 type=2', function () {
  loadAppScripts();
  state.settings.accent = 'us';

  assert.strictEqual(
    buildAudioUrl('apple'),
    'https://dict.youdao.com/dictvoice?audio=apple&type=2'
  );
});

test('英式下外部音频使用 type=1', function () {
  loadAppScripts();
  state.settings.accent = 'uk';

  assert.strictEqual(
    buildAudioUrl('make a decision'),
    'https://dict.youdao.com/dictvoice?audio=make%20a%20decision&type=1'
  );
});

test('内置语音语言随口音变化', function () {
  loadAppScripts();
  state.settings.voiceMode = 'builtin';
  state.settings.accent = 'us';
  let speech = installSpeech();

  speakWord('apple');
  assert.strictEqual(speech.spoken[0].lang, 'en-US');
  clearFallbackTimer();

  loadAppScripts();
  state.settings.voiceMode = 'builtin';
  state.settings.accent = 'uk';
  speech = installSpeech();

  speakWord('apple');
  assert.strictEqual(speech.spoken[0].lang, 'en-GB');
  clearFallbackTimer();
});

test('toggleAccent 在两种口音间切换并保存', function () {
  loadAppScripts();

  assert.strictEqual(toggleAccent(), true);
  assert.strictEqual(currentAccent(), 'uk');
  assert.strictEqual(
    JSON.parse(localStorage.getItem('english3000.v1')).settings.accent,
    'uk'
  );

  assert.strictEqual(toggleAccent(), true);
  assert.strictEqual(currentAccent(), 'us');
  assert.strictEqual(
    JSON.parse(localStorage.getItem('english3000.v1')).settings.accent,
    'us'
  );
});

test('保存失败时口音不改变', function () {
  loadAppScripts();

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  assert.strictEqual(toggleAccent(), false);
  assert.strictEqual(currentAccent(), 'us');
  assert.strictEqual(state.settings.accent, undefined);
});

test('点击按钮在美式与英式之间切换', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  ready.forEach(function (fn) {
    fn();
  });

  const status = document.getElementById('accent-status');
  const button = document.getElementById('accent-btn');
  const message = document.getElementById('accent-msg');

  assert.strictEqual(status.textContent, '当前口音：美式（有道美音，内置语音 en-US）。');

  button.clickHandlers[0]();
  assert.strictEqual(status.textContent, '当前口音：英式（有道英音，内置语音 en-GB）。');
  assert.strictEqual(message.textContent, '已切换口音。');

  button.clickHandlers[0]();
  assert.strictEqual(status.textContent, '当前口音：美式（有道美音，内置语音 en-US）。');
});

test('备份校验只接受合法口音', function () {
  loadAppScripts();

  ['us', 'uk', undefined].forEach(function (value) {
    const data = JSON.parse(exportBackupText());
    if (value === undefined) {
      delete data.settings.accent;
    } else {
      data.settings.accent = value;
    }
    assert.strictEqual(validateBackup(data).ok, true, '口音 ' + value + ' 应被接受');
  });

  const bad = JSON.parse(exportBackupText());
  bad.settings.accent = 'piano';
  assert.strictEqual(validateBackup(bad).reason, 'invalidSettings');
});
