const test = require('node:test');
const assert = require('node:assert/strict');

const movieService = require('../services/movie.service');
const {
  buildDeterministicVoiceToolCalls,
  executeDeterministicVoiceFallback,
} = require('./ai.controller');

function getToolArguments(toolCall) {
  return JSON.parse(toolCall.function.arguments);
}

test('buildDeterministicVoiceToolCalls handles opening a named movie', () => {
  const toolCalls = buildDeterministicVoiceToolCalls('Mở phim Doraemon');

  assert.equal(toolCalls.length, 1);
  assert.equal(toolCalls[0].function.name, 'play_specific_movie');
  assert.deepEqual(getToolArguments(toolCalls[0]), {
    movie_name: 'Doraemon',
  });
});

test('buildDeterministicVoiceToolCalls handles movie search commands', () => {
  const toolCalls = buildDeterministicVoiceToolCalls('Tìm kiếm phim Doraemon');

  assert.equal(toolCalls.length, 1);
  assert.equal(toolCalls[0].function.name, 'navigate');
  assert.deepEqual(getToolArguments(toolCalls[0]), {
    destination: 'SEARCH',
    search_query: 'Doraemon',
  });
});

test('buildDeterministicVoiceToolCalls keeps episode and audio hints for movie open commands', () => {
  const toolCalls = buildDeterministicVoiceToolCalls('Mo tap 10 long tieng phim Doraemon');

  assert.equal(toolCalls.length, 1);
  assert.equal(toolCalls[0].function.name, 'play_specific_movie');
  assert.deepEqual(getToolArguments(toolCalls[0]), {
    movie_name: 'Doraemon',
    episode_number: 10,
    audio_type: 'long-tieng',
  });
});

test('executeDeterministicVoiceFallback opens a matched movie without LLM tool calls', async (t) => {
  const originalSearch = movieService.search;
  movieService.search = async () => ({
    data: [{ id: 'movie-1', name: 'Doraemon' }],
  });

  t.after(() => {
    movieService.search = originalSearch;
  });

  const result = await executeDeterministicVoiceFallback(
    'Mở phim Doraemon',
    { id: 'user-1' },
    { current_path: '/', is_video_playing: false },
  );

  assert.equal(result.commands.length, 1);
  assert.deepEqual(result.commands[0], {
    action: 'VOICE_CMD_NAVIGATE_TO_WATCH',
    payload: { id: 'movie-1' },
  });
  assert.match(result.directReply, /Doraemon/);
});
