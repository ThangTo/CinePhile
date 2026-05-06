const test = require('node:test');
const assert = require('node:assert/strict');

const {
  getCompletedStatuses,
  getQueueSkipReason,
  normalizeBatchOptions,
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
