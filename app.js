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
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch (error) {
    storageOk = false;
    return false;
  }
}

var state = loadState();

function renderToday() {
  var container = document.getElementById('today-info');
  container.textContent = '';

  var lines = [];

  if (!storageOk) {
    lines.push('本地存储不可用，学习记录无法保存。');
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
    }
  }

  for (var i = 0; i < lines.length; i++) {
    var paragraph = document.createElement('p');
    paragraph.textContent = lines[i];
    container.appendChild(paragraph);
  }
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
  } else if (result.reason === 'wordsRemaining') {
    message.textContent = '还有 ' + result.remaining + ' 个新词未标记为已学，请先全部标记。';
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
