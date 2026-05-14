const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');

const {
  buildEligibleIntroDetectionEpisodePipeline,
  buildCompletedDetectionExpression,
  buildSeriesMovieQuery,
  buildSuccessfulEpisodeMovieIdsPipeline,
  buildSuccessfulBatchMovieIdsPipeline,
  getSuccessfulBatchResultTypes,
  getNextIntroDetectionBatchWindow,
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

test('buildEligibleIntroDetectionEpisodePipeline only accepts real series candidates', () => {
  const successfulMovieId = new mongoose.Types.ObjectId('507f1f77bcf86cd799439011');
  const pipeline = buildEligibleIntroDetectionEpisodePipeline({
    maxEpisodesPerMovie: 120,
    excludedMovieIds: [successfulMovieId.toString()],
  });

  assert.equal(pipeline[0].$match.link_m3u8.$type, 'string');
  assert.equal(pipeline[0].$match.link_m3u8.$ne, '');
  assert.equal(pipeline[0].$match.movieId.$nin.length, 1);
  assert.equal(String(pipeline[0].$match.movieId.$nin[0]), successfulMovieId.toString());

  const seriesMatch = pipeline.find(
    (stage) => stage.$match?.uniqueEpisodeCount && stage.$match?.maxAudioEpisodeCount,
  );
  assert.deepEqual(seriesMatch, {
    $match: {
      uniqueEpisodeCount: { $gte: 2 },
      maxAudioEpisodeCount: { $gte: 2, $lte: 120 },
      pendingCount: { $gt: 0 },
    },
  });
});

test('buildSeriesMovieQuery rejects explicit single movies even when episode docs are malformed', () => {
  const movieIds = [new mongoose.Types.ObjectId('507f1f77bcf86cd799439011')];
  const query = buildSeriesMovieQuery(movieIds, { includeHidden: false });

  assert.deepEqual(query, {
    _id: { $in: movieIds },
    isHidden: { $ne: true },
    $or: [
      { totalEpisodes: { $gt: 1 } },
      { type: { $in: ['series', 'tvshows'] } },
    ],
  });
});

test('buildSuccessfulBatchMovieIdsPipeline unwinds movies before excluding successful reruns', () => {
  assert.deepEqual(getSuccessfulBatchResultTypes({ retryNoMatch: false }), [
    'detected',
    'no_match',
    'completed',
  ]);
  assert.deepEqual(getSuccessfulBatchResultTypes({ retryNoMatch: true }), [
    'detected',
    'completed',
  ]);

  assert.deepEqual(buildSuccessfulBatchMovieIdsPipeline({ retryNoMatch: false }), [
    {
      $match: {
        state: { $in: ['completed', 'completed_with_errors'] },
        movies: {
          $elemMatch: {
            state: 'completed',
            resultType: { $in: ['detected', 'no_match', 'completed'] },
            movieId: { $ne: null },
          },
        },
      },
    },
    { $unwind: '$movies' },
    {
      $match: {
        'movies.state': 'completed',
        'movies.resultType': { $in: ['detected', 'no_match', 'completed'] },
        'movies.movieId': { $ne: null },
      },
    },
    { $group: { _id: '$movies.movieId' } },
  ]);
});

test('buildSuccessfulEpisodeMovieIdsPipeline excludes movies with any completed intro detection', () => {
  assert.deepEqual(buildSuccessfulEpisodeMovieIdsPipeline({ retryNoMatch: false }), [
    {
      $match: {
        movieId: { $ne: null },
        $or: [
          {
            $and: [
              { 'playbackMeta.detection.status': { $in: ['detected', 'needs_review', 'approved'] } },
              { 'playbackMeta.intro.enabled': true },
              { 'playbackMeta.intro.startSec': { $gte: 0 } },
              { $expr: { $gt: ['$playbackMeta.intro.endSec', '$playbackMeta.intro.startSec'] } },
            ],
          },
          { 'playbackMeta.detection.status': 'no_match' },
        ],
      },
    },
    { $group: { _id: '$movieId' } },
  ]);

  const retryNoMatchMatch = buildSuccessfulEpisodeMovieIdsPipeline({ retryNoMatch: true })[0].$match;
  assert.equal(retryNoMatchMatch.$or.length, 1);
});

test('summarizeMovieDetectionResult categorizes batch outcomes', () => {
  assert.equal(summarizeMovieDetectionResult({ detectedEpisodes: 2 }), 'detected');
  assert.equal(summarizeMovieDetectionResult({ inferredEpisodes: 8 }), 'detected');
  assert.equal(summarizeMovieDetectionResult({ copiedIntroEpisodes: 4 }), 'detected');
  assert.equal(summarizeMovieDetectionResult({ noMatchEpisodes: 5 }), 'no_match');
  assert.equal(summarizeMovieDetectionResult({ copiedNoMatchEpisodes: 3 }), 'no_match');
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

test('getNextIntroDetectionBatchWindow previews the next 4AM cron view window', () => {
  const beforeCron = getNextIntroDetectionBatchWindow({
    timezone: 'Asia/Ho_Chi_Minh',
    now: new Date('2026-05-14T02:00:00+07:00'),
    cronExpression: '0 4 * * *',
  });
  assert.equal(beforeCron.nextRunAt.toISOString(), '2026-05-13T21:00:00.000Z');
  assert.equal(beforeCron.viewWindow.localDate, '2026-05-13');

  const afterCron = getNextIntroDetectionBatchWindow({
    timezone: 'Asia/Ho_Chi_Minh',
    now: new Date('2026-05-14T10:00:00+07:00'),
    cronExpression: '0 4 * * *',
  });
  assert.equal(afterCron.nextRunAt.toISOString(), '2026-05-14T21:00:00.000Z');
  assert.equal(afterCron.viewWindow.localDate, '2026-05-14');
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
