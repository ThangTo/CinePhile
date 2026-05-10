const test = require('node:test');
const assert = require('node:assert/strict');

const { extractEpisodeNumber } = require('./episodeNumber.util');

test('extractEpisodeNumber treats full movie labels as episode 1', () => {
  assert.equal(extractEpisodeNumber('Full'), 1);
  assert.equal(extractEpisodeNumber('Hoan Tat'), 1);
  assert.equal(extractEpisodeNumber('Ho\u00e0n T\u1ea5t'), 1);
  assert.equal(extractEpisodeNumber('Vietsub'), 1);
});

test('extractEpisodeNumber keeps numbered episode labels unchanged', () => {
  assert.equal(extractEpisodeNumber('Tap 12'), 12);
  assert.equal(extractEpisodeNumber('Episode 03'), 3);
});
