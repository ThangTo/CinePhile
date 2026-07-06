const test = require('node:test');
const assert = require('node:assert/strict');

const { resolveChatProviderConfig } = require('./config');

test('resolveChatProviderConfig keeps the OpenRouter viral default without env overrides', () => {
  const config = resolveChatProviderConfig({
    env: {
      OPENROUTER_API_KEY: 'openrouter-key',
      CLIENT_URL: 'https://cinephine.test',
    },
    scope: 'VIRAL',
    defaultModel: 'google/gemini-2.0-flash-001',
    title: 'CinePhine Viral Clip Generator',
  });

  assert.equal(config.provider, 'openrouter');
  assert.equal(config.baseUrl, 'https://openrouter.ai/api/v1');
  assert.equal(config.apiKey, 'openrouter-key');
  assert.equal(config.model, 'google/gemini-2.0-flash-001');
  assert.equal(config.timeoutMs, 60000);
  assert.equal(config.headers['HTTP-Referer'], 'https://cinephine.test');
  assert.equal(config.headers['X-Title'], 'CinePhine Viral Clip Generator');
});

test('resolveChatProviderConfig supports scoped provider/model/base URL overrides', () => {
  const config = resolveChatProviderConfig({
    env: {
      LLM_PROVIDER: 'openrouter',
      LLM_MODEL: 'ignored-global-model',
      LLM_API_KEY: 'global-key',
      VIRAL_LLM_PROVIDER: 'compatible',
      VIRAL_LLM_MODEL: 'custom/viral-model',
      VIRAL_LLM_BASE_URL: 'https://llm.example.com/v1/',
      VIRAL_LLM_API_KEY: 'viral-key',
      VIRAL_LLM_TIMEOUT_MS: '45000',
    },
    scope: 'VIRAL',
    defaultModel: 'default-model',
  });

  assert.equal(config.provider, 'compatible');
  assert.equal(config.baseUrl, 'https://llm.example.com/v1');
  assert.equal(config.apiKey, 'viral-key');
  assert.equal(config.model, 'custom/viral-model');
  assert.equal(config.timeoutMs, 45000);
});

test('resolveChatProviderConfig supports native Gemini provider', () => {
  const config = resolveChatProviderConfig({
    env: {
      LLM_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'gemini-key',
      LLM_MODEL: 'gemini-2.5-flash',
    },
  });

  assert.equal(config.provider, 'gemini');
  assert.equal(config.baseUrl, 'https://generativelanguage.googleapis.com/v1beta');
  assert.equal(config.apiKey, 'gemini-key');
  assert.equal(config.model, 'gemini-2.5-flash');
});

test('resolveChatProviderConfig uses task defaultModel when no env override', () => {
  const config = resolveChatProviderConfig({
    env: {
      OPENROUTER_API_KEY: 'key',
    },
    defaultModel: 'google/gemini-2.0-flash-001',
  });

  assert.equal(config.model, 'google/gemini-2.0-flash-001');
});

test('resolveChatProviderConfig throws when no API key', () => {
  assert.throws(
    () => resolveChatProviderConfig({ env: {} }),
    /API key is not configured/,
  );
});

test('resolveChatProviderConfig throws when no model', () => {
  assert.throws(
    () => resolveChatProviderConfig({
      env: { OPENROUTER_API_KEY: 'key' },
    }),
    /model is not configured/,
  );
});
