const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildChatCompletionUrl,
  createChatCompletion,
  extractChatMessageContent,
  formatLlmError,
  parseModelList,
  resolveChatProviderConfig,
} = require('./llmProvider.service');

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

test('buildChatCompletionUrl joins base URL and endpoint path safely', () => {
  assert.equal(
    buildChatCompletionUrl('https://api.example.com/v1/', '/chat/completions'),
    'https://api.example.com/v1/chat/completions',
  );
  assert.equal(
    buildChatCompletionUrl('https://api.example.com/v1', 'chat/completions'),
    'https://api.example.com/v1/chat/completions',
  );
});

test('parseModelList trims comma separated model names', () => {
  assert.deepEqual(parseModelList(' a, b ,, c '), ['a', 'b', 'c']);
  assert.deepEqual(parseModelList(['x', ' ', 'y']), ['x', 'y']);
});

test('createChatCompletion sends an OpenAI-compatible chat completion request', async () => {
  const calls = [];
  const transport = {
    post: async (url, body, options) => {
      calls.push({ url, body, options });
      return {
        data: {
          choices: [{ message: { content: '{"clips":[]}' } }],
        },
      };
    },
  };

  const result = await createChatCompletion(
    {
      messages: [{ role: 'user', content: 'hello' }],
      response_format: { type: 'json_object' },
    },
    {
      env: {
        LLM_PROVIDER: 'compatible',
        LLM_BASE_URL: 'https://llm.example.com/v1',
        LLM_API_KEY: 'key',
        LLM_MODEL: 'model-a',
      },
      transport,
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://llm.example.com/v1/chat/completions');
  assert.equal(calls[0].body.model, 'model-a');
  assert.deepEqual(calls[0].body.messages, [{ role: 'user', content: 'hello' }]);
  assert.equal(calls[0].options.headers.Authorization, 'Bearer key');
  assert.equal(result.model, 'model-a');
  assert.equal(extractChatMessageContent(result.data), '{"clips":[]}');
});

test('createChatCompletion tries fallback models on retryable errors', async () => {
  const triedModels = [];
  const transport = {
    post: async (_url, body) => {
      triedModels.push(body.model);
      if (body.model === 'model-a') {
        const error = new Error('rate limited');
        error.response = { status: 429, data: { error: { message: 'slow down' } } };
        throw error;
      }

      return {
        data: {
          choices: [{ message: { content: 'ok' } }],
        },
      };
    },
  };

  const result = await createChatCompletion(
    { messages: [{ role: 'user', content: 'hello' }] },
    {
      env: {
        LLM_PROVIDER: 'compatible',
        LLM_BASE_URL: 'https://llm.example.com/v1',
        LLM_API_KEY: 'key',
        LLM_MODEL: 'model-a',
        LLM_FALLBACK_MODELS: 'model-b',
      },
      transport,
    },
  );

  assert.deepEqual(triedModels, ['model-a', 'model-b']);
  assert.equal(result.model, 'model-b');
});

test('createChatCompletion does not retry billing or auth errors', async () => {
  const triedModels = [];
  const transport = {
    post: async (_url, body) => {
      triedModels.push(body.model);
      const error = new Error('payment required');
      error.response = { status: 402, data: { error: { message: 'insufficient credits' } } };
      throw error;
    },
  };

  await assert.rejects(
    () => createChatCompletion(
      { messages: [{ role: 'user', content: 'hello' }] },
      {
        env: {
          LLM_PROVIDER: 'compatible',
          LLM_BASE_URL: 'https://llm.example.com/v1',
          LLM_API_KEY: 'key',
          LLM_MODEL: 'model-a',
          LLM_FALLBACK_MODELS: 'model-b',
        },
        transport,
      },
    ),
    /HTTP 402/,
  );

  assert.deepEqual(triedModels, ['model-a']);
});

test('formatLlmError includes provider, model, and HTTP details', () => {
  const message = formatLlmError(
    {
      response: {
        status: 500,
        data: { error: { message: 'server exploded' } },
      },
    },
    { provider: 'compatible', model: 'model-a' },
  );

  assert.match(message, /compatible/);
  assert.match(message, /model-a/);
  assert.match(message, /HTTP 500/);
  assert.match(message, /server exploded/);
});
