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

module.exports = {
  REPO_ROOT: REPO_ROOT,
  createLocalStorageStub: createLocalStorageStub,
  installBrowserStubs: installBrowserStubs,
  loadAppScripts: loadAppScripts
};
