const test = require('node:test');
const assert = require('node:assert/strict');

const {
  formatWhisperError,
  getLanguageCacheKey,
  normalizeRemoteWhisperUrl,
  normalizeTranscriptionLanguage,
} = require('./whisperClient.service');

test('normalizeRemoteWhisperUrl accepts http and https URLs and trims trailing slashes', () => {
  assert.equal(
    normalizeRemoteWhisperUrl(' https://example.ngrok-free.app/// '),
    'https://example.ngrok-free.app',
  );
  assert.equal(normalizeRemoteWhisperUrl('http://localhost:7860/'), 'http://localhost:7860');
});

test('normalizeRemoteWhisperUrl rejects unsupported protocols', () => {
  assert.throws(() => normalizeRemoteWhisperUrl('file:///etc/passwd'), /http or https/);
  assert.throws(() => normalizeRemoteWhisperUrl('not a url'), /Invalid Whisper URL/);
});

test('normalizeTranscriptionLanguage supports auto detection and explicit language codes', () => {
  assert.equal(normalizeTranscriptionLanguage('auto'), null);
  assert.equal(normalizeTranscriptionLanguage('source'), null);
  assert.equal(normalizeTranscriptionLanguage('ko'), 'ko');
  assert.equal(normalizeTranscriptionLanguage('pt-BR'), 'pt-BR');
});

test('getLanguageCacheKey stores automatic transcription under auto', () => {
  assert.equal(getLanguageCacheKey('auto'), 'auto');
  assert.equal(getLanguageCacheKey(''), 'auto');
  assert.equal(getLanguageCacheKey('ja'), 'ja');
});

test('formatWhisperError includes provider, endpoint, and useful HTTP details', () => {
  const message = formatWhisperError(
    {
      response: {
        status: 500,
        data: { detail: 'CUDA out of memory' },
      },
    },
    { type: 'local', baseUrl: 'http://localhost:8000' },
    '/v1/audio/transcriptions',
  );

  assert.match(message, /local Whisper/);
  assert.match(message, /\/v1\/audio\/transcriptions/);
  assert.match(message, /HTTP 500/);
  assert.match(message, /CUDA out of memory/);
});
