const test = require('node:test');
const assert = require('node:assert/strict');

const GeminiProvider = require('./gemini.provider');

test('Gemini provider builds generateContent URL', () => {
  const provider = new GeminiProvider();
  const url = provider.buildUrl(
    { baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
    'gemini-2.5-flash',
  );
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
});

test('Gemini provider strips google/ prefix from model', () => {
  const provider = new GeminiProvider();
  const url = provider.buildUrl(
    { baseUrl: 'https://generativelanguage.googleapis.com/v1beta' },
    'google/gemini-2.0-flash-001',
  );
  assert.equal(url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent');
});

test('Gemini provider uses x-goog-api-key header', () => {
  const provider = new GeminiProvider();
  const headers = provider.buildHeaders({ apiKey: 'gemini-key' });
  assert.equal(headers['x-goog-api-key'], 'gemini-key');
  assert.equal(headers.Authorization, undefined);
});

test('Gemini provider builds body with system instruction and contents', () => {
  const provider = new GeminiProvider();
  const body = provider.buildBody({
    messages: [
      { role: 'system', content: 'Be concise.' },
      { role: 'user', content: 'hello' },
    ],
  }, 'gemini-2.5-flash');

  assert.deepEqual(body.systemInstruction, { parts: [{ text: 'Be concise.' }] });
  assert.deepEqual(body.contents, [{ role: 'user', parts: [{ text: 'hello' }] }]);
});

test('Gemini provider builds generation config for json_object response_format', () => {
  const provider = new GeminiProvider();
  const body = provider.buildBody({
    messages: [{ role: 'user', content: 'hi' }],
    response_format: { type: 'json_object' },
    temperature: 0.2,
    max_tokens: 32,
  }, 'gemini-2.5-flash');

  assert.equal(body.generationConfig.responseMimeType, 'application/json');
  assert.equal(body.generationConfig.temperature, 0.2);
  assert.equal(body.generationConfig.maxOutputTokens, 32);
});

test('Gemini provider maps tools and tool_choice', () => {
  const provider = new GeminiProvider();
  const body = provider.buildBody({
    messages: [{ role: 'user', content: 'go home' }],
    tools: [{
      type: 'function',
      function: {
        name: 'navigate',
        description: 'Navigate',
        parameters: { type: 'object', properties: { destination: { type: 'string' } } },
      },
    }],
    tool_choice: 'auto',
  }, 'gemini-2.5-flash');

  assert.equal(body.tools[0].functionDeclarations[0].name, 'navigate');
  assert.equal(body.toolConfig.functionCallingConfig.mode, 'AUTO');
});

test('Gemini provider parses response with text content', () => {
  const provider = new GeminiProvider();
  const result = provider.parseResponse({
    candidates: [{ content: { parts: [{ text: 'hello' }] } }],
    usageMetadata: { promptTokenCount: 5 },
  });
  assert.equal(result.content, 'hello');
  assert.deepEqual(result.toolCalls, []);
  assert.equal(result.usage.promptTokenCount, 5);
});

test('Gemini provider maps functionCall to OpenAI-compatible tool_calls', () => {
  const provider = new GeminiProvider();
  const result = provider.parseResponse({
    candidates: [{
      content: {
        parts: [{
          functionCall: { name: 'navigate', args: { destination: 'HOME' } },
        }],
      },
    }],
  });

  assert.deepEqual(result.toolCalls, [{
    id: 'gemini_call_0',
    type: 'function',
    function: {
      name: 'navigate',
      arguments: '{"destination":"HOME"}',
    },
  }]);
});

test('chat() calls transport.post with Gemini URL and headers', async () => {
  const provider = new GeminiProvider();
  const calls = [];
  const transport = {
    post: async (url, body, opts) => {
      calls.push({ url, body, opts });
      return {
        data: {
          candidates: [{ content: { parts: [{ text: 'ok' }] } }],
        },
      };
    },
  };

  const result = await provider.chat({
    payload: { messages: [{ role: 'user', content: 'hi' }] },
    config: { baseUrl: 'https://generativelanguage.googleapis.com/v1beta', apiKey: 'k', timeoutMs: 5000, headers: {} },
    model: 'gemini-2.5-flash',
    transport,
  });

  assert.equal(calls[0].url, 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
  assert.equal(calls[0].opts.headers['x-goog-api-key'], 'k');
  assert.equal(result.content, 'ok');
  assert.equal(result.provider, 'gemini');
});
