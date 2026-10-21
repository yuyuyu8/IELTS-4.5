const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const { REPO_ROOT, loadAppScripts } = require('./helpers.js');

function pad(value) {
  return value < 10 ? '0' + value : String(value);
}

function dateOffset(days) {
  const base = new Date();
  const date = new Date(base.getFullYear(), base.getMonth(), base.getDate() + days);
  return date.getFullYear() + '-' + pad(date.getMonth() + 1) + '-' + pad(date.getDate());
}

function loadRealData() {
  const source = fs.readFileSync(path.join(REPO_ROOT, 'data.js'), 'utf8');
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, { filename: 'data.js' });
  return sandbox.window;
}

function makeNode() {
  return {
    textContent: '',
    className: '',
    controls: false,
    preload: '',
    src: '',
    children: [],
    appendChild: function (child) {
      this.children.push(child);
    },
    addEventListener: function () {}
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

function installDom() {
  const listening = createContainerFake();
  const today = createContainerFake();

  document.getElementById = function (id) {
    if (id === 'listening-box') {
      return listening;
    }
    if (id === 'today-info') {
      return today;
    }
    return null;
  };
  document.createElement = function () {
    return makeNode();
  };

  return { listening: listening, today: today };
}

test('LESSONS 共 49 条且字段合法', function () {
  const data = loadRealData();

  assert.strictEqual(data.LESSONS.length, 49);

  data.LESSONS.forEach(function (lesson, index) {
    assert.strictEqual(lesson.no, index + 1, '第 ' + (index + 1) + ' 条的 no 不正确');
    assert.strictEqual(typeof lesson.title, 'string');
    assert.ok(lesson.title.length > 0, '第 ' + lesson.no + ' 条的 title 为空');
    assert.strictEqual(typeof lesson.audioFile, 'string');
    assert.ok(/^audio\/\d{3}\.mp3$/.test(lesson.audioFile), '第 ' + lesson.no + ' 条的 audioFile 格式不正确');

    [lesson.title, lesson.audioFile].forEach(function (value) {
      assert.strictEqual(value.indexOf('http://'), -1);
      assert.strictEqual(value.indexOf('https://'), -1);
    });
  });
});

test('PLAN.listeningPerDay 为 1', function () {
  const data = loadRealData();

  assert.strictEqual(data.PLAN.listeningPerDay, 1);
});

test('listeningLessonFor 按天循环取课', function () {
  loadAppScripts();

  assert.strictEqual(listeningLessonFor(1), LESSONS[0]);
  assert.strictEqual(listeningLessonFor(49), LESSONS[48]);
  assert.strictEqual(listeningLessonFor(50), LESSONS[0]);
  assert.strictEqual(listeningLessonFor(500), LESSONS[(500 - 1) % 49]);
  assert.strictEqual(listeningLessonFor(0), null);
  assert.strictEqual(listeningLessonFor(501), null);
});

test('第 1 天渲染标题与说明', function () {
  loadAppScripts();
  const dom = installDom();
  state.settings.startDate = dateOffset(0);

  renderListening();

  assert.strictEqual(dom.listening.children.length, 5);
  assert.strictEqual(dom.listening.children[0].textContent, '听力：' + LESSONS[0].title);
  assert.strictEqual(
    dom.listening.children[1].textContent,
    '第 1 课，共 49 课。建议听两到三遍，听不懂的地方对照“阅读”里的课文。'
  );
});

test('第 1 天的音频元素指向仓库内文件', function () {
  loadAppScripts();
  const dom = installDom();
  state.settings.startDate = dateOffset(0);

  renderListening();

  const audio = dom.listening.children[2];
  assert.strictEqual(audio.controls, true);
  assert.strictEqual(audio.preload, 'none');
  assert.strictEqual(audio.src, LESSONS[0].audioFile);
});

test('第 50 天循环回到第 1 课', function () {
  loadAppScripts();
  const dom = installDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 50;

  renderListening();

  assert.strictEqual(dom.listening.children[0].textContent, '听力：' + LESSONS[0].title);
  assert.strictEqual(
    dom.listening.children[1].textContent.indexOf('第 1 课，共 49 课。'),
    0
  );
});

test('未开始、已完成、当天完成与锁定时都不显示', function () {
  loadAppScripts();
  let dom = installDom();
  renderListening();
  assert.strictEqual(dom.listening.children.length, 0);

  loadAppScripts();
  dom = installDom();
  state.settings.startDate = dateOffset(0);
  state.progress.day = 501;
  renderListening();
  assert.strictEqual(dom.listening.children.length, 0);

  loadAppScripts();
  dom = installDom();
  state.settings.startDate = dateOffset(0);
  state.progress.completedDate = todayString();
  renderListening();
  assert.strictEqual(dom.listening.children.length, 0);

  loadAppScripts();
  dom = installDom();
  state.settings.startDate = dateOffset(0);
  vocabLocked = true;
  renderListening();
  assert.strictEqual(dom.listening.children.length, 0);
});

test('renderToday 会一并渲染听力区', function () {
  loadAppScripts();
  const dom = installDom();
  state.settings.startDate = dateOffset(0);

  renderToday();

  assert.strictEqual(dom.listening.children.length, 5);
});
