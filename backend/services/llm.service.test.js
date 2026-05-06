const test = require('node:test');
const assert = require('node:assert/strict');

const { analyzeScenes } = require('./llm.service');

test('analyzeScenes delegates to the generic viral LLM provider config', async () => {
  const calls = [];
  const clips = await analyzeScenes(
    [
      'WEBVTT',
      '',
      '00:00:10.000 --> 00:00:42.000',
      'A surprising moment happens here.',
    ].join('\n'),
    [10.5, 42],
    {
      chatCompletion: async (payload, options) => {
        calls.push({ payload, options });
        return {
          provider: 'compatible',
          model: 'custom/model',
          durationMs: 123,
          data: {
            choices: [{
              message: {
                content: JSON.stringify({
                  clips: [
                    {
                      start_time: '00:00:10',
                      end_time: '00:00:42',
                      category: 'Twist',
                      reason: 'Strong hook',
                      score: 91,
                    },
                  ],
                }),
              },
            }],
          },
        };
      },
    },
  );

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.scope, 'VIRAL');
  assert.equal(calls[0].options.defaultModel, 'google/gemini-2.0-flash-001');
  assert.equal(calls[0].options.title, 'CinePhine Viral Clip Generator');
  assert.equal(calls[0].payload.model, undefined);
  assert.match(calls[0].payload.messages[1].content, /00:00:10\.000 --> 00:00:42\.000/);
  assert.match(calls[0].payload.messages[1].content, /Visual scene changes/);
  assert.deepEqual(clips, [
    {
      start_time: '00:00:10',
      end_time: '00:00:42',
      category: 'Twist',
      reason: 'Strong hook',
      score: 91,
    },
  ]);
});

test('analyzeScenes accepts fenced JSON and sorts clips by score', async () => {
  const clips = await analyzeScenes('00:00:01.000 --> 00:00:20.000\nLine', [], {
    chatCompletion: async () => ({
      provider: 'openrouter',
      model: 'test-model',
      durationMs: 10,
      data: {
        choices: [{
          message: {
            content: [
              '```json',
              JSON.stringify({
                clips: [
                  { start_time: '00:00:01', end_time: '00:00:20', category: 'Drama', score: 50 },
                  { start_time: '00:01:00', end_time: '00:01:45', category: 'Action', reason: 'Payoff', score: 95 },
                ],
              }),
              '```',
            ].join('\n'),
          },
        }],
      },
    }),
  });

  assert.equal(clips[0].category, 'Action');
  assert.equal(clips[0].reason, 'Payoff');
  assert.equal(clips[1].category, 'Drama');
  assert.equal(clips[1].reason, 'N/A');
});
