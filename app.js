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
  var month = Math.floor((dayNum - 1) / PLAN.daysPerMonth) + 1;
  for (var i = 0; i < PLAN.stages.length; i++) {
    if (month >= PLAN.stages[i].fromMonth && month <= PLAN.stages[i].toMonth) {
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

function getDayInfo(startStr, todayStr) {
  var dayNum = getDayNumber(startStr, todayStr);
  var status;

  if (!startStr || dayNum < 1) {
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
      dayInMonth: null,
      stage: null,
      dailyNew: 0,
      phonicsWeek: false,
      isConsolidationWeek: false,
      readingToday: false,
      writingToday: false
    };
  }

  var dayInMonth = ((dayNum - 1) % PLAN.daysPerMonth) + 1;
  var stage = getStageByDay(dayNum);

  return {
    status: status,
    dayNum: dayNum,
    dayInMonth: dayInMonth,
    stage: stage,
    dailyNew: stage.dailyNew,
    phonicsWeek: dayNum <= PLAN.phonicsWeekEndDay,
    isConsolidationWeek: dayInMonth >= PLAN.consolidationStartDayInMonth,
    readingToday: dayNum >= PLAN.readingStartDay && dayNum % 7 === 0,
    writingToday: dayNum >= PLAN.writingStartDay && dayNum % 7 === 0
  };
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
    tests: []
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
  var keys = ['version', 'settings', 'queue', 'nextWordId', 'words', 'daily', 'tests'];
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
    var info = getDayInfo(state.settings.startDate, todayString());

    if (info.status === 'notStarted') {
      lines.push('计划将于 ' + state.settings.startDate + ' 开始。');
    } else if (info.status === 'finished') {
      lines.push('九个月计划已完成。');
    } else {
      lines.push('今天是第 ' + info.dayNum + ' 天 / ' + PLAN.totalDays);
      lines.push('当前阶段：' + info.stage.name);

      if (info.dailyNew === 0) {
        lines.push('今日无新词，进入全面复习。');
      } else {
        lines.push('今日新词目标：' + info.dailyNew + ' 个');
      }

      if (info.phonicsWeek) {
        lines.push('本周为音标周。');
      }

      if (info.isConsolidationWeek) {
        lines.push('本周为巩固周。');
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
  message.textContent = '已保存：' + value;
}

function ensureQueue() {
  var info = getDayInfo(state.settings.startDate, todayString());

  if (info.status !== 'active') {
    return false;
  }

  var changed = false;

  while (state.queue.length < info.dailyNew && state.nextWordId <= WORDS.length) {
    state.queue.push(state.nextWordId);
    state.nextWordId = state.nextWordId + 1;
    changed = true;
  }

  if (changed) {
    saveState();
  }

  return changed;
}

function getTodayNewWords() {
  var info = getDayInfo(state.settings.startDate, todayString());

  if (info.status !== 'active') {
    return [];
  }

  var count = Math.min(info.dailyNew, state.queue.length);
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

  var info = getDayInfo(state.settings.startDate, todayString());

  if (info.status !== 'active') {
    return;
  }

  var words = getTodayNewWords();

  if (words.length === 0) {
    var emptyParagraph = document.createElement('p');
    emptyParagraph.textContent = '今日无新词。';
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

  return row;
}

function makeSpeakHandler(text) {
  return function () {
    speakWord(text);
  };
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
