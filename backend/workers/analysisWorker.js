const { startWorkerProcess } = require('./workerRuntime');
const {
  closeAnalysisQueue,
  startAnalysisQueueWorker,
} = require('../services/analysisQueue.service');

startWorkerProcess({
  name: 'analysis-worker',
  start: startAnalysisQueueWorker,
  close: closeAnalysisQueue,
  connectMongo: true,
}).catch((error) => {
  console.error(`[analysis-worker] Startup failed: ${error.message}`);
  process.exit(1);
});
