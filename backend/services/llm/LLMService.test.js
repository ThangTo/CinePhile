const test = require('node:test');
const assert = require('node:assert/strict');

const LLMService = require('./LLMService');

test('LLMService.complete returns normalized result on success', async () => {
  const service = new LLMService();
  const transport = {
    post: async (url, body, opts) => ({
      data: {
        choices: [{ message: { content: 'hello', tool_calls: [] } }],
        usage: { prompt_tokens: 5 },
      },
    }),
  };

  const result = await service.complete({
    provider: 'compatible',
    model: 'model-a',
    messages: [{ role: 'user', content: 'hi' }],
    transport,
    env: {
      LLM_PROVIDER: 'compatible',
      LLM_BASE_URL: 'https://api.example.com/v1',
      LLM_API_KEY: 'key',
      LLM_MODEL: 'model-a',
    },
  });

  assert.equal(result.content, 'hello');
  assert.equal(result.provider, 'compatible');
  assert.equal(result.model, 'model-a');
});

test('LLMService.complete tries fallback models on retryable 429', async () => {
  const triedModels = [];
  const service = new LLMService();
  const transport = {
    post: async (url, body) => {
      triedModels.push(body.model);
      if (body.model === 'model-a') {
        const err = new Error('rate limited');
        err.response = { status: 429, data: { error: { message: 'slow' } } };
        throw err;
      }
      return {
        data: { choices: [{ message: { content: 'ok' } }] },
      };
    },
  };

  const result = await service.complete({
    provider: 'compatible',
    model: 'model-a',
    models: ['model-a', 'model-b'],
    messages: [{ role: 'user', content: 'hi' }],
    transport,
    env: {
      LLM_PROVIDER: 'compatible',
      LLM_BASE_URL: 'https://api.example.com/v1',
      LLM_API_KEY: 'key',
    },
  });

  assert.deepEqual(triedModels, ['model-a', 'model-b']);
  assert.equal(result.content, 'ok');
});

test('LLMService.complete does not retry on 401/402/403/404', async () => {
  const triedModels = [];
  const service = new LLMService();
  const transport = {
    post: async (url, body) => {
      triedModels.push(body.model);
      const err = new Error('auth');
      err.response = { status: 402, data: { error: { message: 'pay' } } };
      throw err;
    },
  };

  await assert.rejects(
    () => service.complete({
      provider: 'compatible',
      model: 'model-a',
      models: ['model-a', 'model-b'],
      messages: [{ role: 'user', content: 'hi' }],
      transport,
      env: {
        LLM_PROVIDER: 'compatible',
        LLM_BASE_URL: 'https://api.example.com/v1',
        LLM_API_KEY: 'key',
      },
    }),
    /HTTP 402/,
  );

  assert.deepEqual(triedModels, ['model-a']);
});

test('LLMService.complete with single model makes one attempt', async () => {
  const triedModels = [];
  const service = new LLMService();
  const transport = {
    post: async (url, body) => {
      triedModels.push(body.model);
      return { data: { choices: [{ message: { content: 'done' } }] } };
    },
  };

  const result = await service.complete({
    provider: 'compatible',
    model: 'single-model',
    messages: [{ role: 'user', content: 'hi' }],
    transport,
    env: {
      LLM_PROVIDER: 'compatible',
      LLM_BASE_URL: 'https://api.example.com/v1',
      LLM_API_KEY: 'key',
    },
  });

  assert.deepEqual(triedModels, ['single-model']);
  assert.equal(result.content, 'done');
});

test('LLMService.complete uses scope task defaults', async () => {
  let capturedConfig;
  const service = new LLMService();
  const transport = {
    post: async (url, body, opts) => {
      capturedConfig = { url, body, opts };
      return { data: { choices: [{ message: { content: 'ok' } }] } };
    },
  };

  await service.complete({
    scope: 'VIRAL',
    messages: [{ role: 'user', content: 'analyze' }],
    transport,
    env: {
      OPENROUTER_API_KEY: 'key',
    },
  });

  assert.equal(capturedConfig.url.includes('openrouter.ai'), true);
});

