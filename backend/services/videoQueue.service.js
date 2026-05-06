const Queue = require('bull');
const { getClipFileInfo } = require('./viralClipFile.service');

const REDIS_URL = process.env.REDIS_URL;
const CONCURRENCY = Math.max(1, parseInt(process.env.VIDEO_QUEUE_CONCURRENCY, 10) || 1);
const VIDEO_QUEUE_TIMEOUT_MS = Math.max(
  60000,
  parseInt(process.env.VIDEO_QUEUE_TIMEOUT_MS, 10) || 300000,
);

let videoWorkerStarted = false;
let videoEventBridgeStarted = false;

function createDisabledQueue() {
  return {
    add: async () => {
      throw new Error('Feature disabled');
    },
    getJob: async () => null,
    close: async () => {},
    on: () => {},
    process: () => {},
  };
}

function createQueue() {
  if (!REDIS_URL) {
    console.log('[Queue] Video Queue disabled: REDIS_URL missing.');
    return createDisabledQueue();
  }

  return new Queue('viral-video-processing', REDIS_URL, {
    redis: {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    },
    defaultJobOptions: {
      attempts: 3,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 50,
      removeOnFail: 100,
      timeout: VIDEO_QUEUE_TIMEOUT_MS,
    },
  });
}

const viralVideoQueue = createQueue();

async function processVideoJob(job) {
  const { renderClip16x9 } = require('./render.service');
  const {
    videoUrl,
    bgMusic,
    bgmStartTime,
    bgmDuration,
    subtitleFile,
    renderOptions,
    startTime,
    duration,
    outputPath,
  } = job.data;

  console.log(`[Queue] Processing job ${job.id}: ${JSON.stringify({
    category: job.data.category,
    startTime,
    duration,
    outputPath,
  })}`);

  job.progress(10);

  try {
    const result = await renderClip16x9(
      videoUrl,
      bgMusic,
      subtitleFile,
      startTime,
      duration,
      outputPath,
      bgmStartTime,
      bgmDuration,
      (progress) => job.progress(progress),
      renderOptions,
    );
    job.progress(100);
    console.log(`[Queue] Job ${job.id} completed: ${result}`);
    return { success: true, outputPath: result };
  } catch (error) {
    console.error(`[Queue] Job ${job.id} failed (attempt ${job.attemptsMade + 1}/${job.opts.attempts}): ${error.message}`);
    throw error;
  }
}

function parseBullResult(rawResult) {
  if (typeof rawResult !== 'string') {
    return rawResult;
  }

  try {
    return JSON.parse(rawResult);
  } catch (_error) {
    return rawResult;
  }
}

async function getQueueJob(jobId) {
  try {
    return await viralVideoQueue.getJob(jobId);
  } catch (error) {
    console.warn(`[Queue] Failed to load job ${jobId}: ${error.message}`);
    return null;
  }
}

function emitRenderProgress(job, payload) {
  const { emitJobProgress } = require('./progressSocket.service');
  emitJobProgress(job.id, payload);

  if (job.data && job.data.movieId) {
    emitJobProgress(job.data.movieId, {
      ...payload,
      renderJobId: job.id,
    });
  }
}

function registerVideoQueueEventBridge() {
  if (!REDIS_URL || videoEventBridgeStarted) {
    return false;
  }

  videoEventBridgeStarted = true;

  viralVideoQueue.on('global:progress', async (jobId, progress) => {
    const job = await getQueueJob(jobId);
    if (!job) return;

    emitRenderProgress(job, { step: 'render', percent: progress });
  });

  viralVideoQueue.on('global:completed', async (jobId, rawResult) => {
    const job = await getQueueJob(jobId);
    if (!job) return;

    emitRenderProgress(job, {
      step: 'render',
      percent: 100,
      status: 'completed',
      result: parseBullResult(rawResult),
    });
  });

  viralVideoQueue.on('global:failed', async (jobId, failedReason) => {
    const job = await getQueueJob(jobId);
    if (!job) {
      const { emitJobProgress } = require('./progressSocket.service');
      emitJobProgress(jobId, { step: 'render', status: 'failed', error: failedReason });
      return;
    }

    emitRenderProgress(job, { step: 'render', status: 'failed', error: failedReason });
  });

  viralVideoQueue.on('error', (error) => {
    console.error(`[Queue] Queue error: ${error.message}`);
  });

  return true;
}

function startVideoQueueWorker() {
  if (!REDIS_URL) {
    console.log('[Queue] Video worker disabled: REDIS_URL missing.');
    return false;
  }

  if (videoWorkerStarted) {
    return true;
  }

  videoWorkerStarted = true;
  viralVideoQueue.process(CONCURRENCY, processVideoJob);

  viralVideoQueue.on('completed', (job, result) => {
    console.log(`[Queue] Job ${job.id} completed successfully:`, result);
  });

  viralVideoQueue.on('failed', (job, err) => {
    console.error(`[Queue] DLQ: Job ${job?.id} failed after ${job?.attemptsMade || 0} attempts: ${err.message}`);
  });

  viralVideoQueue.on('stalled', (job) => {
    console.warn(`[Queue] Job ${job.id || job} stalled; Bull will retry it.`);
  });

  viralVideoQueue.on('waiting', (jobId) => {
    console.log(`[Queue] Job ${jobId} is waiting`);
  });

  viralVideoQueue.on('error', (error) => {
    console.error(`[Queue] Queue error: ${error.message}`);
  });

  console.log(`[Queue] Video worker started with concurrency=${CONCURRENCY}`);
  return true;
}

/**
 * Add a clip rendering job to the queue.
 *
 * @param {Object} jobData
 * @param {string} jobData.videoUrl
 * @param {string} jobData.bgMusic
 * @param {string} jobData.bgmStartTime
 * @param {number} jobData.bgmDuration
 * @param {string} jobData.subtitleFile
 * @param {Object} [jobData.renderOptions]
 * @param {string} jobData.startTime
 * @param {number} jobData.duration
 * @param {string} jobData.outputPath
 * @param {string} [jobData.category]
 * @param {string} [jobData.movieId]
 * @returns {Promise<import('bull').Job>}
 */
async function addClipJob(jobData) {
  const job = await viralVideoQueue.add(jobData);
  console.log(`[Queue] Added job ${job.id} for category: ${jobData.category || 'unknown'}`);
  return job;
}

async function getJobStatus(jobId) {
  const job = await viralVideoQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  const outputPath = job.returnvalue?.outputPath || job.data?.outputPath;
  const clip = getClipFileInfo(outputPath);

  return {
    id: job.id,
    state,
    progress: job.progress(),
    data: job.data,
    result: job.returnvalue,
    clip,
    clipUrl: clip?.url || null,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    finishedOn: job.finishedOn,
  };
}

async function closeQueue() {
  await viralVideoQueue.close();
  console.log('[Queue] Video queue closed');
}

module.exports = {
  viralVideoQueue,
  addClipJob,
  closeQueue,
  getJobStatus,
  registerVideoQueueEventBridge,
  startVideoQueueWorker,
};
