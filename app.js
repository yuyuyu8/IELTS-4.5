function showView(viewName) {
  var views = document.querySelectorAll('section.view');
  var i;
  for (i = 0; i < views.length; i++) {
    if (views[i].id === 'view-' + viewName) {
      views[i].classList.add('active');
    } else {
      views[i].classList.remove('active');
    }
  }

  var buttons = document.querySelectorAll('.nav-btn');
  for (i = 0; i < buttons.length; i++) {
    if (buttons[i].dataset.view === viewName) {
      buttons[i].classList.add('active');
    } else {
      buttons[i].classList.remove('active');
    }
  }

  window.scrollTo(0, 0);
}

document.addEventListener('DOMContentLoaded', function () {
  var buttons = document.querySelectorAll('.nav-btn');
  for (var i = 0; i < buttons.length; i++) {
    let btn = buttons[i];
    btn.addEventListener('click', function () {
      showView(btn.dataset.view);
      renderToday();
      renderTodayWords();
      renderReview();
    });
  }
  showView('today');

  var startDateInput = document.getElementById('start-date');
  if (startDateInput !== null) {
    startDateInput.value = state.settings.startDate === null ? '' : state.settings.startDate;
  }

  var saveButton = document.getElementById('save-start-date');
  if (saveButton !== null) {
    saveButton.addEventListener('click', saveStartDate);
  }

  var completeButton = document.getElementById('complete-today-btn');
  if (completeButton !== null) {
    completeButton.addEventListener('click', handleCompleteToday);
  }

  var exportButton = document.getElementById('export-backup-btn');
  if (exportButton !== null) {
    exportButton.addEventListener('click', handleExportBackup);
  }

  var importButton = document.getElementById('import-backup-btn');
  if (importButton !== null) {
    importButton.addEventListener('click', handleImportBackup);
  }

  var clearButton = document.getElementById('clear-data-btn');
  if (clearButton !== null) {
    clearButton.addEventListener('click', handleClearData);
  }

  var saveWritingButton = document.getElementById('save-writing-btn');
  if (saveWritingButton !== null) {
    saveWritingButton.addEventListener('click', handleSaveWriting);
  }

  renderBackupStatus();

  renderToday();
  renderTodayWords();
});

function todayString() {
  var now = new Date();
  var month = now.getMonth() + 1;
  var day = now.getDate();
  var monthText = month < 10 ? '0' + month : String(month);
  var dayText = day < 10 ? '0' + day : String(day);
  return now.getFullYear() + '-' + monthText + '-' + dayText;
}

function getDayNumber(startStr, todayStr) {
  if (!startStr) {
    return 0;
  }
  var startParts = startStr.split('-');
  var todayParts = todayStr.split('-');
  var start = new Date(Number(startParts[0]), Number(startParts[1]) - 1, Number(startParts[2]));
  var today = new Date(Number(todayParts[0]), Number(todayParts[1]) - 1, Number(todayParts[2]));
  return Math.round((today - start) / 86400000) + 1;
}

function getStageByDay(dayNum) {
  for (var i = 0; i < PLAN.stages.length; i++) {
    if (dayNum >= PLAN.stages[i].dayStart && dayNum <= PLAN.stages[i].dayEnd) {
      return PLAN.stages[i];
    }
  }
  return null;
}

function getStageByWordId(wordId) {
  for (var i = 0; i < PLAN.stages.length; i++) {
    if (wordId <= PLAN.stages[i].wordEnd) {
      return PLAN.stages[i];
    }
  }
  return null;
}

function getDayInfoByDay(dayNum) {
  var status;
  if (dayNum < 1) {
    status = 'notStarted';
  } else if (dayNum > PLAN.totalDays) {
    status = 'finished';
  } else {
    status = 'active';
  }

  if (status !== 'active') {
    return {
      status: status,
      dayNum: dayNum,
      stage: null,
      dailyNew: 0,
      phonicsWeek: false,
      readingToday: false,
      writingToday: false,
      grammarToday: false,
      checkpointToday: false
    };
  }

  var stage = getStageByDay(dayNum);

  return {
    status: status,
    dayNum: dayNum,
    stage: stage,
    dailyNew: stage.dailyNew,
    phonicsWeek: dayNum <= PLAN.phonicsWeekEndDay,
    readingToday: dayNum >= PLAN.readingStartDay && (dayNum - PLAN.readingStartDay) % PLAN.readingEvery === 0,
    writingToday: dayNum >= PLAN.writingStartDay && (dayNum - PLAN.writingStartDay) % PLAN.writingEvery === 0,
    grammarToday: dayNum >= PLAN.grammarStartDay && (dayNum - PLAN.grammarStartDay) % PLAN.grammarEvery === 0,
    checkpointToday: dayNum % PLAN.checkpointEvery === 0
  };
}

// 按开始日期与今天的日历差计算。步骤 14 之后应用不再使用，仅供测试。
function getDayInfo(startStr, todayStr) {
  if (!startStr) {
    return getDayInfoByDay(0);
  }
  return getDayInfoByDay(getDayNumber(startStr, todayStr));
}

var STORAGE_KEY = 'english3000.v1';
var storageOk = true;

