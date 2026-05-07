const Queue = require('bull');

const REDIS_URL = process.env.REDIS_URL;
const CONCURRENCY = Math.max(1, Number.parseInt(process.env.INTRO_DETECTION_CONCURRENCY, 10) || 1);
const TIMEOUT_MS = Math.max(
  60000,
  Number.parseInt(process.env.INTRO_DETECTION_QUEUE_TIMEOUT_MS, 10) || 30 * 60 * 1000,
);
const QUEUE_ADD_TIMEOUT_MS = Math.max(
  1000,
  Number.parseInt(process.env.INTRO_DETECTION_ADD_TIMEOUT_MS, 10) || 2500,
);

const memoryJobs = new Map();
let introDetectionQueue = null;
let introDetectionQueueReady = false;
let introDetectionWorkerStarted = false;
let introDetectionEventsRegistered = false;

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function shouldRequirePersistentQueue(env = process.env) {
  const defaultValue =
    env.NODE_ENV === 'production' ||
    parseBool(env.INTRO_BATCH_ENABLED, false) ||
    parseBool(env.CRON_INTRO_BATCH_ENABLED, false);

  return parseBool(env.INTRO_DETECTION_REQUIRE_REDIS, defaultValue);
}

const REQUIRE_PERSISTENT_QUEUE = shouldRequirePersistentQueue(process.env);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseFloatOption(value, fallback) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeJobOptions(options = {}) {
  const sampleSize = Math.max(2, Math.min(500, Number.parseInt(options.sampleSize, 10) || 5));
  const validSelectionModes = new Set(['sample', 'remaining', 'all', 'specific']);
  const episodeSelectionMode = validSelectionModes.has(options.episodeSelectionMode)
    ? options.episodeSelectionMode
    : 'sample';

  return {
    sampleSize,
    episodeSelectionMode,
    episodeNumbers: options.episodeNumbers || null,
    maxEpisodesPerJob: Math.max(
      2,
      Math.min(500, Number.parseInt(options.maxEpisodesPerJob, 10) || 500),
    ),
    sampleSeconds: Math.max(180, Math.min(900, Number.parseInt(options.sampleSeconds, 10) || 600)),
    minDurationSec: Math.max(20, Math.min(180, Number.parseInt(options.minDurationSec, 10) || 30)),
    maxDurationSec: Math.max(45, Math.min(240, Number.parseInt(options.maxDurationSec, 10) || 140)),
    maxStartSec: Math.max(60, Math.min(600, Number.parseInt(options.maxStartSec, 10) || 300)),
    similarityThreshold: clamp(parseFloatOption(options.similarityThreshold, 0.86), 0.75, 0.98),
    applySeasonDefault: options.applySeasonDefault !== false && options.applySeasonDefault !== 'false',
  };
}

function runMemoryJob(jobRecord) {
  setImmediate(async () => {
    try {
      const { detectIntroForMovie } = require('./introDetection.service');
      jobRecord.state = 'active';
      jobRecord.progress = 1;
      jobRecord.step = 'starting';
      jobRecord.message = 'Starting intro detection';
      jobRecord.updatedAt = Date.now();

      const result = await detectIntroForMovie(
        jobRecord.data.movieId,
        { ...jobRecord.data.options, jobId: jobRecord.id },
        (progressPayload) => {
          const payload =
            typeof progressPayload === 'object'
              ? progressPayload
              : { percent: progressPayload };
          jobRecord.progress = Math.max(0, Math.min(100, Number(payload.percent) || 0));
          jobRecord.step = payload.step || jobRecord.step || null;
          jobRecord.message = payload.message || jobRecord.message || null;
          jobRecord.updatedAt = Date.now();
        },
      );

      jobRecord.state = 'completed';
      jobRecord.progress = 100;
      jobRecord.step = 'completed';
      jobRecord.message = 'Intro detection completed';
      jobRecord.result = result;
      jobRecord.finishedOn = Date.now();
      jobRecord.updatedAt = Date.now();
    } catch (error) {
      jobRecord.state = 'failed';
      jobRecord.progress = Math.max(jobRecord.progress || 0, 1);
      jobRecord.step = 'failed';
      jobRecord.message = error.message;
      jobRecord.failedReason = error.message;
      jobRecord.finishedOn = Date.now();
      jobRecord.updatedAt = Date.now();
    }
  });
}

function addMemoryJob(data, reason = null) {
  const id = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const jobRecord = {
    id,
    state: 'waiting',
    progress: 0,
    data,
    result: null,
    failedReason: null,
    timestamp: Date.now(),
    updatedAt: Date.now(),
    finishedOn: null,
    backend: 'memory',
    fallbackReason: reason,
  };
  memoryJobs.set(id, jobRecord);
  runMemoryJob(jobRecord);
  return { id, state: 'waiting', data, backend: 'memory', fallbackReason: reason };
}

function createPersistentQueueUnavailableError(reason = null) {
  const suffix = reason ? ` Reason: ${reason}` : '';
  const error = new Error(
    `Intro detection requires REDIS_URL TCP Redis/Bull in this environment.${suffix}`,
  );
  error.statusCode = 503;
  error.code = 'INTRO_DETECTION_REDIS_REQUIRED';
  return error;
}

function getIntroDetectionQueueState() {
  return {
    backend: introDetectionQueue ? 'bull' : 'memory',
    hasPersistentQueue: Boolean(introDetectionQueue),
    isReady: introDetectionQueueReady,
    requiresPersistentQueue: REQUIRE_PERSISTENT_QUEUE,
    hasRedisUrl: Boolean(REDIS_URL),
    unavailableReason:
      REQUIRE_PERSISTENT_QUEUE && !introDetectionQueue
        ? 'REDIS_URL TCP Redis is required for intro detection jobs'
        : null,
  };
}

