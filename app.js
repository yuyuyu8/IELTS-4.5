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
    });
  }
  showView('today');
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