function makeDefaultState() {
  return {
    version: 1,
    settings: { startDate: null },
    queue: [],
    nextWordId: 1,
    words: {},
    daily: {},
    tests: [],
    progress: { day: 1, completedDate: null, refilledDay: 0 }
  };
}

function loadState() {
  var raw;

  try {
    raw = localStorage.getItem(STORAGE_KEY);
  } catch (error) {
    storageOk = false;
    return makeDefaultState();
  }

  if (raw === null) {
    return makeDefaultState();
  }

  var parsed;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    return makeDefaultState();
  }

  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return makeDefaultState();
  }

  var defaults = makeDefaultState();
  var keys = ['version', 'settings', 'queue', 'nextWordId', 'words', 'daily', 'tests', 'progress'];
  var filled = {};

  for (var i = 0; i < keys.length; i++) {
    filled[keys[i]] = parsed[keys[i]] === undefined ? defaults[keys[i]] : parsed[keys[i]];
  }

  if (typeof filled.settings !== 'object' || filled.settings === null || Array.isArray(filled.settings)) {
    filled.settings = { startDate: null };
  }

  if (typeof filled.settings.startDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(filled.settings.startDate)) {
    filled.settings.startDate = null;
  }

  if (typeof filled.progress !== 'object' || filled.progress === null || Array.isArray(filled.progress)) {
    filled.progress = { day: 1, completedDate: null, refilledDay: 0 };
  }

  if (!Number.isInteger(filled.progress.day) || filled.progress.day < 1) {
    filled.progress.day = 1;
  }

  if (typeof filled.progress.completedDate !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(filled.progress.completedDate)) {
    filled.progress.completedDate = null;
  }

  if (!Number.isInteger(filled.progress.refilledDay) || filled.progress.refilledDay < 0) {
    filled.progress.refilledDay = 0;
  }

  return filled;
}

function saveState() {
  try {
    if (vocabLocked === false && state.nextWordId > 1) {
      state.settings.vocabularyFingerprint = vocabularyFingerprint();
    }

    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    storageOk = false;
    return false;
  }
}

var state = loadState();

var LOCK_MESSAGE = '学习记录与当前词表不一致，学习已暂停。请先到设置页导出备份，然后点击“清空全部数据”。';

function vocabularyFingerprint() {
  var hash = 5381;

  for (var i = 0; i < WORDS.length; i++) {
    var parts = [WORDS[i].id, WORDS[i].word, WORDS[i].meaning];

    for (var p = 0; p < parts.length; p++) {
      var text = String(parts[p]);
      for (var c = 0; c < text.length; c++) {
        hash = (((hash << 5) + hash) + text.charCodeAt(c)) >>> 0;
      }
    }
  }

  return WORDS.length + '-' + hash.toString(36);
}

function computeVocabLocked() {
  return state.nextWordId > 1 && state.settings.vocabularyFingerprint !== vocabularyFingerprint();
}

var vocabLocked = computeVocabLocked();

function renderToday() {
  var container = document.getElementById('today-info');
  container.textContent = '';

  var lines = [];

  if (!storageOk) {
    lines.push('本地存储不可用，学习记录无法保存。');
  }

  if (vocabLocked) {
    var lockParagraph = document.createElement('p');
    lockParagraph.textContent = LOCK_MESSAGE;
    container.appendChild(lockParagraph);

    for (var lockIndex = 0; lockIndex < lines.length; lockIndex++) {
      var lockLine = document.createElement('p');
      lockLine.textContent = lines[lockIndex];
      container.appendChild(lockLine);
    }

    renderDailyChecks();
    renderWritingBox();
    return;
  }

  if (state.settings.startDate === null) {
    lines.push('请先到设置页填写开始日期。');
  } else {
    var info = currentPlanInfo();

    if (info.status === 'notStarted') {
      lines.push('计划将于 ' + state.settings.startDate + ' 开始。');
    } else if (info.status === 'finished') {
      lines.push('全部学习计划已完成。');
    } else if (state.progress.completedDate === todayString()) {
      lines.push('今天已完成，明天进入第 ' + info.dayNum + ' 天。');
    } else {
      lines.push('今天是第 ' + info.dayNum + ' 天 / ' + PLAN.totalDays);
      lines.push('当前阶段：' + info.stage.name);

      if (info.dailyNew > 0) {
        lines.push('今日新词目标：' + info.dailyNew + ' 个');
      } else if (state.queue.length > 0) {
        lines.push('第五阶段不再引入新词，请先完成剩余的 ' + state.queue.length + ' 个旧词。');
      } else {
        lines.push('今日无新词，进入全面复习。');
      }

      if (info.phonicsWeek) {
        lines.push('本周为音标周。');
      }

      if (info.readingToday) {
        lines.push('今天需要完成一次短文阅读。');
      }

      if (info.writingToday) {
        lines.push('今天需要完成一篇小作文。');
      }

      var dueCount = getDueReviewWords().length;
      if (dueCount > 0) {
        lines.push('待复习：' + dueCount + ' 个。完成今天前必须全部作答，请到复习视图。');
      }

      var backupDays = daysSinceBackup();
      if (backupDays === null) {
        if (state.progress.completedDate !== null) {
          lines.push('还没有导出过备份，请到设置页导出。');
        }
      } else if (backupDays > 3) {
        lines.push('距离上次备份已 ' + backupDays + ' 天，请到设置页导出备份。');
      }
    }
  }

  for (var i = 0; i < lines.length; i++) {
    var paragraph = document.createElement('p');
    paragraph.textContent = lines[i];
    container.appendChild(paragraph);
  }

  renderDailyChecks();
  renderWritingBox();
}

