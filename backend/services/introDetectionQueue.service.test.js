const test = require('node:test');
const assert = require('node:assert/strict');

const {
  normalizeJobOptions,
  shouldRequirePersistentQueue,
} = require('./introDetectionQueue.service');

test('normalizeJobOptions defaults to shorter intro-safe detection settings', () => {
  const options = normalizeJobOptions({});

  assert.equal(options.sampleSeconds, 600);
  assert.equal(options.minDurationSec, 30);
  assert.equal(options.similarityThreshold, 0.86);
});

test('normalizeJobOptions accepts bounded similarity threshold overrides', () => {
  assert.equal(normalizeJobOptions({ similarityThreshold: 0.7 }).similarityThreshold, 0.75);
  assert.equal(normalizeJobOptions({ similarityThreshold: 0.99 }).similarityThreshold, 0.98);
  assert.equal(normalizeJobOptions({ similarityThreshold: 0.9 }).similarityThreshold, 0.9);
});

test('normalizeJobOptions keeps admin episode selection options configurable', () => {
  const options = normalizeJobOptions({
    episodeSelectionMode: 'remaining',
    sampleSize: 25,
    episodeNumbers: '6,7-9',
  });

  assert.equal(options.episodeSelectionMode, 'remaining');
  assert.equal(options.sampleSize, 25);
  assert.equal(options.episodeNumbers, '6,7-9');
});

test('shouldRequirePersistentQueue requires Bull Redis for production and batch runs', () => {
  assert.equal(shouldRequirePersistentQueue({ NODE_ENV: 'production' }), true);
  assert.equal(shouldRequirePersistentQueue({ NODE_ENV: 'development', INTRO_BATCH_ENABLED: 'true' }), true);
  assert.equal(shouldRequirePersistentQueue({ NODE_ENV: 'development' }), false);
  assert.equal(
    shouldRequirePersistentQueue({
      NODE_ENV: 'production',
      INTRO_DETECTION_REQUIRE_REDIS: 'false',
    }),
    false,
  );
});
