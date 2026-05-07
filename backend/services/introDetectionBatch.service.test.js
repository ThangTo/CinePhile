const test = require('node:test');
const assert = require('node:assert/strict');

const {
  buildCompletedDetectionExpression,
  getPreviousLocalDayWindow,
  getCompletedStatuses,
  getQueueSkipReason,
  normalizeBatchOptions,
  rankIntroDetectionCandidates,
  summarizeMovieDetectionResult,
} = require('./introDetectionBatch.service');

test('normalizeBatchOptions keeps nightly batch resource usage bounded', () => {
  const options = normalizeBatchOptions({
    maxMovies: 9999,
    lockTtlSec: 10,
    jobTimeoutMs: 100,
    betweenJobsMs: 99999999,
    sampleSize: 99,
    sampleSeconds: 9999,
  });

  assert.equal(options.maxMovies, 500);
  assert.equal(options.maxEpisodesPerMovie, 120);
  assert.equal(options.lockTtlSec, 60);
  assert.equal(options.jobTimeoutMs, 60000);
  assert.equal(options.betweenJobsMs, 5 * 60 * 1000);
  assert.equal(options.detectionOptions.sampleSize, 10);
  assert.equal(options.detectionOptions.sampleSeconds, 900);
});

test('normalizeBatchOptions defaults nightly audio sampling to ten minutes', () => {
  const options = normalizeBatchOptions({});

  assert.equal(options.detectionOptions.sampleSeconds, 600);
});

test('getCompletedStatuses skips no-match by default and can retry it explicitly', () => {
  assert.deepEqual(getCompletedStatuses({ retryNoMatch: false }), [
    'detected',
    'needs_review',
    'approved',
    'no_match',
  ]);
  assert.deepEqual(getCompletedStatuses({ retryNoMatch: true }), [
    'detected',
    'needs_review',
    'approved',
  ]);
});

test('buildCompletedDetectionExpression requires a valid intro range for detected statuses', () => {
  assert.deepEqual(buildCompletedDetectionExpression(['approved', 'no_match']), {
    $or: [
      {
        $and: [
          { $in: [{ $ifNull: ['$playbackMeta.detection.status', 'none'] }, ['approved']] },
          {
            $and: [
              { $eq: ['$playbackMeta.intro.enabled', true] },
              { $gte: ['$playbackMeta.intro.startSec', 0] },
              { $gt: ['$playbackMeta.intro.endSec', '$playbackMeta.intro.startSec'] },
            ],
          },
        ],
      },
      { $eq: [{ $ifNull: ['$playbackMeta.detection.status', 'none'] }, 'no_match'] },
    ],
  });
});

test('summarizeMovieDetectionResult categorizes batch outcomes', () => {
  assert.equal(summarizeMovieDetectionResult({ detectedEpisodes: 2 }), 'detected');
  assert.equal(summarizeMovieDetectionResult({ inferredEpisodes: 8 }), 'detected');
  assert.equal(summarizeMovieDetectionResult({ noMatchEpisodes: 5 }), 'no_match');
  assert.equal(summarizeMovieDetectionResult({}), 'completed');
});

test('getQueueSkipReason skips batch when persistent queue is required but unavailable', () => {
  assert.equal(
    getQueueSkipReason({
      requiresPersistentQueue: true,
      hasPersistentQueue: false,
      unavailableReason: 'REDIS_URL is required',
    }),
    'REDIS_URL is required',
  );

  assert.equal(
    getQueueSkipReason({
      requiresPersistentQueue: true,
      hasPersistentQueue: true,
    }),
    null,
  );
});

test('getPreviousLocalDayWindow uses the previous calendar day in Vietnam time', () => {
  const window = getPreviousLocalDayWindow(
    'Asia/Ho_Chi_Minh',
    new Date('2026-05-07T04:00:00+07:00'),
  );

  assert.equal(window.start.toISOString(), '2026-05-05T17:00:00.000Z');
  assert.equal(window.end.toISOString(), '2026-05-06T16:59:59.999Z');
});

test('rankIntroDetectionCandidates prioritizes viewed movies, banner, view count, then backlog', () => {
  const ranked = rankIntroDetectionCandidates({
    maxMovies: 5,
    eligibleMovies: [
      { movieId: 'fallback-high-pending', pendingCount: 80, episodeCount: 80, viewCount: 0 },
      { movieId: 'top-view-total', pendingCount: 1, episodeCount: 10, viewCount: 500 },
      { movieId: 'banner-movie', pendingCount: 1, episodeCount: 10, isFeatured: true, viewCount: 20 },
      { movieId: 'watched-longer', pendingCount: 1, episodeCount: 10, viewCount: 0 },
      { movieId: 'watched-more-clicks', pendingCount: 1, episodeCount: 10, viewCount: 0 },
    ],
    recentViews: [
      { movieId: 'watched-more-clicks', views: 4, totalWatchTime: 120 },
      { movieId: 'watched-longer', views: 1, totalWatchTime: 900 },
      { movieId: 'not-eligible', views: 99, totalWatchTime: 9999 },
    ],
  });

  assert.deepEqual(
    ranked.map((movie) => [movie.movieId, movie.prioritySource]),
    [
      ['watched-longer', 'recent_views'],
      ['watched-more-clicks', 'recent_views'],
      ['banner-movie', 'banner'],
      ['top-view-total', 'total_views'],
      ['fallback-high-pending', 'backlog'],
    ],
  );
});
