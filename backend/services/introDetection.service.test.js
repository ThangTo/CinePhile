const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAutoWritableEpisodeFilter,
  detectCommonIntroFromFeatures,
  findBestPairMatch,
  parseEpisodeNumberList,
  selectIntroDetectionEpisodes,
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

test('buildAutoWritableEpisodeFilter preserves approved or manual metadata only when intro is valid', () => {
  assert.deepEqual(
    buildAutoWritableEpisodeFilter({ movieId: 'movie-1' }),
    {
      movieId: 'movie-1',
      $nor: [
        {
          'playbackMeta.detection.status': 'approved',
          'playbackMeta.intro.enabled': true,
          'playbackMeta.intro.startSec': { $gte: 0 },
          $expr: {
            $gt: ['$playbackMeta.intro.endSec', '$playbackMeta.intro.startSec'],
          },
        },
        {
          'playbackMeta.detection.source': 'manual',
          'playbackMeta.intro.enabled': true,
          'playbackMeta.intro.startSec': { $gte: 0 },
          $expr: {
            $gt: ['$playbackMeta.intro.endSec', '$playbackMeta.intro.startSec'],
          },
        },
      ],
    },
  );
});

test('parseEpisodeNumberList accepts comma lists and ranges', () => {
  assert.deepEqual(parseEpisodeNumberList('6, 7-9, 9, tap 12'), [6, 7, 8, 9, 12]);
  assert.deepEqual(parseEpisodeNumberList([3, '4', 'bad', 3]), [3, 4]);
});

test('selectIntroDetectionEpisodes supports sample, remaining, all, and specific modes', () => {
  const episodes = [
    { _id: 'ep-1', episodeId: 1, audioType: 'vietsub', playbackMeta: { intro: { enabled: true, startSec: 10, endSec: 70 } } },
    { _id: 'ep-2', episodeId: 2, audioType: 'vietsub', playbackMeta: { intro: { enabled: false } } },
    { _id: 'ep-3', episodeId: 3, audioType: 'vietsub', playbackMeta: { intro: { enabled: true, startSec: 11, endSec: 71 } } },
    { _id: 'ep-4', episodeId: 4, audioType: 'vietsub', playbackMeta: { intro: { enabled: true, startSec: null, endSec: null } } },
    { _id: 'ep-5', episodeId: 5, audioType: 'vietsub', playbackMeta: { intro: { enabled: false } } },
  ];

  assert.deepEqual(
    selectIntroDetectionEpisodes(episodes, { episodeSelectionMode: 'sample', sampleSize: 3 }).map((episode) => episode.episodeId),
    [1, 2, 3],
  );
  assert.deepEqual(
    selectIntroDetectionEpisodes(episodes, { episodeSelectionMode: 'remaining', sampleSize: 2 }).map((episode) => episode.episodeId),
    [2, 4],
  );
  assert.deepEqual(
    selectIntroDetectionEpisodes(episodes, { episodeSelectionMode: 'all' }).map((episode) => episode.episodeId),
    [1, 2, 3, 4, 5],
  );
  assert.deepEqual(
    selectIntroDetectionEpisodes(episodes, { episodeSelectionMode: 'specific', episodeNumbers: '4,2' }).map((episode) => episode.episodeId),
    [2, 4],
  );
});
