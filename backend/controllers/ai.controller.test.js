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
  const toolCalls = buildDeterministicVoiceToolCalls('Timi hãy mở phim Doraemon');

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

test('buildDeterministicVoiceToolCalls covers player controls', () => {
  const cases = [
    ['Dừng phim', 'control_player', { action: 'PAUSE' }],
    ['Phát tiếp', 'control_player', { action: 'PLAY' }],
    ['Tập tiếp theo', 'control_player', { action: 'NEXT_EPISODE' }],
    ['Quay lại tập trước', 'control_player', { action: 'PREV_EPISODE' }],
    ['Chuyển tập 10', 'control_player', { action: 'CHANGE_EPISODE', episode_number: 10 }],
    ['Đổi sang lồng tiếng', 'control_player', { action: 'CHANGE_AUDIO', audio_type: 'long-tieng' }],
    ['Tăng âm lượng', 'control_player', { action: 'VOLUME_UP' }],
    ['Giảm âm lượng', 'control_player', { action: 'VOLUME_DOWN' }],
    ['Âm lượng tối đa', 'control_player', { action: 'MAX_VOLUME' }],
    ['Tắt tiếng', 'control_player', { action: 'MUTE' }],
    ['Bật tiếng', 'control_player', { action: 'UNMUTE' }],
    ['Toàn màn hình', 'control_player', { action: 'FULLSCREEN' }],
  ];

  for (const [transcript, toolName, expectedArgs] of cases) {
    const toolCalls = buildDeterministicVoiceToolCalls(transcript);
    assert.equal(toolCalls.length, 1, transcript);
    assert.equal(toolCalls[0].function.name, toolName, transcript);
    assert.deepEqual(getToolArguments(toolCalls[0]), expectedArgs, transcript);
  }
});

test('buildDeterministicVoiceToolCalls covers seek commands', () => {
  const cases = [
    ['Tua tới giữa phim', { position: 'MIDDLE' }],
    ['Tua đến cuối phim', { position: 'END' }],
    ['Về đầu phim', { position: 'BEGINNING' }],
    ['Tua lùi 30 giây', { seconds: -30 }],
    ['Tua tới 2 phút', { seconds: 120 }],
  ];

  for (const [transcript, expectedArgs] of cases) {
    const toolCalls = buildDeterministicVoiceToolCalls(transcript);
    assert.equal(toolCalls.length, 1, transcript);
    assert.equal(toolCalls[0].function.name, 'seek_video', transcript);
    assert.deepEqual(getToolArguments(toolCalls[0]), expectedArgs, transcript);
  }
});

test('buildDeterministicVoiceToolCalls covers navigation and scroll commands', () => {
  const cases = [
    ['Về trang chủ', 'navigate', { destination: 'HOME' }],
    ['Mở tài khoản', 'navigate', { destination: 'PROFILE' }],
    ['Mở trang tìm kiếm', 'navigate', { destination: 'SEARCH', search_query: '' }],
    ['Cuộn xuống', 'scroll_page', { direction: 'DOWN' }],
    ['Cuộn lên', 'scroll_page', { direction: 'UP' }],
  ];

  for (const [transcript, toolName, expectedArgs] of cases) {
    const toolCalls = buildDeterministicVoiceToolCalls(transcript);
    assert.equal(toolCalls.length, 1, transcript);
    assert.equal(toolCalls[0].function.name, toolName, transcript);
    assert.deepEqual(getToolArguments(toolCalls[0]), expectedArgs, transcript);
  }
});

test('buildDeterministicVoiceToolCalls covers current movie interactions', () => {
  const favoriteToolCalls = buildDeterministicVoiceToolCalls('Thích phim');
  assert.equal(favoriteToolCalls.length, 1);
  assert.equal(favoriteToolCalls[0].function.name, 'interact_current_movie');
  assert.deepEqual(getToolArguments(favoriteToolCalls[0]), { action: 'FAVORITE' });

  const commentToolCalls = buildDeterministicVoiceToolCalls('Bình luận phim hay quá');
  assert.equal(commentToolCalls.length, 1);
  assert.equal(commentToolCalls[0].function.name, 'interact_current_movie');
  assert.deepEqual(getToolArguments(commentToolCalls[0]), {
    action: 'COMMENT',
    comment_text: 'phim hay quá',
  });
});
