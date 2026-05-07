const test = require('node:test');
const assert = require('node:assert/strict');

const { normalizeBatchRun } = require('./introDetectionBatchReport.service');

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
        sampledEpisodes: 5,
        detectedEpisodes: 4,
      },
    ],
  });

  assert.equal(batch.options.sampleSeconds, 600);
  assert.equal(batch.durationMs, 5 * 60 * 1000);
  assert.equal(batch.movies[0].prioritySource, 'recent_views');
  assert.equal(batch.movies[0].detectedEpisodes, 4);
  assert.equal(batch.viewWindow.localDate, '2026-05-07');
});
