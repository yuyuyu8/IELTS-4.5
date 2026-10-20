const test = require('node:test');
const { afterEach } = require('node:test');
const assert = require('node:assert');

const {
  loadAppScripts,
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

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function makeNode() {
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

function installPhonicsDom() {
  const container = createContainerFake();

  document.getElementById = function (id) {
    if (id === 'phonics-list') {
      return container;
    }
    return null;
  };
  document.createElement = function () {
    return makeNode();
  };

  return container;
}

function findBlock(container, symbol) {
  for (let i = 1; i < container.children.length; i++) {
    const item = container.children[i];
    if (item.children[0] && item.children[0].textContent === symbol) {
      return item;
    }
  }
  return null;
}

test('第 1 天渲染标题、符号、听按钮与例词按钮', function () {
  loadAppScripts();
  const container = installPhonicsDom();
  state.settings.startDate = dateOffset(0);

  renderPhonics();

  assert.strictEqual(container.children.length, 8);

  const item = container.children[1];
  assert.strictEqual(item.className, 'phonics-item');
  assert.strictEqual(item.children[0].textContent, '/ɪ/');
  assert.strictEqual(item.children[1].className, 'phonics-play');
  assert.strictEqual(item.children[1].textContent, '听');
  assert.strictEqual(item.children[2].className, 'phonics-actions');
  assert.strictEqual(item.children[2].children.length, 3);
});

test('有录音的音素块没有代替说明', function () {
  loadAppScripts();
  const container = installPhonicsDom();
  state.settings.startDate = dateOffset(0);

  renderPhonics();

  const item = container.children[1];
  assert.strictEqual(item.children.length, 3);
  assert.strictEqual(
    item.children.some(function (child) {
      return child.className === 'phonics-note';
    }),
    false
  );
});

test('无录音的音素块带代替说明', function () {
  loadAppScripts();
  const container = installPhonicsDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;

  renderPhonics();

  const item = findBlock(container, '/eɪ/');
  assert.ok(item !== null, '第 2 天应包含 /eɪ/');
  assert.strictEqual(item.children.length, 4);
  assert.strictEqual(item.children[3].className, 'phonics-note');
  assert.strictEqual(item.children[3].textContent, '（用第一个例词代替）');
});

test('有录音时听按钮播放音素文件', function () {
  loadAppScripts();
  const container = installPhonicsDom();
  state.settings.startDate = dateOffset(0);
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;

  renderPhonics();

  container.children[1].children[1].clickHandlers[0]();

  assert.ok(audio.instances.length > 0, '应创建音频实例');
  assert.strictEqual(audio.instances[0].src, PHONICS[0].audio);
});

test('无录音时听按钮改读第一个例词', function () {
  loadAppScripts();
  const container = installPhonicsDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 2;

  const calls = [];
  window.speakWord = function (text) {
    calls.push(text);
  };

  renderPhonics();

  const item = findBlock(container, '/eɪ/');
  const target = PHONICS.filter(function (entry) {
    return entry.symbol === '/eɪ/';
  })[0];

  item.children[1].clickHandlers[0]();

  assert.deepStrictEqual(calls, [target.examples[0]]);
});

test('例词按钮各自朗读自己的词', function () {
  loadAppScripts();
  const container = installPhonicsDom();
  state.settings.startDate = dateOffset(0);

  const calls = [];
  window.speakWord = function (text) {
    calls.push(text);
  };

  renderPhonics();

  const actions = container.children[1].children[2];
  actions.children[0].clickHandlers[0]();
  actions.children[2].clickHandlers[0]();

  assert.deepStrictEqual(calls, [PHONICS[0].examples[0], PHONICS[0].examples[2]]);
});

test('人声模式下先停掉内置语音', function () {
  loadAppScripts();
  state.settings.voiceMode = 'audio';
  const speech = installSpeech();
  speech.stub.speaking = true;
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;

  speakWord('apple');

  assert.strictEqual(speech.stub.cancelCalls, 1);
});
