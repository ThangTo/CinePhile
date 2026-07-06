const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createLlmError,
  isRetryableLlmError,
  isRateLimitError,
  formatLlmError,
  extractProviderErrorMessage,
} = require('./errors');

test('createLlmError wraps error with provider, model, status, isRetryable', () => {
  const httpError = new Error('request failed');
  httpError.response = { status: 429, data: { error: { message: 'slow down' } } };

  const wrapped = createLlmError(httpError, { provider: 'openrouter', model: 'gpt-4o' });

  assert.equal(wrapped.provider, 'openrouter');
  assert.equal(wrapped.model, 'gpt-4o');
  assert.equal(wrapped.status, 429);
  assert.equal(wrapped.isRetryable, true);
  assert.match(wrapped.message, /openrouter/);
  assert.match(wrapped.message, /gpt-4o/);
  assert.match(wrapped.message, /HTTP 429/);
});

test('isRetryableLlmError returns false for 401/402/403/404', () => {
  for (const status of [401, 402, 403, 404]) {
    const err = new Error('fail');
    err.response = { status };
    assert.equal(isRetryableLlmError(err), false, `status ${status} should not be retryable`);
  }
});

test('isRetryableLlmError returns true for 429 and 5xx', () => {
  for (const status of [429, 500, 502, 503]) {
    const err = new Error('fail');
    err.response = { status };
    assert.equal(isRetryableLlmError(err), true, `status ${status} should be retryable`);
  }
});

test('isRateLimitError detects rate limit errors', () => {
  const err429 = new Error('rate limit exceeded');
  assert.equal(isRateLimitError(err429), true);

  const errQuota = new Error('quota exceeded');
  assert.equal(isRateLimitError(errQuota), true);

  const errStatus = new Error('fail');
  errStatus.status = 429;
  assert.equal(isRateLimitError(errStatus), true);

  const errNormal = new Error('bad request');
  assert.equal(isRateLimitError(errNormal), false);
});

test('formatLlmError includes provider, model, and HTTP details', () => {
  const message = formatLlmError(
    { response: { status: 500, data: { error: { message: 'server exploded' } } } },
    { provider: 'compatible', model: 'model-a' },
  );
  assert.match(message, /compatible/);
  assert.match(message, /model-a/);
  assert.match(message, /HTTP 500/);
  assert.match(message, /server exploded/);
});

test('formatLlmError handles timeout', () => {
  const err = new Error('timeout');
  err.code = 'ECONNABORTED';
  const message = formatLlmError(err, { provider: 'openai', model: 'gpt-4o' });
  assert.match(message, /timed out/);
});

test('extractProviderErrorMessage extracts nested error message', () => {
  assert.equal(extractProviderErrorMessage(null), '');
  assert.equal(extractProviderErrorMessage('simple string'), 'simple string');
  assert.equal(extractProviderErrorMessage({ error: { message: 'nested' } }), 'nested');
  assert.equal(extractProviderErrorMessage({ message: 'direct' }), 'direct');
});