function timeoutPromise(ms, message) {
  return new Promise((_, reject) => {
    const timer = setTimeout(() => reject(new Error(message)), ms);
    if (typeof timer.unref === 'function') timer.unref();
  });
}

async function processIntroDetectionJob(job) {
  const { detectIntroForMovie } = require('./introDetection.service');
  job.progress(1);
  const result = await detectIntroForMovie(
    job.data.movieId,
    { ...job.data.options, jobId: job.id },
    (progressPayload) => {
      const payload =
        typeof progressPayload === 'object'
          ? progressPayload
          : { percent: progressPayload };
      const percent = Math.max(0, Math.min(100, Number(payload.percent) || 0));
      job.progress(percent);
      if (payload.step || payload.message) {
        job
          .update({
            ...job.data,
            lastStatus: {
              step: payload.step || null,
              message: payload.message || null,
              percent,
              updatedAt: Date.now(),
            },
          })
          .catch(() => {});
      }
    },
  );
  job.progress(100);
  return result;
}

function registerIntroDetectionQueueEvents() {
  if (!introDetectionQueue || introDetectionEventsRegistered) {
    return false;
  }

  introDetectionEventsRegistered = true;

  introDetectionQueue.on('ready', () => {
    introDetectionQueueReady = true;
    console.log('[IntroDetection] Queue ready');
  });

  introDetectionQueue.on('global:completed', (jobId) => {
    console.log(`[IntroDetection] Job ${jobId} completed`);
  });

  introDetectionQueue.on('global:failed', (jobId, failedReason) => {
    console.error(`[IntroDetection] Job ${jobId} failed: ${failedReason}`);
  });

  introDetectionQueue.on('error', (error) => {
    introDetectionQueueReady = false;
    console.error(`[IntroDetection] Queue error: ${error.message}`);
  });

  return true;
}

function startIntroDetectionWorker() {
  if (!introDetectionQueue) {
    console.log('[IntroDetection] Worker disabled: persistent queue is unavailable.');
    return false;
  }

  if (introDetectionWorkerStarted) {
    return true;
  }

  introDetectionWorkerStarted = true;
  introDetectionQueue.process(CONCURRENCY, processIntroDetectionJob);
  console.log(`[IntroDetection] Worker started with concurrency=${CONCURRENCY}`);
  return true;
}

if (REDIS_URL) {
  introDetectionQueue = new Queue('intro-detection-queue', REDIS_URL, {
    redis: {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
      tls: REDIS_URL.startsWith('rediss://') ? { rejectUnauthorized: false } : undefined,
    },
    defaultJobOptions: {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 5000,
      },
      removeOnComplete: 50,
      removeOnFail: 100,
      timeout: TIMEOUT_MS,
    },
  });

  registerIntroDetectionQueueEvents();
} else {
  const message = REQUIRE_PERSISTENT_QUEUE
    ? '[IntroDetection] REDIS_URL missing; intro detection jobs are disabled until TCP Redis is configured.'
    : '[IntroDetection] Redis missing; using in-memory intro detection jobs.';
  console.log(message);
}

async function addIntroDetectionJob(movieId, options = {}) {
  if (!movieId) throw new Error('Movie ID is required');

  const data = {
    movieId,
    options: normalizeJobOptions(options),
  };

  if (!introDetectionQueue && REQUIRE_PERSISTENT_QUEUE) {
    throw createPersistentQueueUnavailableError('REDIS_URL is not configured');
  }

  if (introDetectionQueue) {
    try {
      const job = await Promise.race([
        introDetectionQueue.add(data),
        timeoutPromise(QUEUE_ADD_TIMEOUT_MS, 'Intro detection queue add timed out'),
      ]);
      introDetectionQueueReady = true;
      return { id: job.id, state: 'waiting', data, backend: 'bull' };
    } catch (error) {
      if (REQUIRE_PERSISTENT_QUEUE) {
        throw createPersistentQueueUnavailableError(error.message);
      }

      console.warn(`[IntroDetection] Falling back to in-memory job: ${error.message}`);
      introDetectionQueueReady = false;
      return addMemoryJob(data, error.message);
    }
  }

  return addMemoryJob(data, null);
}

async function getIntroDetectionJobStatus(jobId) {
  if (!jobId) return null;

  if (memoryJobs.has(jobId)) {
    return memoryJobs.get(jobId);
  }

  if (introDetectionQueue) {
    const job = await introDetectionQueue.getJob(jobId);
    if (!job) return null;
    const lastStatus = job.data?.lastStatus || {};

    return {
      id: job.id,
      state: await job.getState(),
      progress: job.progress(),
      step: lastStatus.step || null,
      message: lastStatus.message || null,
      backend: 'bull',
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
      timestamp: job.timestamp,
      finishedOn: job.finishedOn,
    };
  }

  return memoryJobs.get(jobId) || null;
}

async function closeIntroDetectionQueue() {
  if (introDetectionQueue) {
    await introDetectionQueue.close();
  }
}

module.exports = {
  addIntroDetectionJob,
  closeIntroDetectionQueue,
  createPersistentQueueUnavailableError,
  getIntroDetectionQueueState,
  getIntroDetectionJobStatus,
  normalizeJobOptions,
  shouldRequirePersistentQueue,
  startIntroDetectionWorker,
};