function saveStartDate() {
  var input = document.getElementById('start-date');
  var message = document.getElementById('start-date-msg');
  var value = input.value;

  if (value === '') {
    message.textContent = '请选择日期。';
    return;
  }

  state.settings.startDate = value;

  if (saveState() === false) {
    message.textContent = '保存失败：本地存储不可用。';
    return;
  }

  renderToday();
  renderTodayWords();
  message.textContent = '已保存：' + value;
}

function ensureQueue() {
  if (vocabLocked) {
    return false;
  }

  // 完成当天后不补下一学习日的词，要等到下一个日历日
  if (state.progress.completedDate === todayString()) {
    return false;
  }

  var info = currentPlanInfo();

  if (info.status !== 'active') {
    return false;
  }

  // 每个学习日只补一次，与日历无关
  if (state.progress.refilledDay === state.progress.day) {
    return false;
  }

  var changed = false;

  while (state.queue.length < info.dailyNew && state.nextWordId <= WORDS.length) {
    state.queue.push(state.nextWordId);
    state.nextWordId = state.nextWordId + 1;
    changed = true;
  }

  state.progress.refilledDay = state.progress.day;
  saveState();

  return changed;
}

function getTodayNewWords() {
  var info = currentPlanInfo();

  if (info.status !== 'active') {
    return [];
  }

  // 第五阶段不再引入新词，但之前未学完的词仍要显示，直到学完
  var count = info.dailyNew > 0 ? Math.min(info.dailyNew, state.queue.length) : state.queue.length;
  var result = [];

  for (var i = 0; i < count; i++) {
    for (var j = 0; j < WORDS.length; j++) {
      if (WORDS[j].id === state.queue[i]) {
        result.push(WORDS[j]);
        break;
      }
    }
  }

  return result;
}

function renderTodayWords() {
  var container = document.getElementById('today-words');

  if (container === null) {
    return;
  }

  container.textContent = '';

  if (vocabLocked) {
    appendParagraph(container, LOCK_MESSAGE);
    return;
  }

  ensureQueue();

  var info = currentPlanInfo();

  if (info.status !== 'active') {
    return;
  }

  // 今天已完成：隐藏新词列表，改由今天视图的文字说明
  if (state.progress.completedDate === todayString()) {
    return;
  }

  var words = getTodayNewWords();

  if (words.length === 0) {
    var emptyParagraph = document.createElement('p');
    emptyParagraph.textContent = info.dailyNew > 0 ? '今日新词已全部标记为已学。' : '今日无新词。';
    container.appendChild(emptyParagraph);
    return;
  }

  var heading = document.createElement('p');
  heading.textContent = '今日新词（共 ' + words.length + ' 个）：';
  container.appendChild(heading);

  for (var k = 0; k < words.length; k++) {
    container.appendChild(createWordRow(words[k]));
  }
}

function createWordRow(word) {
  var row = document.createElement('div');
  row.className = 'word-row';

  var text = document.createElement('span');
  text.className = 'word-text';
  var label = word.id + '. ' + word.word + ' ';
  if (word.phonetic) {
    label += word.phonetic + ' ';
  }
  text.textContent = label + word.pos + ' ' + word.category + ' ' + word.meaning;
  row.appendChild(text);

  var button = document.createElement('button');
  button.className = 'speak-btn';
  button.textContent = '发音';
  button.addEventListener('click', makeSpeakHandler(word.word));
  row.appendChild(button);

  var learnButton = document.createElement('button');
  learnButton.className = 'learn-btn';
  learnButton.textContent = '已学';
  learnButton.addEventListener('click', makeLearnHandler(word.id));
  row.appendChild(learnButton);

  return row;
}

function makeSpeakHandler(text) {
  return function () {
    speakWord(text);
  };
}

function currentPlanInfo() {
  if (state.settings.startDate === null || getDayNumber(state.settings.startDate, todayString()) < 1) {
    return getDayInfoByDay(0);
  }
  return getDayInfoByDay(state.progress.day);
}

function completeToday() {
  if (vocabLocked) {
    return { ok: false, reason: 'vocabLocked' };
  }

  if (currentPlanInfo().status !== 'active') {
    return { ok: false, reason: 'notActive' };
  }

  var today = todayString();
  if (state.progress.completedDate === today) {
    return { ok: false, reason: 'alreadyCompletedToday' };
  }

  // 先补齐当天新词，否则会在未补齐时误判为已全部标记
  ensureQueue();

  if (state.queue.length > 0) {
    return { ok: false, reason: 'wordsRemaining', remaining: state.queue.length };
  }

  // 到期的复习词必须全部作答（认识、模糊、不认识均算作答）
  var dueReviews = getDueReviewWords();
  if (dueReviews.length > 0) {
    return { ok: false, reason: 'reviewsRemaining', remaining: dueReviews.length };
  }

  // 当天要求的每日任务必须全部勾选（自我申报，不做质量检查）
  var missingChecks = missingDailyChecks();
  if (missingChecks.length > 0) {
    return { ok: false, reason: 'checksRemaining', missing: missingChecks };
  }

  var previousDay = state.progress.day;
  var previousDate = state.progress.completedDate;
  state.progress.day = previousDay + 1;
  state.progress.completedDate = today;

  if (saveState() === false) {
    state.progress.day = previousDay;
    state.progress.completedDate = previousDate;
    return { ok: false, reason: 'saveFailed' };
  }

  return { ok: true, day: state.progress.day };
}

