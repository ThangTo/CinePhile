const test = require('node:test');
const assert = require('node:assert/strict');

const modulePath = require.resolve('./llmUtils');
const originalFetch = global.fetch;

function loadLlmUtilsWithKey(apiKey = 'test-openrouter-key') {
  delete require.cache[modulePath];
  process.env.OPENROUTER_API_KEY = apiKey;
  return require('./llmUtils');
}

test('callOpenRouterWithFallback prefers the models fallback list when provided', async (t) => {
  t.after(() => {
    global.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
    delete require.cache[modulePath];
  });

  const triedModels = [];
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    triedModels.push(body.model);

    if (body.model === 'paid/model') {
      return {
        ok: false,
        status: 402,
        json: async () => ({ error: { message: 'insufficient credits' } }),
      };
    }

    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    };
  };

  const { callOpenRouterWithFallback } = loadLlmUtilsWithKey();

  const result = await callOpenRouterWithFallback({
    model: 'paid/model',
    models: ['paid/model', 'free/model:free'],
    messages: [{ role: 'user', content: 'hello' }],
  });

  assert.deepEqual(triedModels, ['paid/model', 'free/model:free']);
  assert.equal(result.choices[0].message.content, 'ok');
});

test('callOpenRouterWithFallback keeps a single forced model when no models list is provided', async (t) => {
  t.after(() => {
    global.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
    delete require.cache[modulePath];
  });

  const triedModels = [];
  global.fetch = async (_url, options) => {
    const body = JSON.parse(options.body);
    triedModels.push(body.model);
    return {
      ok: true,
      status: 200,
      json: async () => ({ choices: [{ message: { content: 'ok' } }] }),
    };
  };

  const { callOpenRouterWithFallback } = loadLlmUtilsWithKey();

  await callOpenRouterWithFallback({
    model: 'openai/gpt-4o-mini',
    messages: [{ role: 'user', content: 'hello' }],
  });

  assert.deepEqual(triedModels, ['openai/gpt-4o-mini']);
});
