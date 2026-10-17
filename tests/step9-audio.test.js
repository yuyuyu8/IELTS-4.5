const test = require('node:test');
const { afterEach } = require('node:test');
const assert = require('node:assert');

const { loadAppScripts, createAudioStub } = require('./helpers.js');

afterEach(function () {
  delete globalThis.Audio;
});

test('buildAudioUrl 拼接单词的发音地址', function () {
  loadAppScripts();
  assert.strictEqual(
    buildAudioUrl('apple'),
    'https://dict.youdao.com/dictvoice?audio=apple&type=2'
  );
});

test('buildAudioUrl 对含空格的短语做 URL 编码', function () {
  loadAppScripts();
  assert.strictEqual(
    buildAudioUrl('make a decision'),
    'https://dict.youdao.com/dictvoice?audio=make%20a%20decision&type=2'
  );
});

test('没有 Audio 支持时返回 false', function () {
  loadAppScripts();
  delete globalThis.Audio;
  assert.strictEqual(speakWithAudio('apple'), false);
});

test('安装 Audio 替身后播放并记录实例', function () {
  loadAppScripts();
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;

  assert.strictEqual(speakWithAudio('apple'), true);
  assert.strictEqual(audio.instances.length, 1);
  assert.strictEqual(audio.instances[0].src, buildAudioUrl('apple'));
  assert.strictEqual(audio.instances[0].playCalls, 1);
});

test('连续播放会先暂停上一条音频', function () {
  loadAppScripts();
  const audio = createAudioStub();
  globalThis.Audio = audio.AudioStub;

  speakWithAudio('apple');
  speakWithAudio('book');

  assert.strictEqual(audio.instances.length, 2);
  assert.strictEqual(audio.instances[0].pauseCalls, 1);
  assert.strictEqual(audio.instances[1].src, buildAudioUrl('book'));
});

test('play 返回被拒绝的 Promise 时不抛出异常', function () {
  loadAppScripts();

  function RejectingAudio(src) {
    this.src = src;
    this.pause = function () {};
    this.play = function () {
      return Promise.reject(new Error('失败'));
    };
  }

  globalThis.Audio = RejectingAudio;

  let result;
  assert.doesNotThrow(function () {
    result = speakWithAudio('apple');
  });
  assert.strictEqual(result, true);
});
