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
      renderWords();
      renderTestView();
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

  var buildReviewButton = document.getElementById('build-review-btn');
  if (buildReviewButton !== null) {
    buildReviewButton.addEventListener('click', handleBuildWritingReview);
  }

  var gradeWritingButton = document.getElementById('grade-writing-btn');
  if (gradeWritingButton !== null) {
    gradeWritingButton.addEventListener('click', handleGradeWriting);
  }

  var toggleWritingReviewButton = document.getElementById('toggle-writing-review-btn');
  if (toggleWritingReviewButton !== null) {
    toggleWritingReviewButton.addEventListener('click', handleToggleWritingReview);
  }

  var saveWritingScoreButton = document.getElementById('save-writing-score-btn');
  if (saveWritingScoreButton !== null) {
    saveWritingScoreButton.addEventListener('click', handleSaveWritingScores);
  }

  var writingTextArea = document.getElementById('writing-text');
  if (writingTextArea !== null) {
    writingTextArea.addEventListener('input', renderWritingCount);
  }

  var writingStartButton = document.getElementById('writing-start-btn');
  if (writingStartButton !== null) {
    writingStartButton.addEventListener('click', handleStartWritingTimer);
  }

  var writingPauseButton = document.getElementById('writing-pause-btn');
  if (writingPauseButton !== null) {
    writingPauseButton.addEventListener('click', handlePauseWritingTimer);
  }

  var writingResetButton = document.getElementById('writing-reset-btn');
  if (writingResetButton !== null) {
    writingResetButton.addEventListener('click', handleResetWritingTimer);
  }

  var wordsCategorySelect = document.getElementById('words-category');
  if (wordsCategorySelect !== null) {
    wordsCategorySelect.addEventListener('change', renderWords);
  }

  var wordsStateSelect = document.getElementById('words-state');
  if (wordsStateSelect !== null) {
    wordsStateSelect.addEventListener('change', renderWords);
  }

  var startExamButton = document.getElementById('start-exam-btn');
  if (startExamButton !== null) {
    startExamButton.addEventListener('click', handleStartExam);
  }

  var examSubmitButton = document.getElementById('exam-submit-btn');
  if (examSubmitButton !== null) {
    examSubmitButton.addEventListener('click', handleSubmitSpelling);
  }

  var examRevealButton = document.getElementById('exam-reveal-btn');
  if (examRevealButton !== null) {
    examRevealButton.addEventListener('click', handleReveal);
  }

  var examKnowButton = document.getElementById('exam-know-btn');
  if (examKnowButton !== null) {
    examKnowButton.addEventListener('click', function () {
      handleRecall(true);
    });
  }

  var examForgetButton = document.getElementById('exam-forget-btn');
  if (examForgetButton !== null) {
    examForgetButton.addEventListener('click', function () {
      handleRecall(false);
    });
  }

  renderWords();

  var undoButton = document.getElementById('undo-complete-btn');
  if (undoButton !== null) {
    undoButton.addEventListener('click', handleUndoComplete);
  }

  renderProgressInfo();
  renderUndoButton();

  var voiceModeButton = document.getElementById('voice-mode-btn');
  if (voiceModeButton !== null) {
    voiceModeButton.addEventListener('click', handleToggleVoiceMode);
  }

  renderVoiceMode();

  var accentButton = document.getElementById('accent-btn');
  if (accentButton !== null) {
    accentButton.addEventListener('click', handleToggleAccent);
  }

  renderAccent();

  var aiProviderSelect = document.getElementById('ai-provider');
  if (aiProviderSelect !== null) {
    aiProviderSelect.addEventListener('change', handleAiProviderChange);
  }

  var saveAiButton = document.getElementById('save-ai-btn');
  if (saveAiButton !== null) {
    saveAiButton.addEventListener('click', handleSaveAiSettings);
  }

  var testAiButton = document.getElementById('test-ai-btn');
  if (testAiButton !== null) {
    testAiButton.addEventListener('click', handleTestAiConnection);
  }

  var buildContextButton = document.getElementById('build-context-btn');
  if (buildContextButton !== null) {
    buildContextButton.addEventListener('click', handleBuildStudyContext);
  }

  renderAiSettings();

  renderBackupStatus();

  renderToday();
  renderTodayWords();
  syncTodayGroups();
  renderTestView();
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
      phonicsToday: false,
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
    phonicsToday: dayNum <= PLAN.phonicsEndDay,
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
    var parts = [WORDS[i].id, WORDS[i].word];

    for (var p = 0; p < parts.length; p++) {
      var text = String(parts[p]);
      for (var c = 0; c < text.length; c++) {
        hash = (((hash << 5) + hash) + text.charCodeAt(c)) >>> 0;
      }
    }
  }

  return WORDS.length + '-' + hash.toString(36);
}

function legacyVocabularyFingerprint() {
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
  if (state.nextWordId <= 1) {
    return false;
  }

  var stored = state.settings.vocabularyFingerprint;

  return stored !== vocabularyFingerprint() && stored !== legacyVocabularyFingerprint();
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

      if (info.readingToday) {
        lines.push('今天需要完成一次短文阅读。');
      }

      if (info.writingToday) {
        lines.push('今天需要完成一篇小作文。');
      }

      if (info.grammarToday) {
        var grammar = grammarPointFor(info.dayNum);

        if (grammar !== null) {
          lines.push((grammar.review ? '今日语法（复习）：' : '今日语法：') + grammar.item.name);
          lines.push('要点：' + grammar.item.points);
          lines.push('例句：' + grammar.item.example);
          lines.push('译文：' + grammar.item.translation);
        }
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
  renderPhonics();
  renderListening();
  renderOverview();
  renderReading();
  syncTodayGroups();
}

function syncTodayGroups() {
  var phonicsGroup = document.getElementById('group-phonics');
  var phonicsList = document.getElementById('phonics-list');

  if (phonicsGroup !== null && phonicsList !== null) {
    phonicsGroup.hidden = phonicsList.children.length === 0;
  }

  var checksGroup = document.getElementById('group-daily-checks');
  var checksList = document.getElementById('daily-checks');

  if (checksGroup !== null && checksList !== null) {
    checksGroup.hidden = checksList.children.length === 0;
  }

  var wordsGroup = document.getElementById('group-today-words');
  var wordsList = document.getElementById('today-words');

  if (wordsGroup !== null && wordsList !== null) {
    wordsGroup.hidden = wordsList.children.length === 0;
  }

  var listeningGroup = document.getElementById('group-listening');
  var listeningBox = document.getElementById('listening-box');

  if (listeningGroup !== null && listeningBox !== null) {
    listeningGroup.hidden = listeningBox.children.length === 0;
  }

  var readingGroup = document.getElementById('group-reading');
  var readingBox = document.getElementById('reading-box');

  if (readingGroup !== null && readingBox !== null) {
    readingGroup.hidden = readingBox.children.length === 0;
  }

  var writingGroup = document.getElementById('group-writing');
  var writingBox = document.getElementById('writing-box');

  if (writingGroup !== null && writingBox !== null) {
    writingGroup.hidden = writingBox.hidden;
  }

  var overviewGroup = document.getElementById('group-overview');
  var overviewBox = document.getElementById('today-overview');

  if (overviewGroup !== null && overviewBox !== null) {
    overviewGroup.hidden = overviewBox.children.length === 0;
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

  var knownButton = document.createElement('button');
  knownButton.className = 'known-btn';
  knownButton.textContent = '我已会';
  knownButton.addEventListener('click', makeKnownHandler(word.id));
  row.appendChild(knownButton);

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
      renderOverview();
    }
  };
}

function knownRecord() {
  return {
    status: 'mastered',
    reviewStep: PLAN.reviewIntervals.length - 1,
    nextReview: null,
    reviewCount: 0
  };
}

function markWordKnown(wordId) {
  if (vocabLocked) {
    return false;
  }

  if (currentPlanInfo().status !== 'active' || state.progress.completedDate === todayString()) {
    return false;
  }

  var index = state.queue.indexOf(wordId);

  if (index === -1) {
    return false;
  }

  var previousQueue = state.queue;
  var previousWords = state.words;
  var previousRefilledDay = state.progress.refilledDay;
  var key = String(wordId);

  state.queue = state.queue.slice();
  state.queue.splice(index, 1);

  state.words = {};
  var wordKeys = Object.keys(previousWords);

  for (var w = 0; w < wordKeys.length; w++) {
    state.words[wordKeys[w]] = previousWords[wordKeys[w]];
  }
  state.words[key] = knownRecord();

  // 退一再补，等价于允许当天多补一个词
  state.progress.refilledDay = state.progress.day - 1;
  ensureQueue();

  if (saveState() === false) {
    state.queue = previousQueue;
    state.words = previousWords;
    state.progress.refilledDay = previousRefilledDay;
    return false;
  }

  return true;
}

function makeKnownHandler(wordId) {
  return function () {
    if (markWordKnown(wordId)) {
      renderTodayWords();
      renderToday();
    }
  };
}

function countLearnedWords() {
  var learning = 0;
  var mastered = 0;
  var keys = Object.keys(state.words);

  for (var i = 0; i < keys.length; i++) {
    var record = state.words[keys[i]];

    if (record && record.status === 'learning') {
      learning += 1;
    } else if (record && record.status === 'mastered') {
      mastered += 1;
    }
  }

  return { total: learning + mastered, learning: learning, mastered: mastered };
}

function estimatedMinutes() {
  var info = currentPlanInfo();
  var newWords = Math.min(state.queue.length, info.dailyNew);
  var dueCount = getDueReviewWords().length;
  var required = requiredDailyChecks(info);
  var minutes = newWords * 1 + dueCount * 0.2;

  if (required.indexOf('listen') !== -1) {
    minutes += 20;
  }
  if (required.indexOf('phonics') !== -1) {
    minutes += 5;
  }
  if (required.indexOf('grammar') !== -1) {
    minutes += 5;
  }
  if (required.indexOf('reading') !== -1) {
    minutes += 15;
  }
  if (required.indexOf('writing') !== -1) {
    minutes += 30;
  }
  if (required.indexOf('test') !== -1) {
    minutes += 20;
  }

  return Math.ceil(minutes / 5) * 5;
}

