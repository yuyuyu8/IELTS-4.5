const test = require('node:test');
const { afterEach } = require('node:test');
const assert = require('node:assert');

const {
  loadAppScripts,
  loadAppWithReadyCallbacks,
  installSpeech,
  createAudioStub
} = require('./helpers.js');

function createElementFake() {
  return {
    textContent: '',
    className: '',
    children: [],
    clickHandlers: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function (type, fn) {
      if (type === 'click') {
        this.clickHandlers.push(fn);
      }
    }
  };
}

function createContainerFake() {
  return {
    children: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    set textContent(value) {
      if (value === '') {
        this.children = [];
      }
    }
  };
}

function createFakeDom() {
  const todayInfo = createContainerFake();
  const todayWords = createContainerFake();

  document.getElementById = function (id) {
    if (id === 'today-info') {
      return todayInfo;
    }
    if (id === 'today-words') {
      return todayWords;
    }
    return null;
  };

  document.createElement = function () {
    return createElementFake();
  };

  return { todayInfo: todayInfo, todayWords: todayWords };
}

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function speakButtonOf(dom, index) {
  return dom.todayWords.children[index].children[1];
}

afterEach(function () {
  if (globalThis.speechFallbackTimer !== null) {
    clearTimeout(globalThis.speechFallbackTimer);
  }
  globalThis.speechFallbackTimer = null;
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
  delete globalThis.Audio;
});

test('每一行的发音按钮都只绑定一个 click 回调', function () {
  loadAppScripts();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  assert.strictEqual(dom.todayWords.children.length, 11);

  for (let i = 1; i <= 10; i++) {
    assert.strictEqual(
      speakButtonOf(dom, i).clickHandlers.length,
      1,
      '第 ' + i + ' 行的按钮 click 回调数量不正确'
    );
  }
});

test('每行按钮朗读自己那一行的单词', function () {
  loadAppScripts();
  const calls = [];
  window.speakWord = function (text) {
    calls.push(text);
  };
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  for (let i = 1; i <= 10; i++) {
    speakButtonOf(dom, i).clickHandlers[0]();
  }

  assert.deepStrictEqual(calls, [
    'apple', 'orange', 'book', 'run', 'eat', 'make', 'big', 'happy', 'quickly', 'luckily'
  ]);
});

test('只点最后一行时只朗读该行单词', function () {
  loadAppScripts();
  const calls = [];
  window.speakWord = function (text) {
    calls.push(text);
  };
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  speakButtonOf(dom, 10).clickHandlers[0]();

  assert.deepStrictEqual(calls, ['luckily']);
});

test('点击按钮时使用内置语音朗读', function () {
  loadAppScripts();
  const speech = installSpeech();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  speakButtonOf(dom, 1).clickHandlers[0]();

  assert.strictEqual(speech.spoken.length, 1);
  assert.strictEqual(speech.spoken[0].text, 'apple');
});

test('没有内置语音时点击按钮改用外部音频', function () {
  loadAppScripts();
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  renderTodayWords();

  speakButtonOf(dom, 1).clickHandlers[0]();

  assert.strictEqual(audio.instances[0].src, buildAudioUrl('apple'));
});

test('页面加载后按钮依然可用', function () {
  const readyCallbacks = loadAppWithReadyCallbacks();
  const dom = createFakeDom();
  state.settings.startDate = dateOffset(0);
  readyCallbacks.forEach(function (fn) {
    fn();
  });

  const calls = [];
  window.speakWord = function (text) {
    calls.push(text);
  };

  speakButtonOf(dom, 1).clickHandlers[0]();

  assert.deepStrictEqual(calls, ['apple']);
});
