const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAutoWritableEpisodeFilter,
  detectCommonIntroFromFeatures,
  findBestPairMatch,
} = require('./introDetection.service');

function makeFeature(seed, rms = 0.4) {
  return {
    rms,
    vector: Array.from({ length: 8 }, (_, index) => {
      const value = Math.sin((seed + 1) * (index + 3));
      return Number(value.toFixed(4));
    }),
  };
}

function makeEpisodeFeatures(prefixLength, introLength, suffixLength, uniqueSeed = 0) {
  const prefix = Array.from({ length: prefixLength }, (_, index) => makeFeature(uniqueSeed + 1000 + index, 0.45));
  const intro = Array.from({ length: introLength }, (_, index) => makeFeature(2000 + index, 0.7));
  const suffix = Array.from({ length: suffixLength }, (_, index) => makeFeature(uniqueSeed + 3000 + index, 0.5));
  return [...prefix, ...intro, ...suffix];
}

test('findBestPairMatch finds the same intro at different offsets', () => {
  const first = makeEpisodeFeatures(45, 65, 80, 10000);
  const second = makeEpisodeFeatures(90, 65, 80, 20000);

  const match = findBestPairMatch(first, second, {
    minDurationSec: 45,
    maxDurationSec: 100,
    maxStartSec: 180,
  });

  assert.ok(match);
  assert.equal(match.first.startSec, 45);
  assert.equal(match.second.startSec, 90);
  assert.equal(match.durationSec, 65);
  assert.ok(match.score > 0.85);
});

test('detectCommonIntroFromFeatures aggregates pair matches across a season sample', () => {
  const detections = detectCommonIntroFromFeatures(
    [
      { episodeId: 'ep-1', episodeNumber: 1, features: makeEpisodeFeatures(40, 70, 100, 10000) },
      { episodeId: 'ep-2', episodeNumber: 2, features: makeEpisodeFeatures(72, 70, 100, 20000) },
      { episodeId: 'ep-3', episodeNumber: 3, features: makeEpisodeFeatures(55, 70, 100, 30000) },
    ],
    {
      minDurationSec: 45,
      maxDurationSec: 100,
      maxStartSec: 180,
      minVotes: 2,
    },
  );

  assert.equal(detections.length, 3);
  assert.deepEqual(
    detections.map((item) => [item.episodeId, item.introStartSec, item.introEndSec]),
    [
      ['ep-1', 40, 110],
      ['ep-2', 72, 142],
      ['ep-3', 55, 125],
    ],
  );
  assert.ok(detections.every((item) => item.confidence >= 0.8));
});

test('buildAutoWritableEpisodeFilter preserves approved or manual playback metadata', () => {
  assert.deepEqual(
    buildAutoWritableEpisodeFilter({ movieId: 'movie-1' }),
    {
      movieId: 'movie-1',
      'playbackMeta.detection.status': { $ne: 'approved' },
      'playbackMeta.detection.source': { $ne: 'manual' },
    },
  );
});
