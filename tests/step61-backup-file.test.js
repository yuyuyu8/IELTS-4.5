const test = require('node:test');
const assert = require('node:assert');

const { loadAppScripts } = require('./helpers.js');

const realBlob = globalThis.Blob;
const realUrl = globalThis.URL;

test.afterEach(function () {
  globalThis.Blob = realBlob;
  globalThis.URL = realUrl;
});

function makeNode(tag) {
  return {
    tagName: typeof tag === 'string' ? tag.toUpperCase() : 'DIV',
    href: '',
    download: '',
    textContent: '',
    className: '',
    hidden: false,
    value: '',
    children: [],
    clickCalls: 0,
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function () {},
    focus: function () {},
    setSelectionRange: function () {},
    click: function () {
      this.clickCalls += 1;
    }
  };
}

function installFakeDocument() {
  const cache = {};
  const anchors = [];

  document.getElementById = function (id) {
    if (cache[id] === undefined) {
      cache[id] = makeNode('div');
    }
    return cache[id];
  };
  document.createElement = function (tag) {
    const node = makeNode(tag);

    if (tag === 'a') {
      anchors.push(node);
    }

    return node;
  };

  return { cache: cache, anchors: anchors };
}

function stubBlob(captured) {
  globalThis.Blob = function (parts, options) {
    captured.push({ parts: parts, options: options });
  };
}

function stubUrl() {
  const calls = { created: [], revoked: [] };

  globalThis.URL = {
    createObjectURL: function (blob) {
      calls.created.push(blob);
      return 'blob:english3000';
    },
    revokeObjectURL: function (url) {
      calls.revoked.push(url);
    }
  };

  return calls;
}

test('备份文件名包含当天日期', function () {
  loadAppScripts();

  assert.strictEqual(backupFileName(), 'english3000-backup-' + todayString() + '.json');
});

test('下载时用备份文本创建 JSON Blob', function () {
  loadAppScripts();
  installFakeDocument();
  const blobs = [];
  stubBlob(blobs);
  stubUrl();
  const expected = exportBackupText();

  assert.strictEqual(downloadBackupFile(), true);
  assert.strictEqual(blobs.length, 1);
  assert.strictEqual(blobs[0].parts[0], expected);
  assert.strictEqual(blobs[0].options.type, 'application/json');
});

test('创建并点击下载锚点后释放地址', function () {
  loadAppScripts();
  const dom = installFakeDocument();
  const blobs = [];
  stubBlob(blobs);
  const calls = stubUrl();

  assert.strictEqual(downloadBackupFile(), true);
  assert.strictEqual(calls.created.length, 1);
  assert.strictEqual(calls.revoked.length, 1);
  assert.strictEqual(calls.revoked[0], 'blob:english3000');
  assert.strictEqual(dom.anchors.length, 1);
  assert.strictEqual(dom.anchors[0].href, 'blob:english3000');
  assert.strictEqual(dom.anchors[0].download, backupFileName());
  assert.strictEqual(dom.anchors[0].clickCalls, 1);
});

test('成功后记录备份日期并提示', function () {
  loadAppScripts();
  const dom = installFakeDocument();
  stubBlob([]);
  stubUrl();

  handleDownloadBackup();

  assert.strictEqual(state.settings.lastBackupDate, todayString());
  assert.strictEqual(
    dom.cache['backup-msg'].textContent,
    '已生成备份文件。若浏览器没有弹出保存，请用下面的文本框复制。'
  );
});

test('不支持 Blob 时给出复制提示', function () {
  loadAppScripts();
  const dom = installFakeDocument();
  stubUrl();
  globalThis.Blob = undefined;

  assert.strictEqual(downloadBackupFile(), false);

  handleDownloadBackup();

  assert.strictEqual(
    dom.cache['backup-msg'].textContent,
    '当前浏览器不支持直接下载，请用下面的文本框复制，或点“导出备份”。'
  );
});

test('锚点点击异常时返回 false 且不抛出', function () {
  loadAppScripts();
  installFakeDocument();
  stubBlob([]);
  stubUrl();
  document.createElement = function (tag) {
    const node = makeNode(tag);
    node.click = function () {
      throw new Error('blocked');
    };
    return node;
  };

  assert.doesNotThrow(function () {
    assert.strictEqual(downloadBackupFile(), false);
  });
});
