const test = require('node:test');
const assert = require('node:assert/strict');

const modulePath = require.resolve('./llmUtils');

function loadLlmUtilsWithKey(apiKey = 'test-openrouter-key') {
  delete require.cache[modulePath];
  process.env.OPENROUTER_API_KEY = apiKey;
  return require('./llmUtils');
}

test('callLlmWithFallback prefers the models fallback list when provided', async (t) => {
  t.after(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete require.cache[modulePath];
  });

  const triedModels = [];
  const transport = {
    post: async (_url, body) => {
    triedModels.push(body.model);

    if (body.model === 'paid/model') {
      const error = new Error('insufficient credits');
      error.response = { status: 429, data: { error: { message: 'insufficient credits' } } };
      throw error;
    }

    return {
      data: { choices: [{ message: { content: 'ok' } }] },
    };
    },
  };

  const { callLlmWithFallback } = loadLlmUtilsWithKey();

  const result = await callLlmWithFallback({
    model: 'paid/model',
    models: ['paid/model', 'free/model:free'],
    messages: [{ role: 'user', content: 'hello' }],
    transport,
  });

  assert.deepEqual(triedModels, ['paid/model', 'free/model:free']);
  assert.equal(result.choices[0].message.content, 'ok');
});

test('callLlmWithFallback keeps a single forced model when no models list is provided', async (t) => {
  t.after(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete require.cache[modulePath];
  });

  const triedModels = [];
  const transport = {
    post: async (_url, body) => {
    triedModels.push(body.model);
    return {
      data: { choices: [{ message: { content: 'ok' } }] },
    };
    },
  };

  const { callLlmWithFallback } = loadLlmUtilsWithKey();

  await callLlmWithFallback({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: 'hello' }],
    transport,
  });

  assert.deepEqual(triedModels, ['openai/gpt-4o-mini']);
});

test('callLlmWithFallback can route through native Gemini provider', async (t) => {
  t.after(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.GEMINI_API_KEY;
    delete require.cache[modulePath];
  });

  process.env.GEMINI_API_KEY = 'gemini-key';
  const calls = [];
  const transport = {
    post: async (url, body, options) => {
      calls.push({ url, body, options });
      return {
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: 'gemini ok' }],
              },
            },
          ],
        },
      };
    },
  };

  const { callLlmWithFallback } = loadLlmUtilsWithKey('');

  const result = await callLlmWithFallback({
    provider: 'gemini',
    model: 'gemini-2.5-flash',
    messages: [{ role: 'user', content: 'hello' }],
    transport,
  });

  assert.equal(calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'gemini-key');
  assert.equal(result.choices[0].message.content, 'gemini ok');
});

test('callLlmWithFallback honors scoped env model before default OpenRouter fallbacks', async (t) => {
  t.after(() => {
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.CHATBOT_LLM_MODEL;
    delete require.cache[modulePath];
  });

  process.env.CHATBOT_LLM_MODEL = 'configured/chat-model';
  const triedModels = [];
  const transport = {
    post: async (_url, body) => {
      triedModels.push(body.model);
      return {
        data: { choices: [{ message: { content: 'ok' } }] },
      };
    },
  };

  const { callLlmWithFallback, callOpenRouterWithFallback } = loadLlmUtilsWithKey();

  assert.equal(callOpenRouterWithFallback, callLlmWithFallback);

  await callLlmWithFallback({
    scope: 'CHATBOT',
    messages: [{ role: 'user', content: 'hello' }],
    transport,
  });

  assert.deepEqual(triedModels, ['configured/chat-model']);
});
