const { startWorkerProcess } = require('./workers/workerRuntime');
const { initCronJobs } = require('./services/cron.service');

startWorkerProcess({
  name: 'scheduler',
  start: () => {
    initCronJobs();
    return true;
  },
  close: async () => {},
  connectMongo: true,
  connectRedisService: true,
}).catch((error) => {
  console.error(`[scheduler] Startup failed: ${error.message}`);
  process.exit(1);
});
