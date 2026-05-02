const test = require('node:test');
const assert = require('node:assert/strict');

const { isRetryableWhisperError } = require('./whisper.service');

test('isRetryableWhisperError treats timeout and transient HTTP failures as retryable', () => {
  assert.equal(
    isRetryableWhisperError(new Error('local Whisper failed with ECONNABORTED: timeout exceeded')),
    true,
  );
  assert.equal(isRetryableWhisperError(new Error('remote Whisper returned HTTP 503')), true);
  assert.equal(isRetryableWhisperError(new Error('socket hang up')), true);
});

test('isRetryableWhisperError does not retry auth or billing failures', () => {
  assert.equal(isRetryableWhisperError(new Error('remote Whisper returned HTTP 401')), false);
  assert.equal(isRetryableWhisperError(new Error('remote Whisper returned HTTP 402')), false);
});