function markWordLearned(wordId) {
  if (vocabLocked) {
    return false;
  }

  // 完成当天后不能再标记已学
  if (state.progress.completedDate === todayString()) {
    return false;
  }

  var info = currentPlanInfo();

  if (info.status !== 'active') {
    return false;
  }

  var index = state.queue.indexOf(wordId);
  if (index === -1) {
    return false;
  }

  if (typeof state.words !== 'object' || state.words === null) {
    state.words = {};
  }

  var key = String(wordId);
  var hadRecord = Object.prototype.hasOwnProperty.call(state.words, key);
  var previousRecord = state.words[key];

  state.queue.splice(index, 1);
  state.words[key] = {
    status: 'learning',
    reviewStep: 0,
    nextReview: state.progress.day + PLAN.reviewIntervals[0],
    reviewCount: 0
  };

  if (saveState() === false) {
    state.queue.splice(index, 0, wordId);
    if (hadRecord) {
      state.words[key] = previousRecord;
    } else {
      delete state.words[key];
    }
    return false;
  }

  return true;
}

function makeLearnHandler(wordId) {
  return function () {
    if (markWordLearned(wordId)) {
      renderTodayWords();
    }
  };
}

function getDueReviewWords() {
  if (currentPlanInfo().status !== 'active') {
    return [];
  }

  if (state.progress.completedDate === todayString()) {
    return [];
  }

  if (typeof state.words !== 'object' || state.words === null) {
    return [];
  }

  var day = state.progress.day;
  var due = [];
  var keys = Object.keys(state.words);

  for (var i = 0; i < keys.length; i++) {
    var record = state.words[keys[i]];
    if (record && record.status === 'learning' && record.nextReview <= day) {
      due.push({ id: Number(keys[i]), nextReview: record.nextReview });
    }
  }

  due.sort(function (a, b) {
    return a.nextReview - b.nextReview || a.id - b.id;
  });

  return due.map(function (item) {
    return item.id;
  });
}

function answerReview(wordId, answer) {
  if (vocabLocked) {
    return false;
  }

  if (state.progress.completedDate === todayString()) {
    return false;
  }

  if (currentPlanInfo().status !== 'active') {
    return false;
  }

  if (answer !== 'known' && answer !== 'fuzzy' && answer !== 'forgot') {
    return false;
  }

  if (typeof state.words !== 'object' || state.words === null) {
    return false;
  }

  var key = String(wordId);
  var record = state.words[key];
  var day = state.progress.day;
  var intervals = PLAN.reviewIntervals;

  if (!record || record.status !== 'learning' || record.nextReview > day) {
    return false;
  }

  var next = {
    status: 'learning',
    reviewStep: record.reviewStep,
    nextReview: record.nextReview,
    reviewCount: record.reviewCount + 1
  };

  if (answer === 'known') {
    if (record.reviewStep >= intervals.length - 1) {
      next.status = 'mastered';
      next.nextReview = null;
    } else {
      next.reviewStep = record.reviewStep + 1;
      next.nextReview = day + intervals[next.reviewStep];
    }
  } else if (answer === 'fuzzy') {
    next.nextReview = day + 1;
  } else {
    next.reviewStep = 0;
    next.nextReview = day + 1;
  }

  state.words[key] = next;

  if (saveState() === false) {
    state.words[key] = record;
    return false;
  }

  return true;
}

function handleCompleteToday() {
  var message = document.getElementById('complete-today-msg');
  var result = completeToday();

  if (result.ok) {
    message.textContent = '已完成今天。';
  } else if (result.reason === 'vocabLocked') {
    message.textContent = LOCK_MESSAGE;
  } else if (result.reason === 'wordsRemaining') {
    message.textContent = '还有 ' + result.remaining + ' 个新词未标记为已学，请先全部标记。';
  } else if (result.reason === 'reviewsRemaining') {
    message.textContent = '还有 ' + result.remaining + ' 个到期复习未作答，请先到复习视图全部作答。';
  } else if (result.reason === 'checksRemaining') {
    message.textContent = '还有未勾选的今日任务：' + result.missing.map(function (name) {
      return DAILY_CHECK_LABELS[name];
    }).join('、') + '。请先勾选，再点“完成今天”。';
  } else if (result.reason === 'alreadyCompletedToday') {
    message.textContent = '今天已经完成过了。';
  } else if (result.reason === 'saveFailed') {
    message.textContent = '保存失败：本地存储不可用。';
  } else {
    message.textContent = '当前没有可以完成的学习日。';
  }

  renderToday();
  renderTodayWords();
}

