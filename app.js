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
