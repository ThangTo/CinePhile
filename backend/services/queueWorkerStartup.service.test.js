const test = require('node:test');
const assert = require('node:assert/strict');

process.env.REDIS_URL = '';

test('queue worker starters stay disabled without REDIS_URL', () => {
  const { registerAnalysisQueueEventBridge, startAnalysisQueueWorker } = require('./analysisQueue.service');
  const { startIntroDetectionWorker } = require('./introDetectionQueue.service');
  const { startSubtitleQueueWorker } = require('./subtitle.service');
  const { registerVideoQueueEventBridge, startVideoQueueWorker } = require('./videoQueue.service');

  assert.equal(startAnalysisQueueWorker(), false);
  assert.equal(startVideoQueueWorker(), false);
  assert.equal(startIntroDetectionWorker(), false);
  assert.equal(startSubtitleQueueWorker(), false);
  assert.equal(registerAnalysisQueueEventBridge(), false);
  assert.equal(registerVideoQueueEventBridge(), false);
});
