const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildAutoWritableEpisodeFilter,
  buildCopiedPlaybackMetaUpdate,
  detectCommonIntroFromFeatures,
  findBestPairMatch,
  normalizeDetectionOptions,
  parseEpisodeNumberList,
  selectPrimaryAudioGroup,
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

test('findBestPairMatch allows later starts when sampling a longer intro window', () => {
  const introFeature = { rms: 0.7, vector: [0, 0, 1] };
  const first = [
    ...Array.from({ length: 520 }, () => ({ rms: 0.4, vector: [1, 0, 0] })),
    ...Array.from({ length: 45 }, () => introFeature),
    ...Array.from({ length: 20 }, () => ({ rms: 0.5, vector: [1, 1, 0] })),
  ];
  const second = [
    ...Array.from({ length: 500 }, () => ({ rms: 0.4, vector: [0, 1, 0] })),
    ...Array.from({ length: 45 }, () => introFeature),
    ...Array.from({ length: 20 }, () => ({ rms: 0.5, vector: [0, 1, 1] })),
  ];

  const match = findBestPairMatch(first, second, {
    sampleSeconds: 600,
    minDurationSec: 40,
    maxDurationSec: 80,
    similarityThreshold: 0.9999,
  });

  assert.ok(match);
  assert.equal(match.first.startSec, 520);
  assert.equal(match.second.startSec, 500);
});

test('normalizeDetectionOptions expands maxStartSec from sampleSeconds', () => {
  assert.equal(normalizeDetectionOptions({ sampleSeconds: 600 }).maxStartSec, 540);
  assert.equal(normalizeDetectionOptions({ sampleSeconds: 300 }).maxStartSec, 300);
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

test('selectPrimaryAudioGroup prefers vietsub before thuyet minh and long tieng', () => {
  const episodes = [
    { _id: 'lt-1', episodeId: 1, audioType: 'long-tieng' },
    { _id: 'lt-2', episodeId: 2, audioType: 'long-tieng' },
    { _id: 'tm-1', episodeId: 1, audioType: 'thuyet-minh' },
    { _id: 'tm-2', episodeId: 2, audioType: 'thuyet-minh' },
    { _id: 'vs-1', episodeId: 1, audioType: 'vietsub' },
    { _id: 'vs-2', episodeId: 2, audioType: 'vietsub' },
  ];

  const group = selectPrimaryAudioGroup(episodes, { episodeSelectionMode: 'all' });

  assert.equal(group.audioKey, 'vietsub');
  assert.deepEqual(group.selectedEpisodes.map((episode) => episode._id), ['vs-1', 'vs-2']);
});

test('selectPrimaryAudioGroup falls back when higher priority audio lacks enough selected episodes', () => {
  const episodes = [
    { _id: 'vs-1', episodeId: 1, audioType: 'vietsub' },
    { _id: 'tm-1', episodeId: 1, audioType: 'thuyet-minh' },
    { _id: 'tm-2', episodeId: 2, audioType: 'thuyet-minh' },
  ];

  const group = selectPrimaryAudioGroup(episodes, { episodeSelectionMode: 'specific', episodeNumbers: '1-2' });

  assert.equal(group.audioKey, 'thuyet-minh');
  assert.deepEqual(group.selectedEpisodes.map((episode) => episode._id), ['tm-1', 'tm-2']);
});

test('buildCopiedPlaybackMetaUpdate copies primary audio as reviewable auto metadata', () => {
  const update = buildCopiedPlaybackMetaUpdate(
    {
      _id: 'source-episode',
      audioType: 'vietsub',
      playbackMeta: {
        intro: { enabled: true, startSec: 35, endSec: 120 },
        detection: {
          status: 'approved',
          confidence: 1,
          sourceHash: 'hash-1',
        },
      },
    },
    {
      movieId: 'movie-1',
      primaryAudioType: 'vietsub',
      jobId: 'job-1',
      now: new Date('2026-05-07T00:00:00.000Z'),
    },
  ).update;

  assert.equal(update['playbackMeta.intro.startSec'], 35);
  assert.equal(update['playbackMeta.intro.endSec'], 120);
  assert.equal(update['playbackMeta.detection.status'], 'needs_review');
  assert.equal(update['playbackMeta.detection.confidence'], 0.82);
  assert.equal(update['playbackMeta.detection.note'], 'Copied from primary audio: vietsub');
});