function appendParagraph(container, text) {
  var paragraph = document.createElement('p');
  paragraph.textContent = text;
  container.appendChild(paragraph);
}

function findWordById(wordId) {
  for (var i = 0; i < WORDS.length; i++) {
    if (WORDS[i].id === wordId) {
      return WORDS[i];
    }
  }
  return null;
}

function renderReview() {
  var container = document.getElementById('review-list');

  if (container === null) {
    return;
  }

  container.textContent = '';

  if (vocabLocked) {
    appendParagraph(container, LOCK_MESSAGE);
    return;
  }

  var info = currentPlanInfo();

  if (state.settings.startDate === null || info.status === 'notStarted') {
    appendParagraph(container, '计划开始后，这里会显示到期的复习。');
    return;
  }

  if (info.status === 'finished') {
    appendParagraph(container, '全部学习计划已完成。');
    return;
  }

  if (state.progress.completedDate === todayString()) {
    appendParagraph(container, '今天已完成，复习已锁定。');
    return;
  }

  var due = getDueReviewWords();

  if (due.length === 0) {
    appendParagraph(container, '今天没有到期的复习。');
    return;
  }

  appendParagraph(container, '待复习（共 ' + due.length + ' 个）：');

  for (var i = 0; i < due.length; i++) {
    var word = findWordById(due[i]);
    if (word !== null) {
      container.appendChild(createReviewRow(word));
    }
  }
}

function createReviewRow(word) {
  var item = document.createElement('div');
  item.className = 'review-item';

  var text = document.createElement('span');
  text.className = 'word-text';
  var label = word.id + '. ' + word.word + ' ';
  if (word.phonetic) {
    label += word.phonetic + ' ';
  }
  text.textContent = label + word.pos + ' ' + word.category + ' ' + word.meaning;
  item.appendChild(text);

  var actions = document.createElement('div');
  actions.className = 'review-actions';

  var speakButton = document.createElement('button');
  speakButton.className = 'speak-btn';
  speakButton.textContent = '发音';
  speakButton.addEventListener('click', makeSpeakHandler(word.word));
  actions.appendChild(speakButton);

  var choices = [
    { answer: 'known', label: '认识', className: 'review-btn review-known' },
    { answer: 'fuzzy', label: '模糊', className: 'review-btn review-fuzzy' },
    { answer: 'forgot', label: '不认识', className: 'review-btn review-forgot' }
  ];

  for (var i = 0; i < choices.length; i++) {
    var button = document.createElement('button');
    button.className = choices[i].className;
    button.textContent = choices[i].label;
    button.addEventListener('click', makeReviewHandler(word.id, choices[i].answer));
    actions.appendChild(button);
  }

  item.appendChild(actions);
  return item;
}

function makeReviewHandler(wordId, answer) {
  return function () {
    answerReview(wordId, answer);
    renderReview();
    renderToday();
  };
}

