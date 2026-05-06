const { startWorkerProcess } = require('./workerRuntime');
const {
  closeSubtitleQueue,
  startSubtitleQueueWorker,
} = require('../services/subtitle.service');

startWorkerProcess({
  name: 'subtitle-worker',
  start: startSubtitleQueueWorker,
  close: closeSubtitleQueue,
  connectMongo: true,
}).catch((error) => {
  console.error(`[subtitle-worker] Startup failed: ${error.message}`);
  process.exit(1);
});
