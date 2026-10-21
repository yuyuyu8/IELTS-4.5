const fs = require('fs');
const path = require('path');
const vm = require('vm');

const dataPath = path.join(__dirname, '..', 'data.js');
const backupPath = 'E:\\Claude Code Desktop\\tmp\\data.js.before';
const marker = 'window.WORDS = [';

function normalizePhonetic(value) {
  return String(value)
    .replace(/'/g, 'ˈ')
    .replace(/:/g, 'ː')
    .replace(/əu/g, 'əʊ');
}

function findSectionEnd(text, openBracketIndex) {
  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = openBracketIndex; i < text.length; i += 1) {
    const char = text[i];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (char === '\\') {
        escaped = true;
      } else if (char === '"') {
        inString = false;
      }
      continue;
    }

    if (char === '"') {
      inString = true;
    } else if (char === '[') {
      depth += 1;
    } else if (char === ']') {
      depth -= 1;

      if (depth === 0) {
        let next = i + 1;

        while (next < text.length && /\s/.test(text[next])) {
          next += 1;
        }

        if (text[next] !== ';') {
          throw new Error('window.WORDS 区段结尾不是分号');
        }

        return next + 1;
      }
    }
  }

  throw new Error('找不到 window.WORDS 区段的结尾');
}

function buildWordsSection(words) {
  const lines = words.map(function (word) {
    return '  {"id":' + word.id +
      ',"word":' + JSON.stringify(word.word) +
      ',"pos":' + JSON.stringify(word.pos) +
      ',"category":' + JSON.stringify(word.category) +
      ',"meaning":' + JSON.stringify(word.meaning) +
      ',"phonetic":' + JSON.stringify(normalizePhonetic(word.phonetic)) +
      ',"example":' + JSON.stringify(word.example) + '}';
  });

  const body = lines.map(function (line, index) {
    return line + (index < lines.length - 1 ? ',' : '');
  }).join('\n');

  return marker + '\n' + body + '\n];';
}

function loadWindow(text) {
  const sandbox = { window: {} };
  vm.runInNewContext(text, sandbox, { filename: 'data.js' });
  return sandbox.window;
}

const original = fs.readFileSync(dataPath, 'utf8');
const start = original.indexOf(marker);

if (start === -1) {
  console.error('data.js 中找不到 window.WORDS');
  process.exit(1);
}

const end = findSectionEnd(original, start + marker.length - 1);
const windowObject = loadWindow(original);
const words = windowObject.WORDS;

if (!Array.isArray(words) || words.length !== 3000) {
  console.error('原词表不是 3000 条，停止');
  process.exit(1);
}

fs.mkdirSync(path.dirname(backupPath), { recursive: true });
fs.copyFileSync(dataPath, backupPath);

let apostropheWords = 0;
let colonWords = 0;
let schwaWords = 0;
let changedWords = 0;

words.forEach(function (word) {
  const phonetic = String(word.phonetic || '');
  let changed = false;

  if (phonetic.indexOf("'") !== -1) {
    apostropheWords += 1;
    changed = true;
  }

  if (phonetic.indexOf(':') !== -1) {
    colonWords += 1;
    changed = true;
  }

  if (phonetic.indexOf('əu') !== -1) {
    schwaWords += 1;
    changed = true;
  }

  if (changed) {
    changedWords += 1;
  }
});

const newSection = buildWordsSection(words);
const rewritten = original.slice(0, start) + newSection + original.slice(end);

try {
  const newWindow = loadWindow(rewritten);
  const newWords = newWindow.WORDS;

  if (!Array.isArray(newWords) || newWords.length !== 3000) {
    throw new Error('新词表长度不是 3000');
  }

  const fields = ['id', 'word', 'pos', 'category', 'meaning', 'example'];

  for (let i = 0; i < words.length; i += 1) {
    for (const field of fields) {
      if (newWords[i][field] !== words[i][field]) {
        throw new Error('第 ' + (i + 1) + ' 条的 ' + field + ' 被改动');
      }
    }

    if (newWords[i].phonetic !== normalizePhonetic(words[i].phonetic)) {
      throw new Error('第 ' + (i + 1) + ' 条的音标改动不符合规则');
    }

    if (newWords[i].phonetic.indexOf("'") !== -1) {
      throw new Error('第 ' + (i + 1) + ' 条仍含 ASCII 撇号');
    }

    if (newWords[i].phonetic.indexOf('əu') !== -1) {
      throw new Error('第 ' + (i + 1) + ' 条仍含 əu');
    }
  }

  const newStart = rewritten.indexOf(marker);
  const newEnd = findSectionEnd(rewritten, newStart + marker.length - 1);
  const oldOutside = original.slice(0, start) + original.slice(end);
  const newOutside = rewritten.slice(0, newStart) + rewritten.slice(newEnd);

  if (oldOutside !== newOutside) {
    throw new Error('window.WORDS 之外的区段发生了变化');
  }

  fs.writeFileSync(dataPath, rewritten, 'utf8');

  const beforeLines = original.split('\n').length;
  const afterLines = rewritten.split('\n').length;

  console.log('音标规范化完成');
  console.log('  ASCII 撇号 \' → ˈ：' + apostropheWords + ' 条');
  console.log('  冒号 : → ː：' + colonWords + ' 条');
  console.log('  əu → əʊ：' + schwaWords + ' 条');
  console.log('  受影响总条数：' + changedWords + ' 条');
  console.log('  data.js 行数：' + beforeLines + ' → ' + afterLines);
  console.log('  备份：' + backupPath);
  console.log('已写入 data.js');
} catch (error) {
  fs.copyFileSync(backupPath, dataPath);
  console.error('校验失败，已恢复备份：' + error.message);
  process.exit(1);
}
