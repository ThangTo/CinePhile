const { startWorkerProcess } = require('./workerRuntime');
const {
  closeIntroDetectionQueue,
  startIntroDetectionWorker,
} = require('../services/introDetectionQueue.service');

startWorkerProcess({
  name: 'intro-detection-worker',
  start: startIntroDetectionWorker,
  close: closeIntroDetectionQueue,
  connectMongo: true,
}).catch((error) => {
  console.error(`[intro-detection-worker] Startup failed: ${error.message}`);
  process.exit(1);
});
