const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildChatCompletionUrl,
  buildGeminiGenerateContentUrl,
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

test('buildGeminiGenerateContentUrl targets the selected model', () => {
  assert.equal(
    buildGeminiGenerateContentUrl('https://generativelanguage.googleapis.com/v1beta/', 'gemini-2.5-flash'),
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
  );
  assert.equal(
    buildGeminiGenerateContentUrl('https://generativelanguage.googleapis.com/v1beta/', 'google/gemini-2.0-flash-001'),
    'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent',
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

test('createChatCompletion sends a native Gemini generateContent request', async () => {
  const calls = [];
  const transport = {
    post: async (url, body, options) => {
      calls.push({ url, body, options });
      return {
        data: {
          candidates: [
            {
              content: {
                parts: [{ text: '{"ok":true}' }],
              },
            },
          ],
        },
      };
    },
  };

  const result = await createChatCompletion(
    {
      messages: [
        { role: 'system', content: 'You are concise.' },
        { role: 'user', content: 'hello' },
      ],
      response_format: { type: 'json_object' },
      max_tokens: 32,
      temperature: 0.2,
    },
    {
      env: {
        LLM_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'key',
        LLM_MODEL: 'gemini-2.5-flash',
      },
      transport,
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  assert.equal(calls[0].options.headers['x-goog-api-key'], 'key');
  assert.equal(calls[0].options.headers.Authorization, undefined);
  assert.deepEqual(calls[0].body.systemInstruction, {
    parts: [{ text: 'You are concise.' }],
  });
  assert.deepEqual(calls[0].body.contents, [
    { role: 'user', parts: [{ text: 'hello' }] },
  ]);
  assert.equal(calls[0].body.generationConfig.responseMimeType, 'application/json');
  assert.equal(calls[0].body.generationConfig.maxOutputTokens, 32);
  assert.equal(calls[0].body.generationConfig.temperature, 0.2);
  assert.equal(result.provider, 'gemini');
  assert.equal(result.model, 'gemini-2.5-flash');
  assert.equal(extractChatMessageContent(result.data), '{"ok":true}');
});

test('createChatCompletion maps Gemini function calls to OpenAI-compatible tool calls', async () => {
  const calls = [];
  const transport = {
    post: async (url, body, options) => {
      calls.push({ url, body, options });
      return {
        data: {
          candidates: [
            {
              content: {
                parts: [
                  {
                    functionCall: {
                      name: 'navigate',
                      args: { destination: 'HOME' },
                    },
                  },
                ],
              },
            },
          ],
        },
      };
    },
  };

  const result = await createChatCompletion(
    {
      messages: [{ role: 'user', content: 'home' }],
      tools: [
        {
          type: 'function',
          function: {
            name: 'navigate',
            description: 'Navigate',
            parameters: {
              type: 'object',
              properties: {
                destination: { type: 'string' },
              },
              required: ['destination'],
            },
          },
        },
      ],
      tool_choice: 'auto',
    },
    {
      env: {
        LLM_PROVIDER: 'gemini',
        GEMINI_API_KEY: 'key',
        LLM_MODEL: 'gemini-2.5-flash',
      },
      transport,
    },
  );

  assert.equal(calls[0].body.tools[0].functionDeclarations[0].name, 'navigate');
  assert.equal(calls[0].body.toolConfig.functionCallingConfig.mode, 'AUTO');
  assert.deepEqual(result.data.choices[0].message.tool_calls, [
    {
      id: 'gemini_call_0',
      type: 'function',
      function: {
        name: 'navigate',
        arguments: '{"destination":"HOME"}',
      },
    },
  ]);
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
