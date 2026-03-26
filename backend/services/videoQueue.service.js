const Queue = require('bull');
const { renderClip16x9 } = require('./render.service');

// ─── Configuration ──────────────────────────────────────────────────────────
const REDIS_URL = process.env.REDIS_URL;
const CONCURRENCY = parseInt(process.env.VIDEO_QUEUE_CONCURRENCY, 10) || 2;

let viralVideoQueue;

if (REDIS_URL) {
  // ─── Queue Instance ─────────────────────────────────────────────────────────
  viralVideoQueue = new Queue('viral-video-processing', REDIS_URL, {
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
      timeout: 300000,       
    },
  });

  // ─── Worker ─────────────────────────────────────────────────────────────────
  viralVideoQueue.process(CONCURRENCY, async (job) => {
    const { videoUrl, bgMusic, bgmStartTime, bgmDuration, subtitleFile, startTime, duration, outputPath } = job.data;

    console.log(`[Queue] Processing job ${job.id}: ${JSON.stringify({
      category: job.data.category,
      startTime,
      duration,
      outputPath,
    })}`);

    job.progress(10);

    try {
      const result = await renderClip16x9(videoUrl, bgMusic, subtitleFile, startTime, duration, outputPath, bgmStartTime, bgmDuration);
      job.progress(100);
      console.log(`[Queue] Job ${job.id} completed: ${result}`);
      return { success: true, outputPath: result };
    } catch (error) {
      console.error(`[Queue] Job ${job.id} failed (attempt ${job.attemptsMade + 1}/${job.opts.attempts}): ${error.message}`);
      throw error; 
    }
  });

  // ─── Event Listeners ────────────────────────────────────────────────────────
  viralVideoQueue.on('progress', (job, progress) => {
    const { emitJobProgress } = require('./progressSocket.service');
    emitJobProgress(job.id, { step: 'render', percent: progress });
    if (job.data && job.data.movieId) {
      emitJobProgress(job.data.movieId, { step: 'render', renderJobId: job.id, percent: progress });
    }
  });
  
  viralVideoQueue.on('completed', (job, result) => {
    console.log(`[Queue] ✅ Job ${job.id} completed successfully:`, result);
    const { emitJobProgress } = require('./progressSocket.service');
    emitJobProgress(job.id, { step: 'render', percent: 100, status: 'completed', result });
    if (job.data && job.data.movieId) {
      emitJobProgress(job.data.movieId, { step: 'render', renderJobId: job.id, percent: 100, status: 'completed', result });
    }
  });

  viralVideoQueue.on('failed', (job, err) => {
    console.error(`[Queue] ❌ DLQ: Job ${job.id} failed permanently after ${job.attemptsMade} attempts: ${err.message}`);
    const { emitJobProgress } = require('./progressSocket.service');
    emitJobProgress(job.id, { step: 'render', status: 'failed', error: err.message });
  });

  viralVideoQueue.on('stalled', (job) => {
    console.warn(`[Queue] ⚠️ Job ${job.id || job} stalled — will be retried`);
  });

  viralVideoQueue.on('error', (error) => {
    console.error(`[Queue] Queue error: ${error.message}`);
  });

  viralVideoQueue.on('waiting', (jobId) => {
    console.log(`[Queue] Job ${jobId} is waiting`);
  });
} else {
  console.log('[Queue] Video Queue disabled: REDIS_URL missing.');
  viralVideoQueue = {
    add: async () => { throw new Error("Feature disabled") },
    getJob: async () => null,
    close: async () => {},
    on: () => {},
    process: () => {}
  };
}

// ─── Helper: Add a job ──────────────────────────────────────────────────────
/**
 * Add a clip rendering job to the queue.
 *
 * @param {Object} jobData
 * @param {string} jobData.videoUrl      - Source video URL
 * @param {string} jobData.bgMusic       - Background music path/URL
 * @param {string} jobData.bgmStartTime  - BGM start time
 * @param {number} jobData.bgmDuration   - Exact duration of BGM to force on the clip
 * @param {string} jobData.subtitleFile  - Path to .vtt subtitle file
 * @param {string} jobData.startTime     - Start timestamp (HH:MM:SS)
 * @param {number} jobData.duration      - Duration in seconds
 * @param {string} jobData.outputPath    - Output file path
 * @param {string} [jobData.category]    - Clip category (Funny/Romantic/Action)
 * @param {string} [jobData.movieId]     - Associated movie ID
 * @returns {Promise<import('bull').Job>}
 */
async function addClipJob(jobData) {
  const job = await viralVideoQueue.add(jobData, {
    // Job-specific overrides can go here
  });
  console.log(`[Queue] Added job ${job.id} for category: ${jobData.category || 'unknown'}`);
  return job;
}

/**
 * Get the status of a job by its ID.
 */
async function getJobStatus(jobId) {
  const job = await viralVideoQueue.getJob(jobId);
  if (!job) return null;

  const state = await job.getState();
  return {
    id: job.id,
    state,
    progress: job.progress(),
    data: job.data,
    result: job.returnvalue,
    failedReason: job.failedReason,
    attemptsMade: job.attemptsMade,
    timestamp: job.timestamp,
    finishedOn: job.finishedOn,
  };
}

/**
 * Gracefully close the queue (call on shutdown)
 */
async function closeQueue() {
  await viralVideoQueue.close();
  console.log('[Queue] ✅ Queue closed');
}

module.exports = {
  viralVideoQueue,
  addClipJob,
  getJobStatus,
  closeQueue,
};
