const test = require('node:test');
const { afterEach } = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, createAudioStub, installSpeech } = require('./helpers.js');

function wait(ms) {
  return new Promise(function (resolve) {
    setTimeout(resolve, ms);
  });
}

afterEach(function () {
  if (globalThis.speechFallbackTimer !== null) {
    clearTimeout(globalThis.speechFallbackTimer);
  }
  globalThis.speechFallbackTimer = null;
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
  delete globalThis.Audio;
});

test('没有内置语音时改用外部音频', function () {
  loadAppScripts();
  delete globalThis.speechSynthesis;
  delete globalThis.SpeechSynthesisUtterance;
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;

  assert.strictEqual(speakWord('apple'), 'audio');
  assert.strictEqual(speechState, 'unavailable');
  assert.strictEqual(audio.instances[0].src, buildAudioUrl('apple'));
});

test('内置语音可用时朗读单词', function () {
  loadAppScripts();
  const speech = installSpeech();

  assert.strictEqual(speakWord('apple'), 'builtin');
  assert.strictEqual(speech.spoken.length, 1);
  assert.strictEqual(speech.spoken[0].text, 'apple');
  assert.strictEqual(speech.spoken[0].lang, 'en-US');
  assert.strictEqual(speech.spoken[0].rate, 0.9);
});

test('收到开始事件后标记为可用', function () {
  loadAppScripts();
  const speech = installSpeech();

  speakWord('apple');
  speech.spoken[0].onstart();
  assert.strictEqual(speechState, 'ok');

  assert.strictEqual(speakWord('book'), 'builtin');
  assert.strictEqual(speech.spoken.length, 2);
});

test('致命错误后改用外部音频', function () {
  loadAppScripts();
  const speech = installSpeech();
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;

  speakWord('apple');
  speech.spoken[0].onerror({ error: 'synthesis-failed' });
  assert.strictEqual(speechState, 'unavailable');

  assert.strictEqual(speakWord('book'), 'audio');
  assert.strictEqual(audio.instances[0].src, buildAudioUrl('book'));
  assert.strictEqual(speech.spoken.length, 1);
});

test('良性错误不改变状态', function () {
  loadAppScripts();
  const speech = installSpeech();

  speakWord('apple');

  speech.spoken[0].onerror({ error: 'canceled' });
  assert.strictEqual(speechState, 'unknown');

  speech.spoken[0].onerror({ error: 'interrupted' });
  assert.strictEqual(speechState, 'unknown');
});

test('开始新朗读前摘掉上一条的回调', function () {
  loadAppScripts();
  const speech = installSpeech();

  speakWord('apple');
  speakWord('book');

  assert.strictEqual(speech.spoken[0].onstart, null);
  assert.strictEqual(speech.spoken[0].onend, null);
  assert.strictEqual(speech.spoken[0].onerror, null);
});

test('speak 抛异常时当次就改用外部音频', function () {
  loadAppScripts();
  const speech = installSpeech();
  speech.stub.speak = function () {
    throw new Error('失败');
  };
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;

  assert.strictEqual(speakWord('apple'), 'audio');
  assert.strictEqual(speechState, 'unavailable');
  assert.strictEqual(audio.instances[0].src, buildAudioUrl('apple'));
});

test('超时且引擎未朗读时判定为不可用', async function () {
  loadAppScripts();
  const speech = installSpeech();
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;
  SPEECH_TIMEOUT_MS = 1;

  assert.strictEqual(speakWord('apple'), 'builtin');
  await wait(40);

  assert.strictEqual(speechState, 'unavailable');
  assert.strictEqual(audio.instances.length, 0);

  assert.strictEqual(speakWord('book'), 'audio');
  assert.strictEqual(audio.instances[0].src, buildAudioUrl('book'));
});

test('超时但引擎仍在朗读时判定为可用', async function () {
  loadAppScripts();
  const speech = installSpeech();
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;
  speech.stub.speak = function (utterance) {
    speech.spoken.push(utterance);
    speech.stub.speaking = true;
  };
  SPEECH_TIMEOUT_MS = 1;

  speakWord('apple');
  await wait(40);

  assert.strictEqual(speechState, 'ok');
  assert.strictEqual(audio.instances.length, 0);
});

test('立即收到开始事件时不新建超时计时器', async function () {
  loadAppScripts();
  const speech = installSpeech();
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;
  speech.stub.speak = function (utterance) {
    speech.spoken.push(utterance);
    utterance.onstart();
  };
  SPEECH_TIMEOUT_MS = 1;

  speakWord('apple');
  await wait(40);

  assert.strictEqual(speechState, 'ok');
  assert.strictEqual(audio.instances.length, 0);
  assert.strictEqual(speechFallbackTimer, null);
});
