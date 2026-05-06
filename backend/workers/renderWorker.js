const { startWorkerProcess } = require('./workerRuntime');
const {
  closeQueue,
  startVideoQueueWorker,
} = require('../services/videoQueue.service');

startWorkerProcess({
  name: 'render-worker',
  start: startVideoQueueWorker,
  close: closeQueue,
  connectMongo: false,
}).catch((error) => {
  console.error(`[render-worker] Startup failed: ${error.message}`);
  process.exit(1);
});