function renderOverview() {
  var container = document.getElementById('today-overview');

  if (container === null) {
    return;
  }

  container.textContent = '';

  if (vocabLocked) {
    return;
  }

  var info = currentPlanInfo();

  if (info.status !== 'active') {
    return;
  }

  if (state.progress.completedDate === todayString()) {
    return;
  }

  ensureQueue();

  var counts = countLearnedWords();
  appendParagraph(container, '累计已学：' + counts.total + ' 个（学习中 ' + counts.learning +
    '，已掌握 ' + counts.mastered + '）。');
  appendParagraph(container, '今日预计用时：约 ' + estimatedMinutes() + ' 分钟。');
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
    next.reviewStep = Math.max(0, record.reviewStep - 2);
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
    var missingLabels = result.missing.map(function (name) {
      return DAILY_CHECK_LABELS[name];
    }).join('、');

    if (result.missing.indexOf('test') !== -1) {
      message.textContent = '还有未完成的今日任务：' + missingLabels +
        '。“检查”请到“检查”视图完成，完成后自动勾选。';
    } else {
      message.textContent = '还有未勾选的今日任务：' + missingLabels +
        '。请先勾选，再点“完成今天”。';
    }
  } else if (result.reason === 'alreadyCompletedToday') {
    message.textContent = '今天已经完成过了。';
  } else if (result.reason === 'saveFailed') {
    message.textContent = '保存失败：本地存储不可用。';
  } else {
    message.textContent = '当前没有可以完成的学习日。';
  }

  renderToday();
  renderTodayWords();
  renderProgressInfo();
  renderUndoButton();
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

var REVIEW_PAGE_SIZE = 30;

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

  var page = due.slice(0, REVIEW_PAGE_SIZE);

  for (var i = 0; i < page.length; i++) {
    var word = findWordById(page[i]);
    if (word !== null) {
      container.appendChild(createReviewRow(word));
    }
  }

  if (due.length > REVIEW_PAGE_SIZE) {
    appendParagraph(container, '本轮显示前 ' + REVIEW_PAGE_SIZE + ' 个，还有 ' +
      (due.length - REVIEW_PAGE_SIZE) + ' 个未显示；答完这 ' + REVIEW_PAGE_SIZE +
      ' 个后会自动显示下一批。');
  }
}

function createReviewRow(word) {
  var item = document.createElement('div');
  item.className = 'review-item';

  var text = document.createElement('span');
  text.className = 'word-text';
  var label = word.id + '. ' + word.word;
  if (word.phonetic) {
    label += ' ' + word.phonetic;
  }
  text.textContent = label;
  item.appendChild(text);

  var speakButton = document.createElement('button');
  speakButton.className = 'speak-btn';
  speakButton.textContent = '发音';
  speakButton.addEventListener('click', makeSpeakHandler(word.word));
  item.appendChild(speakButton);

  var revealButton = document.createElement('button');
  revealButton.className = 'reveal-btn';
  revealButton.textContent = '显示释义';
  revealButton.hidden = false;
  item.appendChild(revealButton);

  var answerBlock = document.createElement('div');
  answerBlock.className = 'review-answer';
  answerBlock.hidden = true;

  var detail = document.createElement('p');
  detail.textContent = word.pos + ' ' + word.category + ' ' + word.meaning;
  answerBlock.appendChild(detail);

  if (typeof word.example === 'string' && word.example !== '') {
    var example = document.createElement('p');
    example.textContent = word.example;
    answerBlock.appendChild(example);
  }

  item.appendChild(answerBlock);

  var actions = document.createElement('div');
  actions.className = 'review-actions';
  actions.hidden = true;

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

  revealButton.addEventListener('click', makeRevealHandler(answerBlock, actions, revealButton));

  return item;
}