var BACKUP_KEYS = ['version', 'settings', 'queue', 'nextWordId', 'words', 'daily', 'tests', 'progress'];

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDateText(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isIntegerIn(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max;
}

function isValidReviewRecord(record) {
  if (!isPlainObject(record)) {
    return false;
  }

  if (!isIntegerIn(record.reviewStep, 0, PLAN.reviewIntervals.length - 1)) {
    return false;
  }

  if (!Number.isInteger(record.reviewCount) || record.reviewCount < 0) {
    return false;
  }

  if (record.status === 'mastered') {
    return record.nextReview === null;
  }

  if (record.status === 'learning') {
    return Number.isInteger(record.nextReview) && record.nextReview >= 1;
  }

  return false;
}

function validateBackup(data) {
  if (!isPlainObject(data)) {
    return { ok: false, reason: 'invalidShape' };
  }

  for (var k = 0; k < BACKUP_KEYS.length; k++) {
    if (!(BACKUP_KEYS[k] in data)) {
      return { ok: false, reason: 'invalidShape' };
    }
  }

  if (data.version !== 1) {
    return { ok: false, reason: 'invalidVersion' };
  }

  if (!isPlainObject(data.settings) ||
      !(data.settings.startDate === null || isDateText(data.settings.startDate)) ||
      !(data.settings.lastBackupDate === undefined ||
        data.settings.lastBackupDate === null ||
        isDateText(data.settings.lastBackupDate)) ||
      !(data.settings.vocabularyFingerprint === undefined ||
        typeof data.settings.vocabularyFingerprint === 'string')) {
    return { ok: false, reason: 'invalidSettings' };
  }

  if (!isPlainObject(data.progress) ||
      !isIntegerIn(data.progress.day, 1, PLAN.totalDays + 1) ||
      !(data.progress.completedDate === null || isDateText(data.progress.completedDate)) ||
      !isIntegerIn(data.progress.refilledDay, 0, PLAN.totalDays + 1)) {
    return { ok: false, reason: 'invalidProgress' };
  }

  if (data.nextWordId > 1 && data.settings.vocabularyFingerprint !== vocabularyFingerprint()) {
    return { ok: false, reason: 'vocabMismatch' };
  }

  var maxWordId = WORDS.length;

  if (!isIntegerIn(data.nextWordId, 1, maxWordId + 1)) {
    return { ok: false, reason: 'invalidQueue' };
  }

  if (!Array.isArray(data.queue)) {
    return { ok: false, reason: 'invalidQueue' };
  }

  var inQueue = {};
  for (var q = 0; q < data.queue.length; q++) {
    var queuedId = data.queue[q];
    if (!isIntegerIn(queuedId, 1, maxWordId) ||
        queuedId >= data.nextWordId ||
        inQueue[queuedId] === true) {
      return { ok: false, reason: 'invalidQueue' };
    }
    inQueue[queuedId] = true;
  }

  if (!isPlainObject(data.words)) {
    return { ok: false, reason: 'invalidWords' };
  }

  var wordKeys = Object.keys(data.words);
  for (var w = 0; w < wordKeys.length; w++) {
    var key = wordKeys[w];
    var wordId = Number(key);
    if (String(wordId) !== key ||
        !isIntegerIn(wordId, 1, maxWordId) ||
        wordId >= data.nextWordId ||
        inQueue[wordId] === true ||
        !isValidReviewRecord(data.words[key])) {
      return { ok: false, reason: 'invalidWords' };
    }
  }

  if (!isPlainObject(data.daily) || !Array.isArray(data.tests)) {
    return { ok: false, reason: 'invalidShape' };
  }

  // 每日记录的键必须是学习日编号（1 至 totalDays），值必须符合 isValidDailyRecord
  var dailyKeys = Object.keys(data.daily);
  for (var d = 0; d < dailyKeys.length; d++) {
    var dayKey = dailyKeys[d];
    var dayNumber = Number(dayKey);
    if (String(dayNumber) !== dayKey ||
        !isIntegerIn(dayNumber, 1, PLAN.totalDays) ||
        !isValidDailyRecord(data.daily[dayKey])) {
      return { ok: false, reason: 'invalidDaily' };
    }
  }

  return { ok: true };
}

function exportBackupText() {
  var copy = JSON.parse(JSON.stringify(state));

  if (vocabLocked === false && state.nextWordId > 1) {
    copy.settings.vocabularyFingerprint = vocabularyFingerprint();
  }

  return JSON.stringify(copy);
}

function importBackupText(text) {
  var data;

  try {
    data = JSON.parse(text);
  } catch (error) {
    return { ok: false, reason: 'invalidJson' };
  }

  var check = validateBackup(data);
  if (check.ok === false) {
    return check;
  }

  var candidate = {};
  for (var i = 0; i < BACKUP_KEYS.length; i++) {
    candidate[BACKUP_KEYS[i]] = data[BACKUP_KEYS[i]];
  }

  var previous = state;
  state = candidate;

  if (saveState() === false) {
    state = previous;
    return { ok: false, reason: 'saveFailed' };
  }

  vocabLocked = computeVocabLocked();
  return { ok: true };
}

function daysSinceBackup() {
  var last = state.settings.lastBackupDate;

  if (isDateText(last) === false) {
    return null;
  }

  return getDayNumber(last, todayString()) - 1;
}

function renderBackupStatus() {
  var container = document.getElementById('backup-status');

  if (container === null) {
    return;
  }

  var days = daysSinceBackup();

  if (days === null) {
    container.textContent = '尚未导出过备份。正式记录前请先导出一次。';
  } else if (days > 3) {
    container.textContent = '上次备份：' + state.settings.lastBackupDate + '，已 ' + days + ' 天未备份，请尽快导出。';
  } else {
    container.textContent = '上次备份：' + state.settings.lastBackupDate + '。';
  }
}

function handleExportBackup() {
  var input = document.getElementById('backup-text');
  var message = document.getElementById('backup-msg');

  state.settings.lastBackupDate = todayString();
  var text = exportBackupText();

  input.value = text;
  input.focus();
  input.setSelectionRange(0, text.length);

  if (saveState() === false) {
    message.textContent = '备份已生成，但导出日期未能保存：本地存储不可用。';
  } else {
    message.textContent = '已生成备份。请长按下方文本框全选并复制，保存到备忘录。';
  }

  renderBackupStatus();
  renderToday();
}

function handleImportBackup() {
  var input = document.getElementById('backup-text');
  var message = document.getElementById('backup-msg');

  if (!window.confirm('导入会覆盖当前全部学习记录，确定继续吗？')) {
    message.textContent = '已取消导入，未做任何修改。';
    return;
  }

  var result = importBackupText(input.value);

  if (result.ok) {
    message.textContent = '已导入备份，学习记录已恢复。';
  } else if (result.reason === 'invalidJson') {
    message.textContent = '备份内容不是有效的文本，请确认已完整粘贴。';
  } else if (result.reason === 'vocabMismatch') {
    message.textContent = '备份与当前词表不一致，未导入。';
  } else if (result.reason === 'saveFailed') {
    message.textContent = '保存失败：本地存储不可用，未导入。';
  } else {
    message.textContent = '备份内容校验未通过，未做任何修改。';
  }

  var startInput = document.getElementById('start-date');
  if (startInput !== null) {
    startInput.value = state.settings.startDate === null ? '' : state.settings.startDate;
  }

  renderToday();
  renderTodayWords();
  renderReview();
  renderBackupStatus();
}

function clearAllData() {
  var previous = state;
  state = makeDefaultState();

  if (saveState() === false) {
    state = previous;
    return { ok: false, reason: 'saveFailed' };
  }

  vocabLocked = false;
  return { ok: true };
}

function refreshAllViews() {
  var startInput = document.getElementById('start-date');
  if (startInput !== null) {
    startInput.value = state.settings.startDate === null ? '' : state.settings.startDate;
  }

  renderToday();
  renderTodayWords();
  renderReview();
  renderBackupStatus();
}

function handleClearData() {
  var message = document.getElementById('clear-data-msg');

  if (!window.confirm('将清空全部学习记录（开始日期、进度、复习记录），且无法恢复。若还没有导出备份，请点“取消”，先导出。确定清空吗？')) {
    message.textContent = '已取消，未清空任何数据。';
    return;
  }

  var result = clearAllData();

  if (result.ok === false) {
    message.textContent = '清空失败：本地存储不可用，数据保持不变。';
    return;
  }

  var backupText = document.getElementById('backup-text');
  if (backupText !== null) {
    backupText.value = '';
  }

  refreshAllViews();
  message.textContent = '已清空全部数据。';
}

var DAILY_CHECK_NAMES = ['listen', 'phonics', 'reading', 'writing', 'grammar'];
var DAILY_CHECK_LABELS = {
  listen: '听力',
  phonics: '音标',
  reading: '阅读',
  writing: '写作',
  grammar: '语法'
};
var WRITING_TEXT_MAX_LENGTH = 4000;

function dailyRecordOf(day) {
  if (!isPlainObject(state.daily)) {
    return {};
  }

  var record = state.daily[String(day)];
  return isPlainObject(record) ? record : {};
}

function requiredDailyChecks(info) {
  var required = [];

  if (info.status !== 'active') {
    return required;
  }

  required.push('listen');

  if (info.phonicsWeek) {
    required.push('phonics');
  }

  if (info.readingToday) {
    required.push('reading');
  }

  if (info.writingToday) {
    required.push('writing');
  }

  if (info.grammarToday) {
    required.push('grammar');
  }

  return required;
}

function missingDailyChecks() {
  var required = requiredDailyChecks(currentPlanInfo());
  var record = dailyRecordOf(state.progress.day);
  var missing = [];

  for (var i = 0; i < required.length; i++) {
    if (record[required[i]] !== true) {
      missing.push(required[i]);
    }
  }

  return missing;
}

function copyDailyRecord(record) {
  var copy = {};
  var keys = Object.keys(record);

  for (var i = 0; i < keys.length; i++) {
    copy[keys[i]] = record[keys[i]];
  }

  return copy;
}

function writeDailyRecord(day, nextRecord) {
  if (!isPlainObject(state.daily)) {
    state.daily = {};
  }

  var key = String(day);
  var hadRecord = Object.prototype.hasOwnProperty.call(state.daily, key);
  var previousRecord = state.daily[key];

  state.daily[key] = nextRecord;

  if (saveState() === false) {
    if (hadRecord) {
      state.daily[key] = previousRecord;
    } else {
      delete state.daily[key];
    }
    return false;
  }

  return true;
}

function setDailyCheck(name, value) {
  if (vocabLocked) {
    return false;
  }

  if (DAILY_CHECK_NAMES.indexOf(name) === -1 || typeof value !== 'boolean') {
    return false;
  }

  if (currentPlanInfo().status !== 'active' || state.progress.completedDate === todayString()) {
    return false;
  }

  var nextRecord = copyDailyRecord(dailyRecordOf(state.progress.day));
  nextRecord[name] = value;

  return writeDailyRecord(state.progress.day, nextRecord);
}

function saveWritingText(text) {
  if (vocabLocked) {
    return false;
  }

  if (typeof text !== 'string' || text.length > WRITING_TEXT_MAX_LENGTH) {
    return false;
  }

  if (currentPlanInfo().status !== 'active' || state.progress.completedDate === todayString()) {
    return false;
  }

  var nextRecord = copyDailyRecord(dailyRecordOf(state.progress.day));
  nextRecord.writingText = text;

  return writeDailyRecord(state.progress.day, nextRecord);
}

function isValidDailyRecord(record) {
  if (!isPlainObject(record)) {
    return false;
  }

  var names = Object.keys(record);

  for (var i = 0; i < names.length; i++) {
    var name = names[i];
    var value = record[name];

    if (name === 'writingText') {
      if (typeof value !== 'string' || value.length > WRITING_TEXT_MAX_LENGTH) {
        return false;
      }
    } else if (DAILY_CHECK_NAMES.indexOf(name) !== -1) {
      if (typeof value !== 'boolean') {
        return false;
      }
    } else {
      return false;
    }
  }

  return true;
}

function renderDailyChecks() {
  var container = document.getElementById('daily-checks');

  if (container === null) {
    return;
  }

  container.textContent = '';

  if (vocabLocked) {
    return;
  }

  var info = currentPlanInfo();

  if (info.status !== 'active' || state.progress.completedDate === todayString()) {
    return;
  }

  var required = requiredDailyChecks(info);
  var record = dailyRecordOf(state.progress.day);

  var heading = document.createElement('p');
  heading.textContent = '今日任务（勾选即表示完成，不做质量检查）：';
  container.appendChild(heading);

  for (var i = 0; i < required.length; i++) {
    var row = document.createElement('div');
    row.className = 'check-row';

    var box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = record[required[i]] === true;
    box.addEventListener('click', makeCheckHandler(required[i], box));
    row.appendChild(box);

    var label = document.createElement('span');
    label.textContent = DAILY_CHECK_LABELS[required[i]];
    row.appendChild(label);

    container.appendChild(row);
  }
}

function makeCheckHandler(name, box) {
  return function () {
    setDailyCheck(name, box.checked);
    renderDailyChecks();
    if (storageOk === false) {
      renderToday();
    }
  };
}

function renderWritingBox() {
  var box = document.getElementById('writing-box');
  var input = document.getElementById('writing-text');

  if (box === null || input === null) {
    return;
  }

  if (vocabLocked) {
    box.hidden = true;
    return;
  }

  var info = currentPlanInfo();
  var show = info.status === 'active' && info.writingToday && state.progress.completedDate !== todayString();

  box.hidden = !show;

  if (show) {
    var saved = dailyRecordOf(state.progress.day).writingText;
    input.value = typeof saved === 'string' ? saved : '';
  }
}

function handleSaveWriting() {
  var input = document.getElementById('writing-text');
  var message = document.getElementById('writing-msg');

  if (input.value.length > WRITING_TEXT_MAX_LENGTH) {
    message.textContent = '作文超过 4000 字，请删减后再保存。';
    return;
  }

  if (saveWritingText(input.value)) {
    message.textContent = '已保存作文。';
  } else {
    message.textContent = '保存失败：本地存储不可用。';
  }
}

var AUDIO_URL_PREFIX = 'https://dict.youdao.com/dictvoice?audio=';
var currentAudio = null;

function buildAudioUrl(word) {
  return AUDIO_URL_PREFIX + encodeURIComponent(word) + '&type=2';
}

function speakWithAudio(word) {
  if (typeof window.Audio === 'undefined') {
    return false;
  }

  if (currentAudio !== null) {
    currentAudio.pause();
    currentAudio = null;
  }

  currentAudio = new window.Audio(buildAudioUrl(word));
  var result = currentAudio.play();

  if (result && typeof result.catch === 'function') {
    result.catch(function () {});
  }

  return true;
}

var SPEECH_TIMEOUT_MS = 1500;
var speechState = 'unknown';
var speechFallbackTimer = null;
var lastUtterance = null;
var FATAL_SPEECH_ERRORS = ['synthesis-unavailable', 'synthesis-failed', 'language-unavailable', 'voice-unavailable', 'not-allowed'];

function isBuiltinSpeechAvailable() {
  return typeof window.speechSynthesis !== 'undefined' &&
    typeof window.SpeechSynthesisUtterance !== 'undefined';
}

function clearFallbackTimer() {
  if (speechFallbackTimer !== null) {
    clearTimeout(speechFallbackTimer);
    speechFallbackTimer = null;
  }
}

function stopBuiltinSpeech() {
  if (!isBuiltinSpeechAvailable()) {
    return;
  }

  if (lastUtterance !== null) {
    lastUtterance.onstart = null;
    lastUtterance.onend = null;
    lastUtterance.onerror = null;
    lastUtterance = null;
  }

  if (window.speechSynthesis.speaking || window.speechSynthesis.pending) {
    window.speechSynthesis.cancel();
  }
}

function speakWithBuiltin(word) {
  stopBuiltinSpeech();

  var utterance = new window.SpeechSynthesisUtterance(word);
  utterance.lang = 'en-US';
  utterance.rate = 0.9;

  utterance.onstart = function () {
    speechState = 'ok';
  };

  utterance.onend = function () {
    speechState = 'ok';
  };

  utterance.onerror = function (event) {
    var code = event && event.error;
    if (FATAL_SPEECH_ERRORS.indexOf(code) !== -1) {
      speechState = 'unavailable';
    }
  };

  lastUtterance = utterance;

  try {
    window.speechSynthesis.speak(utterance);
  } catch (error) {
    speechState = 'unavailable';
  }
}

function speakWord(word) {
  if (speechState === 'unavailable' || !isBuiltinSpeechAvailable()) {
    speechState = 'unavailable';
    clearFallbackTimer();
    stopBuiltinSpeech();
    return speakWithAudio(word) ? 'audio' : 'none';
  }

  speakWithBuiltin(word);

  if (speechState === 'unavailable') {
    clearFallbackTimer();
    return speakWithAudio(word) ? 'audio' : 'none';
  }

  if (speechState === 'unknown' && speechFallbackTimer === null) {
    speechFallbackTimer = setTimeout(function () {
      speechFallbackTimer = null;
      if (speechState === 'unknown') {
        speechState = window.speechSynthesis.speaking ? 'ok' : 'unavailable';
      }
    }, SPEECH_TIMEOUT_MS);
  }

  return 'builtin';
}
