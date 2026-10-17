const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_ROOT = path.join(__dirname, '..');

function createLocalStorageStub() {
  const store = new Map();
  return {
    getItem: function (key) {
      const value = store.get(String(key));
      return value === undefined ? null : value;
    },
    setItem: function (key, value) {
      store.set(String(key), String(value));
    },
    removeItem: function (key) {
      store.delete(String(key));
    },
    clear: function () {
      store.clear();
    }
  };
}

function installBrowserStubs() {
  const window = globalThis;

  Object.defineProperty(globalThis, 'window', {
    value: window,
    configurable: true,
    writable: true
  });

  window.scrollTo = function () {};

  const document = {
    addEventListener: function () {},
    querySelectorAll: function () {
      return [];
    },
    getElementById: function () {
      return null;
    },
    createElement: function () {
      return { textContent: '' };
    }
  };

  const localStorage = createLocalStorageStub();

  Object.defineProperty(globalThis, 'document', {
    value: document,
    configurable: true,
    writable: true
  });

  Object.defineProperty(globalThis, 'localStorage', {
    value: localStorage,
    configurable: true,
    writable: true
  });

  return { window: window, document: document, localStorage: localStorage };
}

function loadAppScripts() {
  const stubs = installBrowserStubs();

  const dataSource = fs.readFileSync(path.join(REPO_ROOT, 'data.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(REPO_ROOT, 'app.js'), 'utf8');

  vm.runInThisContext(dataSource, { filename: 'data.js' });
  vm.runInThisContext(appSource, { filename: 'app.js' });

  return stubs;
}

function loadAppWithReadyCallbacks() {
  const stubs = installBrowserStubs();
  const readyCallbacks = [];

  stubs.document.addEventListener = function (type, fn) {
    if (type === 'DOMContentLoaded') {
      readyCallbacks.push(fn);
    }
  };

  const dataSource = fs.readFileSync(path.join(REPO_ROOT, 'data.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(REPO_ROOT, 'app.js'), 'utf8');

  vm.runInThisContext(dataSource, { filename: 'data.js' });
  vm.runInThisContext(appSource, { filename: 'app.js' });

  return readyCallbacks;
}

function createAudioStub() {
  const instances = [];

  function AudioStub(src) {
    this.src = src;
    this.pauseCalls = 0;
    this.playCalls = 0;
    instances.push(this);
  }

  AudioStub.prototype.pause = function () {
    this.pauseCalls += 1;
  };

  AudioStub.prototype.play = function () {
    this.playCalls += 1;
    return Promise.resolve();
  };

  return { AudioStub: AudioStub, instances: instances };
}

function createSpeechStub() {
  const spoken = [];
  const stub = {
    speaking: false,
    pending: false,
    cancelCalls: 0,
    cancel: function () {
      stub.cancelCalls += 1;
      stub.speaking = false;
      stub.pending = false;
    },
    speak: function (utterance) {
      spoken.push(utterance);
    }
  };
  return { stub: stub, spoken: spoken };
}

function UtteranceStub(text) {
  this.text = text;
  this.lang = '';
  this.rate = 1;
  this.onstart = null;
  this.onend = null;
  this.onerror = null;
}

function installSpeech() {
  const speech = createSpeechStub();
  globalThis.speechSynthesis = speech.stub;
  globalThis.SpeechSynthesisUtterance = UtteranceStub;
  return speech;
}

module.exports = {
  REPO_ROOT: REPO_ROOT,
  createLocalStorageStub: createLocalStorageStub,
  installBrowserStubs: installBrowserStubs,
  loadAppScripts: loadAppScripts,
  loadAppWithReadyCallbacks: loadAppWithReadyCallbacks,
  createAudioStub: createAudioStub,
  createSpeechStub: createSpeechStub,
  UtteranceStub: UtteranceStub,
  installSpeech: installSpeech
};
