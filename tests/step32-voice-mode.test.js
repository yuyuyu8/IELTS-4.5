const test = require('node:test');
const { afterEach } = require('node:test');
const assert = require('node:assert');

const {
  loadAppScripts,
  loadAppWithReadyCallbacks,
  createAudioStub,
  installSpeech
} = require('./helpers.js');

afterEach(function () {
  if (typeof clearFallbackTimer === 'function') {
    clearFallbackTimer();
  }
  delete globalThis.Audio;
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
});

function makeNode() {
  const node = {
    className: '',
    value: '',
    hidden: false,
    checked: false,
    controls: false,
    preload: '',
    src: '',
    children: [],
    clickHandlers: [],
    changeHandlers: [],
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

test('未设置 voiceMode 时按人声处理', function () {
  loadAppScripts();
  assert.strictEqual(currentVoiceMode(), 'audio');

  state.settings.voiceMode = 'builtin';
  assert.strictEqual(currentVoiceMode(), 'builtin');

  state.settings.voiceMode = 'piano';
  assert.strictEqual(currentVoiceMode(), 'audio');
});

test('人声模式下直接使用外部音频', function () {
  loadAppScripts();
  state.settings.voiceMode = 'audio';
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;
  const speech = installSpeech();

  assert.strictEqual(speakWord('apple'), 'audio');
  assert.strictEqual(audio.instances.length, 1);
  assert.strictEqual(audio.instances[0].src, buildAudioUrl('apple'));
  assert.strictEqual(speech.spoken.length, 0);
});

test('内置模式下优先使用内置语音', function () {
  loadAppScripts();
  state.settings.voiceMode = 'builtin';
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;
  const speech = installSpeech();

  assert.strictEqual(speakWord('apple'), 'builtin');
  assert.strictEqual(speech.spoken.length, 1);
  assert.strictEqual(audio.instances.length, 0);
});

test('人声模式下没有 Audio 时退回内置语音', function () {
  loadAppScripts();
  state.settings.voiceMode = 'audio';
  delete globalThis.Audio;
  const speech = installSpeech();

  assert.strictEqual(speakWord('apple'), 'builtin');
  assert.strictEqual(speech.spoken.length, 1);
});

test('toggleVoiceMode 在两种模式间切换并保存', function () {
  loadAppScripts();

  assert.strictEqual(toggleVoiceMode(), true);
  assert.strictEqual(currentVoiceMode(), 'builtin');
  assert.strictEqual(
    JSON.parse(localStorage.getItem('english3000.v1')).settings.voiceMode,
    'builtin'
  );

  assert.strictEqual(toggleVoiceMode(), true);
  assert.strictEqual(currentVoiceMode(), 'audio');
  assert.strictEqual(
    JSON.parse(localStorage.getItem('english3000.v1')).settings.voiceMode,
    'audio'
  );
});

test('切到内置模式时重置内置语音状态', function () {
  loadAppScripts();
  speechState = 'unavailable';

  assert.strictEqual(toggleVoiceMode(), true);
  assert.strictEqual(currentVoiceMode(), 'builtin');
  assert.strictEqual(speechState, 'unknown');
});

test('保存失败时切换不生效', function () {
  loadAppScripts();

  localStorage.setItem = function () {
    throw new Error('写入失败');
  };

  assert.strictEqual(toggleVoiceMode(), false);
  assert.strictEqual(currentVoiceMode(), 'audio');
  assert.strictEqual(state.settings.voiceMode, undefined);
});

test('点击按钮在人声与内置之间切换', function () {
  const ready = loadAppWithReadyCallbacks();
  installFakeDocument();
  ready.forEach(function (fn) {
    fn();
  });

  const status = document.getElementById('voice-mode-status');
  const button = document.getElementById('voice-mode-btn');
  const message = document.getElementById('voice-mode-msg');

  assert.strictEqual(status.textContent, '当前发音方式：真人录音，需要联网。');

  button.clickHandlers[0]();
  assert.strictEqual(status.textContent, '当前发音方式：内置语音（机器音），不需要联网。');
  assert.strictEqual(message.textContent, '已切换发音方式。');

  button.clickHandlers[0]();
  assert.strictEqual(status.textContent, '当前发音方式：真人录音，需要联网。');
});
