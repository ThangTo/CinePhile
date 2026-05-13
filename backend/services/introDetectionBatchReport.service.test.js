const test = require('node:test');
const assert = require('node:assert/strict');

const {
  filterBatchMovies,
  getStatsPeriodKey,
  normalizeBatchRun,
  summarizeBatchRuns,
} = require('./introDetectionBatchReport.service');

test('normalizeBatchRun stores batch options and movie outcomes for history queries', () => {
  const batch = normalizeBatchRun({
    batchId: 'intro-batch-test',
    trigger: 'cron',
    state: 'completed',
    startedAt: new Date('2026-05-07T21:00:00.000Z'),
    finishedAt: new Date('2026-05-07T21:05:00.000Z'),
    viewWindow: {
      start: new Date('2026-05-06T17:00:00.000Z'),
      end: new Date('2026-05-07T16:59:59.999Z'),
      localDate: '2026-05-07',
      timezone: 'Asia/Ho_Chi_Minh',
    },
    options: {
      maxMovies: 30,
      detectionOptions: {
        sampleSize: 5,
        sampleSeconds: 600,
      },
    },
    processedMovies: 1,
    detectedMovies: 1,
    movies: [
      {
        movieId: '507f1f77bcf86cd799439011',
        movieName: 'Demo Movie',
        prioritySource: 'recent_views',
        state: 'completed',
        resultType: 'detected',
        audioStrategy: 'primary_audio_then_copy',
        primaryAudioType: 'vietsub',
        sampledEpisodes: 5,
        detectedEpisodes: 4,
        copiedEpisodes: 8,
        copiedIntroEpisodes: 8,
      },
    ],
  });

  assert.equal(batch.options.sampleSeconds, 600);
  assert.equal(batch.options.excludeSuccessfulMovies, true);
  assert.equal(batch.durationMs, 5 * 60 * 1000);
  assert.equal(batch.movies[0].prioritySource, 'recent_views');
  assert.equal(batch.movies[0].detectedEpisodes, 4);
  assert.equal(batch.movies[0].primaryAudioType, 'vietsub');
  assert.equal(batch.movies[0].copiedEpisodes, 8);
  assert.equal(batch.viewWindow.localDate, '2026-05-07');
});

test('filterBatchMovies supports search and result filters while preserving batch order', () => {
  const movies = filterBatchMovies(
    [
      {
        movieName: 'Attack on Titan',
        slug: 'attack-on-titan',
        state: 'completed',
        resultType: 'detected',
        prioritySource: 'recent_views',
      },
      {
        movieName: 'Demo Failed Movie',
        slug: 'demo-failed',
        state: 'failed',
        resultType: 'failed',
        prioritySource: 'banner',
        error: { message: 'Queue unavailable' },
      },
    ],
    {
      resultType: 'failed',
      search: 'queue',
    },
  );

  assert.equal(movies.length, 1);
  assert.equal(movies[0].movieName, 'Demo Failed Movie');
  assert.equal(movies[0].order, 2);
});

test('getStatsPeriodKey groups dates with the configured timezone', () => {
  const key = getStatsPeriodKey(
    new Date('2026-05-07T21:00:00.000Z'),
    'day',
    'Asia/Ho_Chi_Minh',
  );

  assert.equal(key.key, '2026-05-08');
});

test('summarizeBatchRuns aggregates daily stats and rates', () => {
  const summary = summarizeBatchRuns(
    [
      {
        batchId: 'batch-1',
        trigger: 'cron',
        state: 'completed_with_errors',
        startedAt: new Date('2026-05-07T21:00:00.000Z'),
        durationMs: 60000,
        totalMovies: 10,
        processedMovies: 10,
        detectedMovies: 6,
        noMatchMovies: 2,
        failedMovies: 2,
        skippedMovies: 0,
        movies: [
          { resultType: 'detected', prioritySource: 'recent_views', primaryAudioType: 'vietsub' },
          { resultType: 'failed', prioritySource: 'banner', error: { message: 'Redis failed' } },
        ],
      },
      {
        batchId: 'batch-2',
        trigger: 'manual',
        state: 'completed',
        startedAt: new Date('2026-05-08T21:00:00.000Z'),
        durationMs: 30000,
        totalMovies: 5,
        processedMovies: 5,
        detectedMovies: 5,
        noMatchMovies: 0,
        failedMovies: 0,
        skippedMovies: 0,
        movies: [
          { resultType: 'detected', prioritySource: 'view_count', primaryAudioType: 'thuyet-minh' },
        ],
      },
    ],
    { period: 'day', timezone: 'Asia/Ho_Chi_Minh' },
  );

  assert.equal(summary.groups.length, 2);
  assert.equal(summary.groups[0].key, '2026-05-08');
  assert.equal(summary.groups[0].runs, 1);
  assert.equal(summary.groups[0].successRate, 0.6);
  assert.equal(summary.totals.runs, 2);
  assert.equal(summary.totals.totalMovies, 15);
  assert.equal(summary.totals.detectedMovies, 11);
  assert.equal(summary.totals.resultTypes.detected, 2);
  assert.equal(summary.totals.failureMessages['Redis failed'], 1);
});