function makeRevealHandler(answerBlock, actionsBlock, button) {
  return function () {
    answerBlock.hidden = false;
    actionsBlock.hidden = false;
    button.hidden = true;
  };
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
        typeof data.settings.vocabularyFingerprint === 'string') ||
      !(data.settings.voiceMode === undefined ||
        data.settings.voiceMode === 'audio' ||
        data.settings.voiceMode === 'builtin') ||
      !(data.settings.accent === undefined ||
        data.settings.accent === 'us' ||
        data.settings.accent === 'uk')) {
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

  for (var t = 0; t < data.tests.length; t++) {
    if (!isValidTestRecord(data.tests[t])) {
      return { ok: false, reason: 'invalidTests' };
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
  renderWords();
  renderProgressInfo();
  renderUndoButton();
  renderVoiceMode();
  renderAccent();
  renderAiSettings();
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
  renderWords();
  renderProgressInfo();
  renderUndoButton();
  renderVoiceMode();
  renderAccent();
  renderAiSettings();
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

var DAILY_CHECK_NAMES = ['listen', 'phonics', 'reading', 'writing', 'grammar', 'test'];
var DAILY_CHECK_LABELS = {
  listen: '听力',
  phonics: '音标',
  reading: '阅读',
  writing: '写作',
  grammar: '语法',
  test: '检查'
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

  if (info.phonicsToday) {
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

  if (info.checkpointToday) {
    required.push('test');
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
  if (name === 'test') {
    return false;
  }

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

function writingSecondsOf(record) {
  return Number.isInteger(record.writingSeconds) && record.writingSeconds >= 0
    ? record.writingSeconds
    : 0;
}

function currentWritingSeconds() {
  var record = dailyRecordOf(state.progress.day);
  var base = writingSecondsOf(record);

  if (Number.isInteger(record.writingStartedAt)) {
    return base + Math.floor((Date.now() - record.writingStartedAt) / 1000);
  }

  return base;
}

function writingTimerAllowed() {
  return currentPlanInfo().status === 'active' && state.progress.completedDate !== todayString();
}

function startWritingTimer() {
  if (!writingTimerAllowed()) {
    return false;
  }

  var record = dailyRecordOf(state.progress.day);

  if (Number.isInteger(record.writingStartedAt)) {
    return false;
  }

  var nextRecord = copyDailyRecord(record);
  nextRecord.writingSeconds = writingSecondsOf(record);
  nextRecord.writingStartedAt = Date.now();

  return writeDailyRecord(state.progress.day, nextRecord);
}

function pauseWritingTimer() {
  if (!writingTimerAllowed()) {
    return false;
  }

  var record = dailyRecordOf(state.progress.day);

  if (!Number.isInteger(record.writingStartedAt)) {
    return false;
  }

  var nextRecord = copyDailyRecord(record);
  nextRecord.writingSeconds = currentWritingSeconds();
  nextRecord.writingStartedAt = null;

  return writeDailyRecord(state.progress.day, nextRecord);
}

function resetWritingTimer() {
  if (!writingTimerAllowed()) {
    return false;
  }

  var nextRecord = copyDailyRecord(dailyRecordOf(state.progress.day));
  nextRecord.writingSeconds = 0;
  nextRecord.writingStartedAt = null;

  return writeDailyRecord(state.progress.day, nextRecord);
}

function countWords(text) {
  if (typeof text !== 'string') {
    return 0;
  }

  var trimmed = text.trim();

  if (trimmed === '') {
    return 0;
  }

  return trimmed.split(/\s+/).length;
}

function writingWordCount(text) {
  return countWords(text);
}

function padTwo(value) {
  return value < 10 ? '0' + value : String(value);
}

function formatDuration(seconds) {
  var total = Math.max(0, Math.floor(seconds));
  return padTwo(Math.floor(total / 60)) + ' 分 ' + padTwo(total % 60) + ' 秒';
}

function writingTimerText(seconds) {
  return '用时 ' + formatDuration(seconds);
}

function renderWritingCount() {
  var container = document.getElementById('writing-count');

  if (container === null) {
    return;
  }

  var input = document.getElementById('writing-text');
  var task = writingTaskFor(state.progress.day);
  var minWords = task === null ? 0 : task.item.minWords;
  var count = countWords(input === null ? '' : input.value);
  var text = '已写 ' + count + ' 词，要求至少 ' + minWords + ' 词。';

  if (count < minWords) {
    text += '（还差 ' + (minWords - count) + ' 词）';
  }

  container.textContent = text;
}

function renderWritingTimer() {
  var container = document.getElementById('writing-timer');
  var running = Number.isInteger(dailyRecordOf(state.progress.day).writingStartedAt);

  if (container !== null) {
    container.textContent = writingTimerText(currentWritingSeconds());
  }

  var startButton = document.getElementById('writing-start-btn');
  var pauseButton = document.getElementById('writing-pause-btn');

  if (startButton !== null) {
    startButton.hidden = running;
  }

  if (pauseButton !== null) {
    pauseButton.hidden = !running;
  }

  if (running) {
    if (writingTickTimer === null) {
      writingTickTimer = setInterval(function () {
        renderWritingTimer();
      }, 1000);
    }
  } else {
    stopWritingTick();
  }
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
    } else if (name === 'writingSeconds') {
      if (!Number.isInteger(value) || value < 0) {
        return false;
      }
    } else if (name === 'writingStartedAt') {
      if (!(value === null || (Number.isInteger(value) && value > 0))) {
        return false;
      }
    } else if (name === 'writingScores') {
      if (!isPlainObject(value)) {
        return false;
      }

      var scoreKeys = Object.keys(value);
      var requiredScoreKeys = ['ta', 'cc', 'lr', 'gra', 'band'];

      if (scoreKeys.length !== requiredScoreKeys.length) {
        return false;
      }

      for (var s = 0; s < scoreKeys.length; s++) {
        if (requiredScoreKeys.indexOf(scoreKeys[s]) === -1) {
          return false;
        }
      }

      for (var r = 0; r < requiredScoreKeys.length; r++) {
        var scoreValue = value[requiredScoreKeys[r]];

        if (typeof scoreValue !== 'number' ||
            !Number.isFinite(scoreValue) ||
            scoreValue < 0 ||
            scoreValue > 9 ||
            !Number.isInteger(scoreValue * 2)) {
          return false;
        }
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
    if (required[i] === 'test') {
      var testParagraph = document.createElement('p');
      testParagraph.textContent = record.test === true
        ? '检查：已完成。'
        : '检查：请到“检查”视图完成，完成后自动勾选。';
      container.appendChild(testParagraph);
      continue;
    }

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

function writingTaskFor(day) {
  if (!Number.isInteger(day) || day < 1 || day > PLAN.totalDays) {
    return null;
  }

  if (getDayInfoByDay(day).writingToday === false) {
    return null;
  }

  var index = Math.floor((day - PLAN.writingStartDay) / PLAN.writingEvery);
  var no = index % WRITING_TASKS.length + 1;

  return { item: WRITING_TASKS[no - 1], index: index, no: no };
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

  var task = document.getElementById('writing-task');

  if (!show) {
    stopWritingTick();
    if (task !== null) {
      task.textContent = '';
    }
    return;
  }

  var record = dailyRecordOf(state.progress.day);
  var saved = record.writingText;
  input.value = typeof saved === 'string' ? saved : '';

  var scores = record.writingScores;
  var scoreFieldIds = ['writing-ta', 'writing-cc', 'writing-lr', 'writing-gra'];
  var scoreFieldKeys = ['ta', 'cc', 'lr', 'gra'];

  for (var s = 0; s < scoreFieldIds.length; s++) {
    var scoreField = document.getElementById(scoreFieldIds[s]);

    if (scoreField !== null) {
      scoreField.value = isPlainObject(scores) && typeof scores[scoreFieldKeys[s]] === 'number'
        ? String(scores[scoreFieldKeys[s]])
        : '';
    }
  }

  var scoreMessage = document.getElementById('writing-score-msg');

  if (scoreMessage !== null) {
    scoreMessage.textContent = isPlainObject(scores) && typeof scores.ta === 'number' &&
      typeof scores.cc === 'number' && typeof scores.lr === 'number' &&
      typeof scores.gra === 'number' && typeof scores.band === 'number'
      ? '已记录：TA ' + scores.ta.toFixed(1) + ' / CC ' + scores.cc.toFixed(1) +
        ' / LR ' + scores.lr.toFixed(1) + ' / GRA ' + scores.gra.toFixed(1) +
        '，总分 ' + scores.band.toFixed(1) + '。'
      : '';
  }

  renderWritingCount();
  renderWritingTimer();

  if (task === null) {
    return;
  }

  task.textContent = '';

  var writingTask = writingTaskFor(state.progress.day);

  if (writingTask === null) {
    return;
  }

  var item = writingTask.item;

  appendParagraph(task, '今日写作：' + (item.type === 'task2' ? 'Task 2' : 'Task 1'));
  appendParagraph(task, item.prompt);

  if (item.data !== '') {
    appendParagraph(task, '数据：' + item.data);
  }

  appendParagraph(task, '至少 ' + item.minWords + ' 词，建议 ' + item.minutes + ' 分钟。');
}

var writingTickTimer = null;

function stopWritingTick() {
  if (writingTickTimer !== null) {
    clearInterval(writingTickTimer);
    writingTickTimer = null;
  }
}

function handleStartWritingTimer() {
  if (startWritingTimer()) {
    renderWritingTimer();
  }
}

function handlePauseWritingTimer() {
  if (pauseWritingTimer()) {
    stopWritingTick();
    renderWritingTimer();
  }
}

function handleResetWritingTimer() {
  if (resetWritingTimer()) {
    stopWritingTick();
    renderWritingTimer();
  }
}

function buildWritingReviewText() {
  var info = currentPlanInfo();

  if (info.status !== 'active') {
    return '';
  }

  var task = writingTaskFor(state.progress.day);

  if (task === null) {
    return '';
  }

  if (state.progress.completedDate === todayString()) {
    return '';
  }

  var record = dailyRecordOf(state.progress.day);
  var text = record.writingText;

  if (typeof text !== 'string' || text === '') {
    return '';
  }

  var item = task.item;
  var lines = [];

  lines.push('# 雅思写作批改请求');
  lines.push('');
  lines.push('## 题目');
  lines.push(item.type === 'task2' ? 'Task 2' : 'Task 1');
  lines.push(item.prompt);

  if (item.data !== '') {
    lines.push('数据：' + item.data);
  }

  lines.push('');
  lines.push('## 要求');
  lines.push('至少 ' + item.minWords + ' 词，建议 ' + item.minutes + ' 分钟。');
  lines.push('');
  lines.push('## 我的作文');
  lines.push(text);
  lines.push('');
  lines.push('## 统计');
  lines.push('字数：' + countWords(text) + ' 词（要求至少 ' + item.minWords + ' 词）');
  lines.push('用时：' + formatDuration(currentWritingSeconds()));
  lines.push('');
  lines.push('## 请按以下四项各给 0-9 分（可含 0.5），并给出总分（四项平均，四舍五入到 0.5）');
  lines.push('1. 任务完成度（Task Achievement / Response）');
  lines.push('2. 连贯与衔接（Coherence and Cohesion）');
  lines.push('3. 词汇资源（Lexical Resource）');
  lines.push('4. 语法多样性与准确性（Grammatical Range and Accuracy）');
  lines.push('');
  lines.push('## 另请指出');
  lines.push('- 三处最需要改的地方，每处给出改写建议');
  lines.push('- 两个用错的词或搭配');
  lines.push('- 一个可以升级的句型');

  return lines.join('\n');
}

function handleBuildWritingReview() {
  var message = document.getElementById('writing-review-msg');
  var output = document.getElementById('writing-review-text');
  var text = buildWritingReviewText();

  if (text === '') {
    if (message !== null) {
      message.textContent = '还没有可提交的作文，请先写并保存。';
    }
    return;
  }

  if (output !== null) {
    output.value = text;
    output.focus();
    output.setSelectionRange(0, text.length);
  }

  if (message !== null) {
    message.textContent = '已生成，长按文本框全选复制。';
  }
}

function handleToggleWritingReview() {
  var panel = document.getElementById('writing-review-panel');
  var button = document.getElementById('toggle-writing-review-btn');

  if (panel === null || button === null) {
    return;
  }

  panel.hidden = !panel.hidden;
  button.textContent = panel.hidden ? '显示评审文字' : '隐藏评审文字';
}

function buildGradingPrompt() {
  if (currentPlanInfo().status !== 'active') {
    return '';
  }

  var task = writingTaskFor(state.progress.day);

  if (task === null) {
    return '';
  }

  var text = dailyRecordOf(state.progress.day).writingText;

  if (typeof text !== 'string' || text === '') {
    return '';
  }

  var item = task.item;
  var lines = [];

  lines.push('# 雅思写作批改');
  lines.push('');
  lines.push('## 题目');
  lines.push(item.type === 'task2' ? 'Task 2' : 'Task 1');
  lines.push(item.prompt);

  if (item.data !== '') {
    lines.push('数据：' + item.data);
  }

  lines.push('');
  lines.push('## 要求');
  lines.push('至少 ' + item.minWords + ' 词，建议 ' + item.minutes + ' 分钟。');
  lines.push('');
  lines.push('## 作文');
  lines.push(text);
  lines.push('');
  lines.push('## 统计');
  lines.push('字数：' + countWords(text) + ' 词');
  lines.push('用时：' + formatDuration(currentWritingSeconds()));
  lines.push('');
  lines.push('## 输出格式');
  lines.push('只输出一个 JSON 对象，不要 Markdown 代码块，不要任何解释文字。字段为：ta、cc、lr、gra（数字，0 到 9，可含 0.5）、comment（字符串，120 到 300 字的中文点评，指出三处最需要改的地方并各给一句改写建议）。');

  return lines.join('\n');
}

function parseGradingReply(text) {
  var cleaned = typeof text === 'string' ? text.trim() : '';

  if (cleaned.slice(0, 3) === '```') {
    var firstNewline = cleaned.indexOf('\n');

    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1);
    }

    if (cleaned.slice(-3) === '```') {
      cleaned = cleaned.slice(0, -3);
    }

    cleaned = cleaned.trim();
  }

  var data;

  try {
    data = JSON.parse(cleaned);
  } catch (error) {
    return { ok: false, reason: 'invalidJson' };
  }

  var scoreKeys = ['ta', 'cc', 'lr', 'gra'];

  for (var i = 0; i < scoreKeys.length; i++) {
    var value = data === null || typeof data !== 'object' ? undefined : data[scoreKeys[i]];

    if (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 9 ||
        !Number.isInteger(value * 2)) {
      return { ok: false, reason: 'invalidScores' };
    }
  }

  if (typeof data.comment !== 'string') {
    return { ok: false, reason: 'invalidComment' };
  }

  return { ok: true, ta: data.ta, cc: data.cc, lr: data.lr, gra: data.gra, comment: data.comment };
}

function gradeWriting() {
  var settings = currentAiSettings();
  var key = loadAiKey();

  if (key === '' || settings.model === '') {
    return Promise.resolve({ ok: false, message: '请先在设置页填写 AI 接口。' });
  }

  var prompt = buildGradingPrompt();

  if (prompt === '') {
    return Promise.resolve({ ok: false, message: '还没有可评分的作文，请先写并保存。' });
  }

  var request = buildAiRequest(prompt);

  return Promise.resolve().then(function () {
    return fetch(request.url, request.options);
  }).then(function (response) {
    if (!response.ok) {
      return response.text().then(function (text) {
        return {
          ok: false,
          message: '评分失败：HTTP ' + response.status + '，' + String(text).slice(0, 200)
        };
      });
    }

    return response.text().then(function (rawText) {
      var bodyText = String(rawText);

      try {
        var extracted = extractAiText(JSON.parse(bodyText), settings.provider);

        if (typeof extracted === 'string' && extracted !== '') {
          bodyText = extracted;
        }
      } catch (error) {
        // 响应不是 JSON 时，直接按原文解析
      }

      var parsed = parseGradingReply(bodyText);

      if (parsed.ok) {
        return {
          ok: true,
          ta: parsed.ta,
          cc: parsed.cc,
          lr: parsed.lr,
          gra: parsed.gra,
          comment: parsed.comment
        };
      }

      return {
        ok: false,
        message: '返回内容无法解析，前 200 个字符：' + bodyText.slice(0, 200)
      };
    });
  }).catch(function (error) {
    var detail = error && error.message ? error.message : String(error);
    return { ok: false, message: '评分失败：' + detail + '。可能是网络或跨域被拦截。' };
  });
}

function handleGradeWriting() {
  var message = document.getElementById('grade-writing-msg');

  if (message !== null) {
    message.textContent = '正在评分……';
  }

  return gradeWriting().then(function (result) {
    if (!result.ok) {
      if (message !== null) {
        message.textContent = result.message;
      }
      return;
    }

    var fields = [
      { id: 'writing-ta', key: 'ta' },
      { id: 'writing-cc', key: 'cc' },
      { id: 'writing-lr', key: 'lr' },
      { id: 'writing-gra', key: 'gra' }
    ];

    for (var i = 0; i < fields.length; i++) {
      var field = document.getElementById(fields[i].id);

      if (field !== null) {
        field.value = String(result[fields[i].key]);
      }
    }

    if (message !== null) {
      message.textContent = '评分：TA ' + result.ta.toFixed(1) + ' / CC ' + result.cc.toFixed(1) +
        ' / LR ' + result.lr.toFixed(1) + ' / GRA ' + result.gra.toFixed(1) +
        '，总分 ' + writingBand(result).toFixed(1) + '。下面是指出问题与改写建议：\n' +
        result.comment;
    }
  });
}

function roundToHalf(value) {
  return Math.round(value * 2) / 2;
}

function writingBand(scores) {
  return roundToHalf((scores.ta + scores.cc + scores.lr + scores.gra) / 4);
}

function saveWritingScores(scores) {
  if (vocabLocked) {
    return false;
  }

  if (!isPlainObject(scores)) {
    return false;
  }

  var keys = ['ta', 'cc', 'lr', 'gra'];

  for (var i = 0; i < keys.length; i++) {
    var value = scores[keys[i]];

    if (typeof value !== 'number' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 9 ||
        !Number.isInteger(value * 2)) {
      return false;
    }
  }

  if (currentPlanInfo().status !== 'active' || state.progress.completedDate === todayString()) {
    return false;
  }

  var nextRecord = copyDailyRecord(dailyRecordOf(state.progress.day));
  nextRecord.writingScores = {
    ta: scores.ta,
    cc: scores.cc,
    lr: scores.lr,
    gra: scores.gra,
    band: writingBand(scores)
  };

  return writeDailyRecord(state.progress.day, nextRecord);
}

function handleSaveWritingScores() {
  var fieldIds = ['writing-ta', 'writing-cc', 'writing-lr', 'writing-gra'];
  var keys = ['ta', 'cc', 'lr', 'gra'];
  var scores = {};
  var message = document.getElementById('writing-score-msg');

  for (var i = 0; i < fieldIds.length; i++) {
    var field = document.getElementById(fieldIds[i]);
    var raw = field === null || field.value === null || field.value === undefined
      ? ''
      : String(field.value).trim();
    var value = Number(raw);

    if (raw === '' ||
        !Number.isFinite(value) ||
        value < 0 ||
        value > 9 ||
        !Number.isInteger(value * 2)) {
      if (message !== null) {
        message.textContent = '请把四项都填成 0 到 9 之间、可含 0.5 的数字。';
      }
      return;
    }

    scores[keys[i]] = value;
  }

  if (!saveWritingScores(scores)) {
    if (message !== null) {
      message.textContent = '保存失败：本地存储不可用。';
    }
    return;
  }

  if (message !== null) {
    message.textContent = '已记录：TA ' + scores.ta.toFixed(1) + ' / CC ' + scores.cc.toFixed(1) +
      ' / LR ' + scores.lr.toFixed(1) + ' / GRA ' + scores.gra.toFixed(1) +
      '，总分 ' + writingBand(scores).toFixed(1) + '。';
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

var WORD_PAGE_LIMIT = 200;
var WORD_STATE_LABELS = {
  mastered: '已掌握',
  learning: '学习中',
  queued: '待学',
  unlearned: '未学'
};

function wordStateOf(wordId) {
  var id = Number(wordId);
  var record = state.words[String(id)];

  if (record !== null && typeof record === 'object' && record.status === 'mastered') {
    return 'mastered';
  }

  if (record !== null && typeof record === 'object' && record.status === 'learning') {
    return 'learning';
  }

  if (Array.isArray(state.queue) && state.queue.indexOf(id) !== -1) {
    return 'queued';
  }

  return 'unlearned';
}

function wordStateLabel(key) {
  return WORD_STATE_LABELS[key];
}

function createWordsRow(word, stateKey) {
  var row = document.createElement('div');
  row.className = 'word-row';

  var text = document.createElement('span');
  text.className = 'word-text';
  var label = word.id + '. ' + word.word + ' ';
  if (word.phonetic) {
    label += word.phonetic + ' ';
  }
  text.textContent = label + word.pos + ' ' + word.category + ' ' + word.meaning +
    ' ［' + wordStateLabel(stateKey) + '］';
  row.appendChild(text);

  var button = document.createElement('button');
  button.className = 'speak-btn';
  button.textContent = '发音';
  button.addEventListener('click', makeSpeakHandler(word.word));
  row.appendChild(button);

  if (typeof word.example === 'string' && word.example !== '') {
    var exampleSpan = document.createElement('span');
    exampleSpan.className = 'word-example';
    exampleSpan.textContent = word.example;
    row.appendChild(exampleSpan);
  }

  return row;
}

function renderWords() {
  var summary = document.getElementById('words-summary');
  var list = document.getElementById('words-list');
  var more = document.getElementById('words-more');
  var categorySelect = document.getElementById('words-category');
  var stateSelect = document.getElementById('words-state');

  if (summary === null || list === null || more === null) {
    return;
  }

  summary.textContent = '';
  list.textContent = '';
  more.textContent = '';

  if (vocabLocked) {
    summary.textContent = LOCK_MESSAGE;
    return;
  }

  var category = categorySelect === null || !categorySelect.value ? 'all' : categorySelect.value;
  var stateFilter = stateSelect === null || !stateSelect.value ? 'all' : stateSelect.value;

  var learning = 0;
  var mastered = 0;
  var categoryNames = Object.keys(PLAN.categoryTargets);
  var learnedByCategory = {};

  for (var c = 0; c < categoryNames.length; c++) {
    learnedByCategory[categoryNames[c]] = 0;
  }

  for (var i = 0; i < WORDS.length; i++) {
    var wordState = wordStateOf(WORDS[i].id);

    if (wordState === 'learning') {
      learning += 1;
    } else if (wordState === 'mastered') {
      mastered += 1;
    }

    if (wordState === 'learning' || wordState === 'mastered') {
      if (learnedByCategory[WORDS[i].category] !== undefined) {
        learnedByCategory[WORDS[i].category] += 1;
      }
    }
  }

  appendParagraph(summary, '总进度：已学 ' + (learning + mastered) + ' / ' + WORDS.length +
    ' 个（学习中 ' + learning + '，已掌握 ' + mastered + '）。');

  for (var n = 0; n < categoryNames.length; n++) {
    var name = categoryNames[n];
    appendParagraph(summary, name + '：已学 ' + learnedByCategory[name] + ' / ' + PLAN.categoryTargets[name]);
  }

  var filtered = [];

  for (var w = 0; w < WORDS.length; w++) {
    var word = WORDS[w];

    if (category !== 'all' && word.category !== category) {
      continue;
    }

    if (stateFilter !== 'all' && wordStateOf(word.id) !== stateFilter) {
      continue;
    }

    filtered.push(word);
  }

  var shown = filtered.slice(0, WORD_PAGE_LIMIT);

  for (var s = 0; s < shown.length; s++) {
    list.appendChild(createWordsRow(shown[s], wordStateOf(shown[s].id)));
  }

  if (filtered.length === 0) {
    more.textContent = '没有符合条件的单词。';
  } else if (filtered.length > WORD_PAGE_LIMIT) {
    more.textContent = '共 ' + filtered.length + ' 个符合条件，仅显示前 ' + WORD_PAGE_LIMIT +
      ' 个，请用筛选缩小范围。';
  } else {
    more.textContent = '共 ' + filtered.length + ' 个。';
  }
}

function isValidTestRecord(record) {
  if (!isPlainObject(record)) {
    return false;
  }

  if (!isIntegerIn(record.day, 1, PLAN.totalDays)) {
    return false;
  }

  if (!isDateText(record.date)) {
    return false;
  }

  if (!isIntegerIn(record.total, 1, PLAN.testQuestionCount)) {
    return false;
  }

  if (!isIntegerIn(record.correct, 0, record.total)) {
    return false;
  }

  if (!Array.isArray(record.details) || record.details.length !== record.total) {
    return false;
  }

  for (var i = 0; i < record.details.length; i++) {
    var detail = record.details[i];

    if (!isPlainObject(detail)) {
      return false;
    }

    if (!isIntegerIn(detail.wordId, 1, WORDS.length)) {
      return false;
    }

    if (detail.direction !== 'zh2en' && detail.direction !== 'en2zh') {
      return false;
    }

    if (typeof detail.correct !== 'boolean') {
      return false;
    }
  }

  return true;
}

var examState = null;
var examRevealed = false;
var examMessage = '';

function learnedWordIds() {
  var ids = [];
  var keys = Object.keys(state.words);

  for (var i = 0; i < keys.length; i++) {
    var record = state.words[keys[i]];

    if (record && (record.status === 'learning' || record.status === 'mastered')) {
      ids.push(Number(keys[i]));
    }
  }

  ids.sort(function (a, b) {
    return a - b;
  });

  return ids;
}

function buildExam(pool, random) {
  var rand = typeof random === 'function' ? random : Math.random;
  var count = Math.min(PLAN.testQuestionCount, pool.length);
  var shuffled = pool.slice();

  for (var i = shuffled.length - 1; i > 0; i--) {
    var j = Math.floor(rand() * (i + 1));
    var temp = shuffled[i];
    shuffled[i] = shuffled[j];
    shuffled[j] = temp;
  }

  var picked = shuffled.slice(0, count);
  var zh2enCount = Math.ceil(count / 2);
  var questions = [];

  for (var q = 0; q < picked.length; q++) {
    questions.push({
      wordId: picked[q],
      direction: q < zh2enCount ? 'zh2en' : 'en2zh'
    });
  }

  for (var s = questions.length - 1; s > 0; s--) {
    var k = Math.floor(rand() * (s + 1));
    var hold = questions[s];
    questions[s] = questions[k];
    questions[k] = hold;
  }

  return questions;
}

function normalizeAnswer(text) {
  return String(text).trim().toLowerCase();
}

function nextCheckpointDay(day) {
  var record = dailyRecordOf(day);

  if (day >= 1 && day % PLAN.checkpointEvery === 0 && record.test !== true) {
    return day;
  }

  var next = (Math.floor(day / PLAN.checkpointEvery) + 1) * PLAN.checkpointEvery;

  if (next > PLAN.totalDays) {
    return null;
  }

  return next;
}

function currentExamQuestion() {
  if (examState === null) {
    return null;
  }

  return examState.questions[examState.index] || null;
}

function startExam(random) {
  if (vocabLocked) {
    return { ok: false, reason: 'vocabLocked' };
  }

  var info = currentPlanInfo();

  if (info.status !== 'active') {
    return { ok: false, reason: 'notActive' };
  }

  if (info.checkpointToday !== true) {
    return { ok: false, reason: 'notCheckpoint' };
  }

  if (state.progress.completedDate === todayString()) {
    return { ok: false, reason: 'alreadyCompletedToday' };
  }

  if (dailyRecordOf(state.progress.day).test === true) {
    return { ok: false, reason: 'alreadyDone' };
  }

  var pool = learnedWordIds();

  if (pool.length === 0) {
    return { ok: false, reason: 'noLearnedWords' };
  }

  examState = {
    questions: buildExam(pool, random),
    index: 0,
    results: []
  };
  examRevealed = false;
  examMessage = '';

  return { ok: true };
}

function submitSpelling(text) {
  var question = currentExamQuestion();

  if (question === null || question.direction !== 'zh2en') {
    return false;
  }

  var word = findWordById(question.wordId);
  var correct = word !== null && normalizeAnswer(text) === normalizeAnswer(word.word);

  examState.results.push({
    wordId: question.wordId,
    direction: question.direction,
    correct: correct
  });
  examState.index += 1;
  examRevealed = false;

  if (examState.index >= examState.questions.length) {
    return finishExam();
  }

  renderTestView();
  return true;
}

function revealMeaning() {
  var question = currentExamQuestion();

  if (question === null || question.direction !== 'en2zh') {
    return false;
  }

  examRevealed = true;
  renderTestView();
  return true;
}

function answerRecall(known) {
  var question = currentExamQuestion();

  if (question === null || question.direction !== 'en2zh') {
    return false;
  }

  examState.results.push({
    wordId: question.wordId,
    direction: question.direction,
    correct: known === true
  });
  examState.index += 1;
  examRevealed = false;

  if (examState.index >= examState.questions.length) {
    return finishExam();
  }

  renderTestView();
  return true;
}

function finishExam() {
  if (examState === null) {
    return false;
  }

  var day = state.progress.day;
  var total = examState.questions.length;
  var correct = 0;

  for (var i = 0; i < examState.results.length; i++) {
    if (examState.results[i].correct === true) {
      correct += 1;
    }
  }

  var record = {
    day: day,
    date: todayString(),
    total: total,
    correct: correct,
    details: examState.results.map(function (item) {
      return {
        wordId: item.wordId,
        direction: item.direction,
        correct: item.correct
      };
    })
  };

  var previousTests = state.tests;
  var previousDaily = state.daily;
  var previousWords = state.words;

  var nextWords = {};
  var currentKeys = Object.keys(state.words);

  for (var w = 0; w < currentKeys.length; w++) {
    nextWords[currentKeys[w]] = state.words[currentKeys[w]];
  }

  for (var r = 0; r < examState.results.length; r++) {
    var resultItem = examState.results[r];

    if (resultItem.correct === true) {
      continue;
    }

    var key = String(resultItem.wordId);
    var prev = state.words[key];

    if (!prev) {
      continue;
    }

    nextWords[key] = {
      status: 'learning',
      reviewStep: Math.max(0, prev.reviewStep - 2),
      nextReview: day + 1,
      reviewCount: prev.reviewCount + 1
    };
  }

  state.tests = Array.isArray(state.tests) ? state.tests.slice() : [];
  state.tests.push(record);

  state.daily = isPlainObject(state.daily) ? copyDailyRecord(state.daily) : {};
  var nextDaily = copyDailyRecord(dailyRecordOf(day));
  nextDaily.test = true;
  state.daily[String(day)] = nextDaily;

  state.words = nextWords;

  if (saveState() === false) {
    state.tests = previousTests;
    state.daily = previousDaily;
    state.words = previousWords;
    examMessage = '保存失败：本地存储不可用，检查结果未保存。';
    examState = null;
    renderTestView();
    return { ok: false, reason: 'saveFailed' };
  }

  examState = null;
  examRevealed = false;
  examMessage = '检查完成：答对 ' + correct + ' / ' + total + '。今天的“检查”任务已自动勾选。';

  renderToday();
  renderTestView();

  return { ok: true, correct: correct, total: total };
}

function renderTestView() {
  var status = document.getElementById('test-status');
  var startButton = document.getElementById('start-exam-btn');
  var area = document.getElementById('exam-area');
  var progress = document.getElementById('exam-progress');
  var question = document.getElementById('exam-question');
  var input = document.getElementById('exam-input');
  var submitButton = document.getElementById('exam-submit-btn');
  var revealButton = document.getElementById('exam-reveal-btn');
  var knowButton = document.getElementById('exam-know-btn');
  var forgetButton = document.getElementById('exam-forget-btn');
  var result = document.getElementById('exam-result');

  if (status === null) {
    return;
  }

  if (result !== null) {
    result.textContent = examMessage;
  }

  if (area !== null) {
    area.hidden = true;
  }

  if (vocabLocked) {
    status.textContent = LOCK_MESSAGE;
    if (startButton !== null) {
      startButton.hidden = true;
    }
    return;
  }

  var info = currentPlanInfo();

  if (info.status === 'notStarted') {
    status.textContent = '计划未进行，暂不能检查。';
    if (startButton !== null) {
      startButton.hidden = true;
    }
    return;
  }

  if (info.status === 'finished') {
    status.textContent = '计划已结束，不再检查。';
    if (startButton !== null) {
      startButton.hidden = true;
    }
    return;
  }

  var day = state.progress.day;
  var dayRecord = dailyRecordOf(day);
  var pool = learnedWordIds();

  if (info.checkpointToday) {
    if (dayRecord.test === true) {
      var lastTest = null;

      for (var i = state.tests.length - 1; i >= 0; i--) {
        if (state.tests[i] && state.tests[i].day === day) {
          lastTest = state.tests[i];
          break;
        }
      }

      status.textContent = lastTest === null
        ? '今天的检查已完成。'
        : '今天的检查已完成：答对 ' + lastTest.correct + ' / ' + lastTest.total + '。';
    } else {
      status.textContent = '今天是检查日。请完成本次检查（共 ' +
        Math.min(PLAN.testQuestionCount, pool.length) + ' 题，不设及格线，只用于了解掌握情况）。';
    }
  } else {
    var next = nextCheckpointDay(day);
    status.textContent = next === null
      ? '本计划没有更多检查日。'
      : '下一次检查：第 ' + next + ' 天（当前第 ' + day + ' 天）。';
  }

  if (startButton !== null) {
    startButton.hidden = !(info.checkpointToday && dayRecord.test !== true &&
      state.progress.completedDate !== todayString() && pool.length > 0 &&
      examState === null);
  }

  if (examState === null || area === null) {
    return;
  }

  var current = currentExamQuestion();

  if (current === null) {
    return;
  }

  var word = findWordById(current.wordId);

  if (word === null) {
    return;
  }

  area.hidden = false;

  if (progress !== null) {
    progress.textContent = '第 ' + (examState.index + 1) + ' / ' + examState.questions.length + ' 题';
  }

  var isZh2En = current.direction === 'zh2en';

  if (question !== null) {
    if (isZh2En) {
      question.textContent = '请写出英文：' + word.meaning;
    } else if (examRevealed) {
      question.textContent = word.word + ' ' + word.meaning;
    } else {
      question.textContent = '请回想中文释义：' + word.word;
    }
  }

  if (input !== null) {
    input.hidden = !isZh2En;
  }

  if (submitButton !== null) {
    submitButton.hidden = !isZh2En;
  }

  if (revealButton !== null) {
    revealButton.hidden = isZh2En || examRevealed;
  }

  if (knowButton !== null) {
    knowButton.hidden = isZh2En || !examRevealed;
  }

  if (forgetButton !== null) {
    forgetButton.hidden = isZh2En || !examRevealed;
  }
}

function handleStartExam() {
  startExam();
  renderTestView();
}

function handleSubmitSpelling() {
  var input = document.getElementById('exam-input');
  var text = input === null ? '' : input.value;

  submitSpelling(text);

  if (input !== null) {
    input.value = '';
  }
}

function handleReveal() {
  revealMeaning();
}

function handleRecall(known) {
  answerRecall(known);
}

function restorableWordIds(day) {
  var ids = [];
  var keys = Object.keys(state.words);

  for (var i = 0; i < keys.length; i++) {
    var record = state.words[keys[i]];

    if (record && record.reviewCount === 0 && record.nextReview === day) {
      ids.push(Number(keys[i]));
    }
  }

  ids.sort(function (a, b) {
    return a - b;
  });

  return ids;
}

function undoTodayCompletion() {
  if (vocabLocked) {
    return { ok: false, reason: 'vocabLocked' };
  }

  if (state.progress.completedDate !== todayString()) {
    return { ok: false, reason: 'notCompletedToday' };
  }

  var previousDay = state.progress.day;
  var previousDate = state.progress.completedDate;
  var previousWords = state.words;
  var previousQueue = state.queue;

  var restoredIds = restorableWordIds(previousDay);
  var restoredSet = {};

  for (var i = 0; i < restoredIds.length; i++) {
    restoredSet[restoredIds[i]] = true;
  }

  var nextWords = {};
  var wordKeys = Object.keys(state.words);

  for (var w = 0; w < wordKeys.length; w++) {
    if (restoredSet[Number(wordKeys[w])] !== true) {
      nextWords[wordKeys[w]] = state.words[wordKeys[w]];
    }
  }

  var nextQueue = restoredIds.slice();
  var currentQueue = Array.isArray(state.queue) ? state.queue : [];

  for (var q = 0; q < currentQueue.length; q++) {
    if (restoredSet[currentQueue[q]] !== true) {
      nextQueue.push(currentQueue[q]);
    }
  }

  state.words = nextWords;
  state.queue = nextQueue;
  state.progress.day = previousDay - 1;
  state.progress.completedDate = null;

  if (saveState() === false) {
    state.words = previousWords;
    state.queue = previousQueue;
    state.progress.day = previousDay;
    state.progress.completedDate = previousDate;
    return { ok: false, reason: 'saveFailed' };
  }

  return { ok: true, day: state.progress.day, restored: restoredIds.length };
}

function renderProgressInfo() {
  var container = document.getElementById('progress-info');

  if (container === null) {
    return;
  }

  var info = currentPlanInfo();

  if (state.settings.startDate === null || info.status === 'notStarted') {
    container.textContent = '当前学习日：未开始。';
    return;
  }

  if (info.status === 'finished') {
    container.textContent = '当前学习日：计划已完成。';
    return;
  }

  container.textContent = '当前学习日：第 ' + state.progress.day + ' 天 / ' + PLAN.totalDays + '。';
}

function renderUndoButton() {
  var button = document.getElementById('undo-complete-btn');

  if (button === null) {
    return;
  }

  button.hidden = !(vocabLocked === false && state.progress.completedDate === todayString());
}

function handleUndoComplete() {
  var message = document.getElementById('undo-complete-msg');
  var nextDay = state.progress.day - 1;
  var restorable = restorableWordIds(state.progress.day).length;

  var confirmText = restorable > 0
    ? '撤销今天的完成，回到第 ' + nextDay + ' 天。今天标记为已学的 ' + restorable +
      ' 个词会回到待学列表。确定吗？'
    : '撤销今天的完成，回到第 ' + nextDay + ' 天。今天没有标记新的词。确定吗？';

  if (!window.confirm(confirmText)) {
    message.textContent = '已取消，未撤销。';
    return;
  }

  var result = undoTodayCompletion();

  if (result.ok) {
    message.textContent = result.restored > 0
      ? '已撤销今天的完成，回到第 ' + result.day + ' 天，' + result.restored + ' 个词回到待学列表。'
      : '已撤销今天的完成，回到第 ' + result.day + ' 天。';
  } else if (result.reason === 'vocabLocked') {
    message.textContent = LOCK_MESSAGE;
  } else if (result.reason === 'notCompletedToday') {
    message.textContent = '今天没有已完成的记录，无法撤销。';
  } else {
    message.textContent = '保存失败：本地存储不可用，未撤销。';
  }

  renderToday();
  renderTodayWords();
  renderReview();
  renderTestView();
  renderProgressInfo();
  renderUndoButton();
}

function grammarPointFor(day) {
  if (!Number.isInteger(day)) {
    return null;
  }

  if (day < 1 || day > PLAN.totalDays) {
    return null;
  }

  var offset = day - PLAN.grammarStartDay;

  if (offset < 0 || offset % PLAN.grammarEvery !== 0) {
    return null;
  }

  var idx = offset / PLAN.grammarEvery;
  var index = idx % GRAMMAR.length;

  return {
    item: GRAMMAR[index],
    index: index,
    review: idx >= GRAMMAR.length
  };
}

function phonicsForDay(day) {
  if (!Number.isInteger(day) || day < 1 || day > PLAN.phonicsEndDay) {
    return [];
  }

  var length = 0;

  for (var i = 0; i < PHONICS.length; i++) {
    if (PHONICS[i].day > length) {
      length = PHONICS[i].day;
    }
  }

  if (length === 0) {
    return [];
  }

  var roundDay = ((day - 1) % length) + 1;
  var result = [];

  for (var j = 0; j < PHONICS.length; j++) {
    if (PHONICS[j].day === roundDay) {
      result.push(PHONICS[j]);
    }
  }

  return result;
}

function renderPhonics() {
  var container = document.getElementById('phonics-list');

  if (container === null) {
    return;
  }

  container.textContent = '';

  if (vocabLocked) {
    return;
  }

  var info = currentPlanInfo();

  if (info.status !== 'active') {
    return;
  }

  if (state.progress.completedDate === todayString()) {
    return;
  }

  var items = phonicsForDay(state.progress.day);

  if (items.length === 0) {
    return;
  }

  appendParagraph(container, '今日音标（第 ' + state.progress.day + ' / ' + PLAN.phonicsEndDay +
    ' 天，共 ' + items.length + ' 个）：');

  for (var i = 0; i < items.length; i++) {
    var item = document.createElement('div');
    item.className = 'phonics-item';

    var symbol = document.createElement('span');
    symbol.className = 'phonics-symbol';
    symbol.textContent = items[i].symbol;
    item.appendChild(symbol);

    var playButton = document.createElement('button');
    playButton.className = 'phonics-play';
    playButton.textContent = '听';
    playButton.addEventListener('click', makePhonemeHandler(items[i]));
    item.appendChild(playButton);

    var actions = document.createElement('span');
    actions.className = 'phonics-actions';

    for (var e = 0; e < items[i].examples.length; e++) {
      var exampleText = items[i].examples[e];
      var button = document.createElement('button');
      button.className = 'speak-btn';
      button.textContent = exampleText;
      button.addEventListener('click', makeSpeakHandler(exampleText));
      actions.appendChild(button);
    }

    item.appendChild(actions);

    if (items[i].audio === null) {
      var note = document.createElement('span');
      note.className = 'phonics-note';
      note.textContent = '（用第一个例词代替）';
      item.appendChild(note);
    }

    container.appendChild(item);
  }
}

function makePhonemeHandler(item) {
  return function () {
    playPhoneme(item);
  };
}

function playPhoneme(item) {
  if (typeof item.audio === 'string' && item.audio !== '') {
    playAudioFile(item.audio);
    return 'audio';
  }

  speakWord(item.examples[0]);
  return 'word';
}

function listeningLessonFor(day) {
  if (!Number.isInteger(day) || day < 1 || day > PLAN.totalDays) {
    return null;
  }

  var index = (day - 1) % LESSONS.length;
  return LESSONS[index];
}

function renderListening() {
  var container = document.getElementById('listening-box');

  if (container === null) {
    return;
  }

  container.textContent = '';

  if (vocabLocked) {
    return;
  }

  var info = currentPlanInfo();

  if (info.status !== 'active') {
    return;
  }

  if (state.progress.completedDate === todayString()) {
    return;
  }

  var lesson = listeningLessonFor(state.progress.day);

  if (lesson === null) {
    return;
  }

  var index = ((state.progress.day - 1) % LESSONS.length) + 1;

  appendParagraph(container, '听力：' + lesson.title);
  appendParagraph(container, '第 ' + index + ' 课，共 ' + LESSONS.length +
    ' 课。建议听两到三遍，听不懂的地方对照“阅读”里的课文。');

  var audio = document.createElement('audio');
  audio.controls = true;
  audio.preload = 'none';
  audio.src = lesson.audioFile;
  container.appendChild(audio);

  appendParagraph(container, '也可以到这些站点听（双语对照、可变速）：');

  var linkList = document.createElement('div');
  linkList.className = 'link-list';

  for (var l = 0; l < LISTENING_LINKS.length; l++) {
    var link = LISTENING_LINKS[l];

    var linkRow = document.createElement('div');
    linkRow.className = 'link-row';

    var anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.name;
    linkRow.appendChild(anchor);

    var linkNote = document.createElement('span');
    linkNote.textContent = '— ' + link.note;
    linkRow.appendChild(linkNote);

    linkList.appendChild(linkRow);
  }

  container.appendChild(linkList);
}

function readingTierFor(day) {
  if (day < 121) {
    return 1;
  }

  if (day < 241) {
    return 2;
  }

  return 3;
}

function readingArticleFor(day) {
  if (!Number.isInteger(day) || day < 1 || day > PLAN.totalDays) {
    return null;
  }

  if (getDayInfoByDay(day).readingToday === false) {
    return null;
  }

  var tier = readingTierFor(day);
  var startDay = tier === 1 ? 61 : (tier === 2 ? 121 : 241);
  var ordinalInTier = Math.floor((day - startDay) / PLAN.readingEvery);
  var tierArticles = [];

  for (var i = 0; i < READINGS.length; i++) {
    if (READINGS[i].tier === tier) {
      tierArticles.push(READINGS[i]);
    }
  }

  if (tierArticles.length === 0) {
    return null;
  }

  return tierArticles[ordinalInTier % tierArticles.length];
}

function renderReading() {
  var container = document.getElementById('reading-box');

  if (container === null) {
    return;
  }

  container.textContent = '';

  if (vocabLocked) {
    return;
  }

  var info = currentPlanInfo();

  if (info.status !== 'active') {
    return;
  }

  if (state.progress.completedDate === todayString()) {
    return;
  }

  var article = readingArticleFor(state.progress.day);

  if (article === null) {
    return;
  }

  appendParagraph(container, '今日阅读：' + article.title);
  appendParagraph(container, '约 ' + countWords(article.text) + ' 词。');

  var paragraphs = article.text.split(/\n{2,}/);

  for (var p = 0; p < paragraphs.length; p++) {
    appendParagraph(container, paragraphs[p]);
  }

  appendParagraph(container, '也可以到这些站点找分级材料读：');

  var linkList = document.createElement('div');
  linkList.className = 'link-list';

  for (var l = 0; l < LISTENING_LINKS.length; l++) {
    var link = LISTENING_LINKS[l];

    var linkRow = document.createElement('div');
    linkRow.className = 'link-row';

    var anchor = document.createElement('a');
    anchor.href = link.url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    anchor.textContent = link.name;
    linkRow.appendChild(anchor);

    var linkNote = document.createElement('span');
    linkNote.textContent = '— ' + link.note;
    linkRow.appendChild(linkNote);

    linkList.appendChild(linkRow);
  }

  container.appendChild(linkList);
}

var READING_QUIZ_MCQ = 3;
var READING_QUIZ_FILL = 2;
var READING_QUIZ_SHORT = 1;

function buildReadingQuizPrompt() {
  var info = currentPlanInfo();

  if (info.status !== 'active') {
    return '';
  }

  var article = readingArticleFor(state.progress.day);

  if (article === null) {
    return '';
  }

  var lines = [];

  lines.push('# 阅读理解出题');
  lines.push('');
  lines.push('## 文章标题');
  lines.push(article.title);
  lines.push('');
  lines.push('## 文章');
  lines.push(article.text);
  lines.push('');
  lines.push('## 要求');
  lines.push('学习者当前在第 ' + info.dayNum + ' 天的学习计划中。请出 ' +
    (READING_QUIZ_MCQ + READING_QUIZ_FILL + READING_QUIZ_SHORT) + ' 道题：' +
    READING_QUIZ_MCQ + ' 道四选一选择题、' + READING_QUIZ_FILL + ' 道填空题、' +
    READING_QUIZ_SHORT + ' 道简答题。');
  lines.push('- 选择题考主旨、细节或词义，每题四个选项，只有一个正确。');
  lines.push('- 填空题从文章里选一句，挖掉一个词或短语，用 ____ 表示；答案必须能在文章中找到。');
  lines.push('- 简答题问一个需要一两句话回答的问题。');
  lines.push('');
  lines.push('## 输出格式');
  lines.push('只输出一个 JSON 对象，不要 Markdown 代码块，不要任何解释文字。字段为 questions，数组，共 6 项。每项为：');
  lines.push('- 选择题：{"type":"mcq","prompt":"题干","options":["选项一","选项二","选项三","选项四"],"answer":"正确选项的原文"}');
  lines.push('- 填空题：{"type":"fill","prompt":"含 ____ 的句子","answer":"被挖掉的词或短语"}');
  lines.push('- 简答题：{"type":"short","prompt":"问题","answer":"参考答案"}');

  return lines.join('\n');
}

function parseReadingQuiz(text) {
  var cleaned = typeof text === 'string' ? text.trim() : '';

  if (cleaned.slice(0, 3) === '```') {
    var firstNewline = cleaned.indexOf('\n');

    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1);
    }

    if (cleaned.slice(-3) === '```') {
      cleaned = cleaned.slice(0, -3);
    }

    cleaned = cleaned.trim();
  }

  var data;

  try {
    data = JSON.parse(cleaned);
  } catch (error) {
    return { ok: false, reason: 'invalidJson' };
  }

  if (!Array.isArray(data.questions)) {
    return { ok: false, reason: 'invalidShape' };
  }

  if (data.questions.length !== 6) {
    return { ok: false, reason: 'invalidCount' };
  }

  var mcqCount = 0;
  var fillCount = 0;
  var shortCount = 0;
  var i;

  for (i = 0; i < data.questions.length; i++) {
    if (!isPlainObject(data.questions[i])) {
      return { ok: false, reason: 'invalidShape' };
    }
  }

  for (i = 0; i < data.questions.length; i++) {
    if (data.questions[i].type === 'mcq') {
      mcqCount += 1;
    } else if (data.questions[i].type === 'fill') {
      fillCount += 1;
    } else if (data.questions[i].type === 'short') {
      shortCount += 1;
    }
  }

  if (mcqCount !== READING_QUIZ_MCQ ||
      fillCount !== READING_QUIZ_FILL ||
      shortCount !== READING_QUIZ_SHORT) {
    return { ok: false, reason: 'invalidCount' };
  }

  for (i = 0; i < data.questions.length; i++) {
    var item = data.questions[i];

    if (typeof item.prompt !== 'string' ||
        item.prompt.trim() === '' ||
        item.prompt.length > 500) {
      return { ok: false, reason: 'invalidShape' };
    }

    if (item.type === 'mcq') {
      var optionsOk = Array.isArray(item.options) &&
        item.options.length === 4 &&
        item.options.every(function (option) {
          return typeof option === 'string';
        });

      if (!optionsOk ||
          typeof item.answer !== 'string' ||
          item.options.indexOf(item.answer) === -1) {
        return { ok: false, reason: 'invalidMcq' };
      }
    } else if (item.type === 'fill') {
      if (item.prompt.indexOf('____') === -1 ||
          typeof item.answer !== 'string' ||
          item.answer.trim() === '') {
        return { ok: false, reason: 'invalidFill' };
      }
    } else if (item.type === 'short') {
      if (typeof item.answer !== 'string' || item.answer.trim() === '') {
        return { ok: false, reason: 'invalidShort' };
      }
    }
  }

  return { ok: true, questions: data.questions };
}

function generateReadingQuiz() {
  var settings = currentAiSettings();
  var key = loadAiKey();

  if (key === '' || settings.model === '') {
    return Promise.resolve({ ok: false, message: '请先在设置页填写 AI 接口。' });
  }

  var prompt = buildReadingQuizPrompt();

  if (prompt === '') {
    return Promise.resolve({ ok: false, message: '今天没有可以出题的阅读文章。' });
  }

  var request = buildAiRequest(prompt);

  return Promise.resolve().then(function () {
    return fetch(request.url, request.options);
  }).then(function (response) {
    if (!response.ok) {
      return response.text().then(function (text) {
        return {
          ok: false,
          message: '出题失败：HTTP ' + response.status + '，' + String(text).slice(0, 200)
        };
      });
    }

    return response.text().then(function (rawText) {
      var bodyText = String(rawText);

      try {
        var extracted = extractAiText(JSON.parse(bodyText), settings.provider);

        if (typeof extracted === 'string' && extracted !== '') {
          bodyText = extracted;
        }
      } catch (error) {
        // 响应不是 JSON 时，直接按原文解析
      }

      var parsed = parseReadingQuiz(bodyText);

      if (parsed.ok) {
        return { ok: true, questions: parsed.questions };
      }

      return {
        ok: false,
        message: '返回内容不符合要求（' + parsed.reason + '），前 200 个字符：' +
          bodyText.slice(0, 200)
      };
    });
  }).catch(function (error) {
    var detail = error && error.message ? error.message : String(error);
    return { ok: false, message: '出题失败：' + detail + '。可能是网络或跨域被拦截。' };
  });
}

function currentVoiceMode() {
  return state.settings.voiceMode === 'builtin' ? 'builtin' : 'audio';
}

function renderVoiceMode() {
  var status = document.getElementById('voice-mode-status');

  if (status === null) {
    return;
  }

  status.textContent = currentVoiceMode() === 'builtin'
    ? '当前发音方式：内置语音（机器音），不需要联网。'
    : '当前发音方式：真人录音，需要联网。';
}

function toggleVoiceMode() {
  var previous = state.settings.voiceMode;
  var next = currentVoiceMode() === 'builtin' ? 'audio' : 'builtin';

  state.settings.voiceMode = next;

  if (saveState() === false) {
    if (previous === undefined) {
      delete state.settings.voiceMode;
    } else {
      state.settings.voiceMode = previous;
    }
    return false;
  }

  if (next === 'builtin') {
    speechState = 'unknown';
    clearFallbackTimer();
  }

  return true;
}

function handleToggleVoiceMode() {
  var message = document.getElementById('voice-mode-msg');

  if (toggleVoiceMode()) {
    message.textContent = '已切换发音方式。';
  } else {
    message.textContent = '保存失败：本地存储不可用，发音方式未改变。';
  }

  renderVoiceMode();
}

function currentAccent() {
  return state.settings.accent === 'uk' ? 'uk' : 'us';
}

function renderAccent() {
  var status = document.getElementById('accent-status');

  if (status === null) {
    return;
  }

  status.textContent = currentAccent() === 'uk'
    ? '当前口音：英式（有道英音，内置语音 en-GB）。'
    : '当前口音：美式（有道美音，内置语音 en-US）。';
}

function toggleAccent() {
  var previous = state.settings.accent;
  var next = currentAccent() === 'uk' ? 'us' : 'uk';

  state.settings.accent = next;

  if (saveState() === false) {
    if (previous === undefined) {
      delete state.settings.accent;
    } else {
      state.settings.accent = previous;
    }
    return false;
  }

  return true;
}

function handleToggleAccent() {
  var message = document.getElementById('accent-msg');

  if (toggleAccent()) {
    message.textContent = '已切换口音。';
  } else {
    message.textContent = '保存失败：本地存储不可用，口音未改变。';
  }

  renderAccent();
}

function buildStudyContextText(extra) {
  var info = currentPlanInfo();
  var lines = [];

  lines.push('# 学习上下文');
  lines.push('');

  if (info.status === 'notStarted') {
    lines.push('- 当前学习日：未开始。');
  } else if (info.status === 'finished') {
    lines.push('- 当前学习日：计划已完成。');
  } else {
    lines.push('- 当前学习日：第 ' + info.dayNum + ' 天 / ' + PLAN.totalDays + '。');
  }

  if (info.status === 'active') {
    lines.push('- 当前阶段：' + info.stage.name + '。');
  }

  var wordKeys = isPlainObject(state.words) ? Object.keys(state.words) : [];
  var learningCount = 0;
  var masteredCount = 0;

  for (var w = 0; w < wordKeys.length; w++) {
    var wordRecord = state.words[wordKeys[w]];

    if (isPlainObject(wordRecord) && wordRecord.status === 'mastered') {
      masteredCount += 1;
    } else if (isPlainObject(wordRecord) && wordRecord.status === 'learning') {
      learningCount += 1;
    }
  }

  lines.push('- 已学词：' + (learningCount + masteredCount) + ' 个（学习中 ' +
    learningCount + '，已掌握 ' + masteredCount + '）。');

  if (info.status === 'active') {
    lines.push('- 今日新词目标：' + info.dailyNew + ' 个。');
    lines.push('- 今日到期复习：' + getDueReviewWords().length + ' 个。');

    var required = requiredDailyChecks(info);
    var taskLabels = [];

    for (var t = 0; t < required.length; t++) {
      taskLabels.push(DAILY_CHECK_LABELS[required[t]]);
    }

    lines.push('- 今日任务：' + (taskLabels.length > 0 ? taskLabels.join('、') : '无') + '。');

    var arranged = 0;

    if (info.dayNum >= PLAN.grammarStartDay) {
      arranged = Math.floor((info.dayNum - PLAN.grammarStartDay) / PLAN.grammarEvery) + 1;
      arranged = Math.min(arranged, GRAMMAR.length);
    }

    if (arranged === 0) {
      lines.push('- 已安排的语法点：暂无。');
    } else {
      lines.push('- 已安排的语法点：' + arranged + ' / ' + GRAMMAR.length +
        ' 条。最近一条是「' + GRAMMAR[arranged - 1].name + '」。');
    }
  }

  var wordById = {};

  for (var k = 0; k < WORDS.length; k++) {
    wordById[WORDS[k].id] = WORDS[k].word;
  }

  var sortedIds = wordKeys.map(Number).filter(function (id) {
    return Number.isFinite(id);
  }).sort(function (a, b) {
    return b - a;
  });

  var recentWords = [];

  for (var r = 0; r < sortedIds.length && r < 20; r++) {
    var wordText = wordById[sortedIds[r]];

    if (typeof wordText === 'string') {
      recentWords.push(sortedIds[r] + '. ' + wordText);
    }
  }

  lines.push('- 最近学过的 20 个词：' + (recentWords.length > 0 ? recentWords.join(', ') : '暂无') + '。');

  var lastTest = null;
  var tests = Array.isArray(state.tests) ? state.tests : [];

  for (var i = 0; i < tests.length; i++) {
    var testRecord = tests[i];

    if (isPlainObject(testRecord) && Number.isInteger(testRecord.day) &&
        (lastTest === null || testRecord.day > lastTest.day)) {
      lastTest = testRecord;
    }
  }

  lines.push(lastTest === null
    ? '- 最近一次检查：暂无。'
    : '- 最近一次检查：第 ' + lastTest.day + ' 天，答对 ' + lastTest.correct +
      ' / ' + lastTest.total + '。');

  var scoreRecords = [];
  var dailyKeys = isPlainObject(state.daily) ? Object.keys(state.daily) : [];

  for (var d = 0; d < dailyKeys.length; d++) {
    var dayNumber = Number(dailyKeys[d]);
    var dailyRecord = state.daily[dailyKeys[d]];

    if (Number.isInteger(dayNumber) &&
        isPlainObject(dailyRecord) &&
        isPlainObject(dailyRecord.writingScores) &&
        typeof dailyRecord.writingScores.band === 'number') {
      scoreRecords.push({ day: dayNumber, band: dailyRecord.writingScores.band });
    }
  }

  scoreRecords.sort(function (a, b) {
    return b.day - a.day;
  });

  var scoreTexts = [];

  for (var s = 0; s < scoreRecords.length && s < 3; s++) {
    scoreTexts.push('第' + scoreRecords[s].day + '天 ' + scoreRecords[s].band);
  }

  lines.push('- 写作分数记录：' + (scoreTexts.length > 0 ? scoreTexts.join('、') : '暂无') + '。');

  if (typeof extra === 'string' && extra.trim() !== '') {
    lines.push('');
    lines.push('## 额外要求');
    lines.push(extra);
  }

  lines.push('');
  lines.push('## 请据此出题');
  lines.push('- 难度与当前学习日相符，词汇尽量取自上面列出的词。');
  lines.push('- 若出的是写作题，请只给题目与字数要求，不要给范文。');

  return lines.join('\n');
}

function handleBuildStudyContext() {
  var output = document.getElementById('study-context-text');
  var message = document.getElementById('study-context-msg');
  var extraInput = document.getElementById('study-context-extra');
  var extra = extraInput === null ? '' : extraInput.value;
  var text = buildStudyContextText(extra);

  if (output !== null) {
    output.value = text;
    output.focus();
    output.setSelectionRange(0, text.length);
  }

  if (message !== null) {
    message.textContent = '已生成，长按文本框全选复制。';
  }
}

var AI_KEY_STORAGE_KEY = 'english3000.ai';
var AI_HTTPS_PREFIX = 'https' + '://';
var AI_PROVIDER_DEFAULTS = {
  anthropic: { host: 'api.anthropic.com', path: '/v1/messages', model: 'claude-sonnet-4-5' },
  'openai-chat': { host: 'api.deepseek.com', path: '/chat/completions', model: 'deepseek-chat' },
  'openai-responses': { host: 'api.openai.com', path: '/v1/responses', model: 'gpt-4o' }
};

function isKnownAiProvider(provider) {
  return provider === 'anthropic' || provider === 'openai-chat' || provider === 'openai-responses';
}

function applyProviderDefaults(provider) {
  var key = isKnownAiProvider(provider) ? provider : 'openai-chat';
  var defaults = AI_PROVIDER_DEFAULTS[key];

  return { baseUrl: AI_HTTPS_PREFIX + defaults.host + defaults.path, model: defaults.model };
}

function currentAiSettings() {
  var ai = isPlainObject(state.settings) ? state.settings.ai : null;
  var provider = isPlainObject(ai) && isKnownAiProvider(ai.provider)
    ? ai.provider
    : 'openai-chat';
  var defaults = applyProviderDefaults(provider);
  var baseUrl = isPlainObject(ai) && typeof ai.baseUrl === 'string' && ai.baseUrl !== ''
    ? ai.baseUrl
    : defaults.baseUrl;
  var model = isPlainObject(ai) && typeof ai.model === 'string' && ai.model !== ''
    ? ai.model
    : defaults.model;

  return { provider: provider, baseUrl: baseUrl, model: model };
}

function loadAiKey() {
  try {
    var text = localStorage.getItem(AI_KEY_STORAGE_KEY);

    if (text === null) {
      return '';
    }

    var data = JSON.parse(text);

    return isPlainObject(data) && typeof data.apiKey === 'string' ? data.apiKey : '';
  } catch (error) {
    return '';
  }
}

function saveAiKey(key) {
  if (typeof key !== 'string') {
    return false;
  }

  try {
    if (key === '') {
      localStorage.removeItem(AI_KEY_STORAGE_KEY);
    } else {
      localStorage.setItem(AI_KEY_STORAGE_KEY, JSON.stringify({ apiKey: key }));
    }

    return true;
  } catch (error) {
    return false;
  }
}

function saveAiSettings(settings) {
  if (!isPlainObject(state.settings)) {
    state.settings = {};
  }

  state.settings.ai = {
    provider: settings.provider,
    baseUrl: settings.baseUrl,
    model: settings.model
  };

  return saveState();
}

function buildAiRequest(prompt) {
  var settings = currentAiSettings();
  var key = loadAiKey();

  if (settings.provider === 'anthropic') {
    return {
      url: settings.baseUrl,
      options: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify({
          model: settings.model,
          max_tokens: 32,
          messages: [{ role: 'user', content: prompt }]
        })
      }
    };
  }

  if (settings.provider === 'openai-responses') {
    return {
      url: settings.baseUrl,
      options: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer ' + key
        },
        body: JSON.stringify({ model: settings.model, input: prompt })
      }
    };
  }

  return {
    url: settings.baseUrl,
    options: {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': 'Bearer ' + key
      },
      body: JSON.stringify({
        model: settings.model,
        messages: [{ role: 'user', content: prompt }]
      })
    }
  };
}

function extractAiText(data, provider) {
  try {
    if (provider === 'anthropic') {
      var anthropicText = data.content[0].text;
      return typeof anthropicText === 'string' ? anthropicText : '';
    }

    if (provider === 'openai-chat') {
      var chatText = data.choices[0].message.content;
      return typeof chatText === 'string' ? chatText : '';
    }

    if (provider === 'openai-responses') {
      if (typeof data.output_text === 'string') {
        return data.output_text;
      }

      var responseText = data.output[0].content[0].text;
      return typeof responseText === 'string' ? responseText : '';
    }

    return '';
  } catch (error) {
    return '';
  }
}

function testAiConnection() {
  var settings = currentAiSettings();
  var key = loadAiKey();

  if (key === '' || settings.model === '') {
    return Promise.resolve({ ok: false, message: '请先填写模型名与密钥。' });
  }

  var request = buildAiRequest('Reply with the word OK.');

  return Promise.resolve().then(function () {
    return fetch(request.url, request.options);
  }).then(function (response) {
    if (response.ok) {
      return { ok: true, message: '连接成功。' };
    }

    return response.text().then(function (text) {
      return {
        ok: false,
        message: '连接失败：HTTP ' + response.status + '，' + String(text).slice(0, 200)
      };
    });
  }).catch(function (error) {
    var detail = error && error.message ? error.message : String(error);
    return { ok: false, message: '连接失败：' + detail + '。可能是网络或跨域被拦截。' };
  });
}

function handleSaveAiSettings() {
  var providerInput = document.getElementById('ai-provider');
  var baseUrlInput = document.getElementById('ai-base-url');
  var modelInput = document.getElementById('ai-model');
  var keyInput = document.getElementById('ai-key');
  var message = document.getElementById('ai-msg');
  var provider = providerInput === null ? 'anthropic' : providerInput.value;
  var baseUrl = baseUrlInput === null ? '' : String(baseUrlInput.value).trim();
  var model = modelInput === null ? '' : String(modelInput.value).trim();
  var key = keyInput === null ? '' : String(keyInput.value);

  if (!isKnownAiProvider(provider)) {
    provider = 'openai-chat';
  }

  if (baseUrl.indexOf(AI_HTTPS_PREFIX) !== 0 || model === '') {
    if (message !== null) {
      message.textContent = '接口地址必须以 ' + AI_HTTPS_PREFIX + ' 开头，且模型名不能为空。';
    }
    return false;
  }

  if (saveAiSettings({ provider: provider, baseUrl: baseUrl, model: model }) === false ||
      saveAiKey(key) === false) {
    if (message !== null) {
      message.textContent = '保存失败：本地存储不可用。';
    }
    return false;
  }

  if (message !== null) {
    message.textContent = '设置已保存。';
  }

  return true;
}

function handleTestAiConnection() {
  var message = document.getElementById('ai-msg');

  if (!handleSaveAiSettings()) {
    return Promise.resolve();
  }

  if (message !== null) {
    message.textContent = '正在测试连接……';
  }

  return testAiConnection().then(function (result) {
    if (message !== null) {
      message.textContent = result.message;
    }
  });
}

function renderAiSettings() {
  var settings = currentAiSettings();
  var providerInput = document.getElementById('ai-provider');
  var baseUrlInput = document.getElementById('ai-base-url');
  var modelInput = document.getElementById('ai-model');
  var keyInput = document.getElementById('ai-key');

  if (providerInput !== null) {
    providerInput.value = settings.provider;
  }

  if (baseUrlInput !== null) {
    baseUrlInput.value = settings.baseUrl;
  }

  if (modelInput !== null) {
    modelInput.value = settings.model;
  }

  if (keyInput !== null) {
    keyInput.value = loadAiKey();
  }
}

function handleAiProviderChange() {
  var providerInput = document.getElementById('ai-provider');
  var baseUrlInput = document.getElementById('ai-base-url');
  var modelInput = document.getElementById('ai-model');
  var defaults = applyProviderDefaults(providerInput === null ? '' : providerInput.value);

  if (baseUrlInput !== null) {
    baseUrlInput.value = defaults.baseUrl;
  }

  if (modelInput !== null) {
    modelInput.value = defaults.model;
  }
}

var AUDIO_URL_PREFIX = 'https://dict.youdao.com/dictvoice?audio=';
var currentAudio = null;

function buildAudioUrl(word) {
  return AUDIO_URL_PREFIX + encodeURIComponent(word) + '&type=' + (currentAccent() === 'uk' ? 1 : 2);
}

function playAudioFile(path) {
  if (typeof window.Audio === 'undefined') {
    return false;
  }

  if (currentAudio !== null) {
    currentAudio.pause();
    currentAudio = null;
  }

  currentAudio = new window.Audio(path);
  var result = currentAudio.play();

  if (result && typeof result.catch === 'function') {
    result.catch(function () {});
  }

  return true;
}

function speakWithAudio(word) {
  return playAudioFile(buildAudioUrl(word));
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
  utterance.lang = currentAccent() === 'uk' ? 'en-GB' : 'en-US';
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
  if (currentVoiceMode() === 'audio' && typeof window.Audio !== 'undefined') {
    clearFallbackTimer();
    stopBuiltinSpeech();
    return speakWithAudio(word) ? 'audio' : 'none';
  }

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
