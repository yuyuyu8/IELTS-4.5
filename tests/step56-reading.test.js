const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');

const { REPO_ROOT, loadAppScripts } = require('./helpers.js');

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
    hidden: false,
    className: '',
    textContent: '',
    href: '',
    target: '',
    rel: '',
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

function installFakeDocument() {
  const container = createContainerFake();

  document.getElementById = function (id) {
    if (id === 'reading-box') {
      return container;
    }
    return null;
  };
  document.createElement = function () {
    return makeNode();
  };

  return container;
}

function setupDay(day) {
  loadAppScripts();
  const container = installFakeDocument();
  state.settings.startDate = dateOffset(0);
  state.progress.day = day;
  state.progress.refilledDay = day;
  return container;
}

function tierArticles(tier) {
  return READINGS.filter(function (article) {
    return article.tier === tier;
  });
}

test('文章数据完整且无重复', function () {
  loadAppScripts();

  assert.ok(READINGS.length >= 35);
  assert.strictEqual(READINGS.some(function (article) {
    return article.title === 'Mind';
  }), false);

  const urls = {};

  READINGS.forEach(function (article, index) {
    assert.strictEqual(article.no, index + 1);
    assert.strictEqual(article.url.indexOf('https://'), 0);
    assert.ok(article.text.length >= 800 && article.text.length <= 8000);
    assert.strictEqual(urls[article.url], undefined, '重复的地址：' + article.url);
    urls[article.url] = true;
  });
});

test('三档长度与条数符合要求', function () {
  loadAppScripts();

  const counts = [0, 0, 0];

  READINGS.forEach(function (article) {
    counts[article.tier - 1] += 1;

    if (article.tier === 1) {
      assert.ok(article.text.length >= 800 && article.text.length <= 2499);
    } else if (article.tier === 2) {
      assert.ok(article.text.length >= 2500 && article.text.length <= 4799);
    } else {
      assert.ok(article.text.length >= 4800 && article.text.length <= 8000);
    }
  });

  counts.forEach(function (count) {
    assert.ok(count >= 10, '每档至少 10 条，实际：' + counts.join('/'));
  });
});

test('readingTierFor 按学习日分三档', function () {
  loadAppScripts();

  assert.strictEqual(readingTierFor(61), 1);
  assert.strictEqual(readingTierFor(120), 1);
  assert.strictEqual(readingTierFor(121), 2);
  assert.strictEqual(readingTierFor(240), 2);
  assert.strictEqual(readingTierFor(241), 3);
  assert.strictEqual(readingTierFor(500), 3);
});

test('readingArticleFor 按阅读日取对应文章', function () {
  setupDay(61);

  const first = tierArticles(1)[0];
  const second = tierArticles(1)[1];

  assert.strictEqual(readingArticleFor(61), first);
  assert.strictEqual(readingArticleFor(64), second);
  assert.strictEqual(readingArticleFor(62), null);
  assert.strictEqual(readingArticleFor(0), null);
  assert.strictEqual(readingArticleFor(501), null);
});

test('同一档的文章循环使用', function () {
  setupDay(61);

  const first = tierArticles(1)[0];
  const cycleDay = 61 + 3 * tierArticles(1).length;

  assert.strictEqual(readingArticleFor(cycleDay), first);
});

test('第 61 天渲染标题、字数、正文与外链', function () {
  const container = setupDay(61);
  const article = readingArticleFor(61);

  renderReading();

  assert.strictEqual(container.children[0].textContent, '今日阅读：' + article.title);
  assert.strictEqual(container.children[1].textContent, '约 ' + countWords(article.text) + ' 词。');

  const segments = article.text.split(/\n{2,}/);

  assert.strictEqual(container.children.length, 2 + segments.length + 2);

  for (let i = 0; i < segments.length; i += 1) {
    assert.strictEqual(container.children[2 + i].textContent, segments[i]);
  }

  const note = container.children[2 + segments.length];

  assert.strictEqual(note.textContent, '也可以到这些站点找分级材料读：');

  const linkList = container.children[container.children.length - 1];

  assert.strictEqual(linkList.className, 'link-list');
  assert.strictEqual(linkList.children.length, LISTENING_LINKS.length);

  const firstLink = linkList.children[0].children[0];

  assert.strictEqual(firstLink.href, LISTENING_LINKS[0].url);
  assert.strictEqual(firstLink.target, '_blank');
  assert.strictEqual(firstLink.rel, 'noopener noreferrer');
  assert.strictEqual(firstLink.textContent, LISTENING_LINKS[0].name);
});

test('非阅读日或当天已完成时容器为空', function () {
  const container = setupDay(62);

  renderReading();
  assert.strictEqual(container.children.length, 0);

  state.progress.day = 61;
  state.progress.completedDate = todayString();
  renderReading();
  assert.strictEqual(container.children.length, 0);
});

test('index.html 的阅读分组位于听力和写作之间', function () {
  const html = fs.readFileSync(path.join(REPO_ROOT, 'index.html'), 'utf8');
  const start = html.indexOf('id="view-today"');
  const end = html.indexOf('</section>', start);
  const section = html.slice(start, end);

  const listeningIndex = section.indexOf('id="group-listening"');
  const readingIndex = section.indexOf('id="group-reading"');
  const writingIndex = section.indexOf('id="group-writing"');

  assert.ok(readingIndex !== -1);
  assert.ok(listeningIndex < readingIndex);
  assert.ok(readingIndex < writingIndex);
});