test('LLMService.complete uses env-resolved provider for task model defaults, not caller arg', async () => {
  const calls = [];
  const service = new LLMService();
  const transport = {
    post: async (url, body) => {
      calls.push({ url, body });
      return { data: { choices: [{ message: { content: 'ok' } }] } };
    },
  };

  await service.complete({
    scope: 'MODERATION',
    messages: [{ role: 'user', content: 'test' }],
    transport,
    env: {
      LLM_PROVIDER: 'gemini',
      GEMINI_API_KEY: 'gemini-key',
    },
  });

  assert.equal(calls.length, 1);
  assert.match(calls[0].url, /generativelanguage\.googleapis\.com/);
  assert.match(calls[0].url, /gemini-2\.5-flash/);
});

test('LLMService.complete uses CHATBOT openrouterFallback when provider=openrouter with no scoped model', async () => {
  const triedModels = [];
  const service = new LLMService();
  const transport = {
    post: async (url, body) => {
      triedModels.push(body.model);
      return { data: { choices: [{ message: { content: 'ok' } }] } };
    },
  };

  await service.complete({
    scope: 'CHATBOT',
    messages: [{ role: 'user', content: 'hello' }],
    transport,
    env: {
      OPENROUTER_API_KEY: 'key',
    },
  });

  assert.ok(triedModels.length > 0, 'should try at least one model from openrouterFallback');
  assert.ok(triedModels[0].endsWith(':free'), `first model should be free fallback, got: ${triedModels[0]}`);
});

test('LLMService.complete uses TIMI free fallback when provider=openrouter with no scoped model', async () => {
  const triedModels = [];
  const service = new LLMService();
  const transport = {
    post: async (url, body) => {
      triedModels.push(body.model);
      return { data: { choices: [{ message: { content: 'ok' } }] } };
    },
  };

  await service.complete({
    scope: 'TIMI',
    messages: [{ role: 'user', content: 'hello' }],
    transport,
    env: {
      OPENROUTER_API_KEY: 'key',
    },
  });

  assert.ok(triedModels.length > 0, 'should try at least one model');
  assert.ok(triedModels[0].endsWith(':free'), `TIMI first model should be free fallback, got: ${triedModels[0]}`);
});

test('LLMService.stream emits tokens and retries next model on retryable pre-stream error', async () => {
  const triedModels = [];
  const tokens = [];
  const service = new LLMService();
  const transport = {
    post: async (url, body) => {
      triedModels.push(body.model);
      if (body.model === 'model-a') {
        const err = new Error('rate limited');
        err.response = { status: 429, data: { error: { message: 'slow' } } };
        throw err;
      }
      return {
        data: [
          'data: {"choices":[{"delta":{"content":"ok"}}]}\n\n',
          'data: [DONE]\n\n',
        ],
      };
    },
  };

  const result = await service.stream({
    provider: 'compatible',
    model: 'model-a',
    models: ['model-a', 'model-b'],
    messages: [{ role: 'user', content: 'hi' }],
    transport,
    onToken: (token) => tokens.push(token),
    env: {
      LLM_PROVIDER: 'compatible',
      LLM_BASE_URL: 'https://api.example.com/v1',
      LLM_API_KEY: 'key',
    },
  });

  assert.deepEqual(triedModels, ['model-a', 'model-b']);
  assert.deepEqual(tokens, ['ok']);
  assert.equal(result.content, 'ok');
  assert.equal(result.model, 'model-b');
});

test('LLMService.stream does not retry after partial content was emitted', async () => {
  const triedModels = [];
  const tokens = [];
  const service = new LLMService();
  const transport = {
    post: async (url, body) => {
      triedModels.push(body.model);
      const stream = (async function* () {
        yield 'data: {"choices":[{"delta":{"content":"partial"}}]}\n\n';
        const err = new Error('socket closed');
        err.response = { status: 500, data: { error: { message: 'down' } } };
        throw err;
      })();
      return { data: stream };
    },
  };

  await assert.rejects(
    () => service.stream({
      provider: 'compatible',
      model: 'model-a',
      models: ['model-a', 'model-b'],
      messages: [{ role: 'user', content: 'hi' }],
      transport,
      onToken: (token) => tokens.push(token),
      env: {
        LLM_PROVIDER: 'compatible',
        LLM_BASE_URL: 'https://api.example.com/v1',
        LLM_API_KEY: 'key',
      },
    }),
    /HTTP 500/,
  );

  assert.deepEqual(triedModels, ['model-a']);
  assert.deepEqual(tokens, ['partial']);
});
