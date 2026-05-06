const crypto = require('crypto');
const Movie = require('../models/movie.model');
const Episode = require('../models/episode.model');
const redisService = require('./redis.service');
const {
  addIntroDetectionJob,
  getIntroDetectionQueueState,
  getIntroDetectionJobStatus,
} = require('./introDetectionQueue.service');

const BATCH_LOCK_KEY = 'intro-detection:batch:lock';
const BATCH_LATEST_KEY = 'intro-detection:batch:latest';
const DEFAULT_COMPLETED_STATUSES = ['detected', 'needs_review', 'approved', 'no_match'];
const RETRY_NO_MATCH_COMPLETED_STATUSES = ['detected', 'needs_review', 'approved'];

let localLockOwner = null;
let latestBatchSummary = null;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseBool(value, fallback) {
  if (value === undefined || value === null || value === '') return fallback;
  return !['0', 'false', 'no', 'off'].includes(String(value).trim().toLowerCase());
}

function parseIntOption(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  const nextValue = Number.isFinite(parsed) ? parsed : fallback;
  return clamp(nextValue, min, max);
}

function normalizeBatchOptions(options = {}) {
  const retryNoMatch = parseBool(
    options.retryNoMatch ?? process.env.INTRO_BATCH_RETRY_NO_MATCH,
    false,
  );

  return {
    maxMovies: parseIntOption(options.maxMovies ?? process.env.INTRO_BATCH_MAX_MOVIES, 30, 1, 500),
    maxEpisodesPerMovie: parseIntOption(
      options.maxEpisodesPerMovie ?? process.env.INTRO_BATCH_MAX_EPISODES_PER_MOVIE,
      120,
      2,
      5000,
    ),
    includeHidden: parseBool(options.includeHidden ?? process.env.INTRO_BATCH_INCLUDE_HIDDEN, false),
    retryNoMatch,
    lockTtlSec: parseIntOption(
      options.lockTtlSec ?? process.env.INTRO_BATCH_LOCK_TTL_SEC,
      6 * 60 * 60,
      60,
      24 * 60 * 60,
    ),
    jobTimeoutMs: parseIntOption(
      options.jobTimeoutMs ?? process.env.INTRO_BATCH_JOB_TIMEOUT_MS,
      25 * 60 * 1000,
      60 * 1000,
      60 * 60 * 1000,
    ),
    pollMs: parseIntOption(options.pollMs ?? process.env.INTRO_BATCH_JOB_POLL_MS, 5000, 1000, 60000),
    betweenJobsMs: parseIntOption(
      options.betweenJobsMs ?? process.env.INTRO_BATCH_BETWEEN_JOBS_MS,
      15000,
      0,
      5 * 60 * 1000,
    ),
    maxRuntimeMs: parseIntOption(
      options.maxRuntimeMs ?? process.env.INTRO_BATCH_MAX_RUNTIME_MS,
      5 * 60 * 60 * 1000,
      5 * 60 * 1000,
      12 * 60 * 60 * 1000,
    ),
    detectionOptions: {
      sampleSize: parseIntOption(options.sampleSize ?? process.env.INTRO_BATCH_SAMPLE_SIZE, 5, 2, 10),
      sampleSeconds: parseIntOption(
        options.sampleSeconds ?? process.env.INTRO_BATCH_SAMPLE_SECONDS,
        300,
        180,
        900,
      ),
      applySeasonDefault: parseBool(
        options.applySeasonDefault ?? process.env.INTRO_BATCH_APPLY_SEASON_DEFAULT,
        true,
      ),
    },
  };
}

function getCompletedStatuses(options = {}) {
  return options.retryNoMatch ? RETRY_NO_MATCH_COMPLETED_STATUSES : DEFAULT_COMPLETED_STATUSES;
}

function sleep(ms) {
  if (!ms) return Promise.resolve();
  return new Promise((resolve) => {
    const timeout = setTimeout(resolve, ms);
    if (typeof timeout.unref === 'function') timeout.unref();
  });
}

function createBatchId() {
  return `intro-batch-${new Date().toISOString().replace(/[:.]/g, '-')}-${crypto
    .randomBytes(3)
    .toString('hex')}`;
}

async function acquireBatchLock(owner, ttlSec) {
  if (localLockOwner) {
    return { acquired: false, backend: 'memory', reason: `local lock held by ${localLockOwner}` };
  }

  const client = redisService.client;
  if (redisService.isConnected && client?.sendCommand) {
    try {
      const result = await client.sendCommand(['SET', BATCH_LOCK_KEY, owner, 'NX', 'EX', String(ttlSec)]);
      if (result === 'OK') {
        localLockOwner = owner;
        return { acquired: true, backend: 'redis' };
      }

      return { acquired: false, backend: 'redis', reason: 'redis lock is already held' };
    } catch (error) {
      console.warn(`[IntroBatch] Redis lock unavailable, falling back to local lock: ${error.message}`);
    }
  }

  localLockOwner = owner;
  return { acquired: true, backend: 'memory', reason: 'redis lock unavailable' };
}

async function releaseBatchLock(owner, backend) {
  if (localLockOwner === owner) {
    localLockOwner = null;
  }

  if (backend !== 'redis' || !redisService.isConnected || !redisService.client) {
    return;
  }

  try {
    const currentOwner = await redisService.get(BATCH_LOCK_KEY);
    if (currentOwner === owner) {
      await redisService.del(BATCH_LOCK_KEY);
    }
  } catch (error) {
    console.warn(`[IntroBatch] Failed to release Redis lock: ${error.message}`);
  }
}

async function saveLatestBatchSummary(summary) {
  latestBatchSummary = summary;
  await redisService.set(BATCH_LATEST_KEY, summary, 7 * 24 * 60 * 60);
}

async function getLatestIntroDetectionBatch() {
  return (await redisService.get(BATCH_LATEST_KEY)) || latestBatchSummary;
}

async function findEligibleIntroDetectionMovies(rawOptions = {}) {
  const options = normalizeBatchOptions(rawOptions);
  const completedStatuses = getCompletedStatuses(options);
  const statusExpression = { $ifNull: ['$playbackMeta.detection.status', 'none'] };

  const groupedEpisodes = await Episode.aggregate([
    {
      $match: {
        link_m3u8: { $type: 'string', $ne: '' },
      },
    },
    {
      $group: {
        _id: '$movieId',
        episodeCount: { $sum: 1 },
        pendingCount: {
          $sum: {
            $cond: [{ $in: [statusExpression, completedStatuses] }, 0, 1],
          },
        },
        approvedCount: {
          $sum: {
            $cond: [{ $eq: [statusExpression, 'approved'] }, 1, 0],
          },
        },
        detectedCount: {
          $sum: {
            $cond: [{ $in: [statusExpression, ['detected', 'needs_review', 'approved']] }, 1, 0],
          },
        },
      },
    },
    {
      $match: {
        episodeCount: { $gte: 2, $lte: options.maxEpisodesPerMovie },
        pendingCount: { $gt: 0 },
      },
    },
    {
      $sort: {
        pendingCount: -1,
        episodeCount: -1,
        _id: 1,
      },
    },
    {
      $limit: Math.max(options.maxMovies * 2, options.maxMovies),
    },
  ]);

  if (groupedEpisodes.length === 0) return [];

  const movieIds = groupedEpisodes.map((item) => item._id).filter(Boolean);
  const movieQuery = { _id: { $in: movieIds } };
  if (!options.includeHidden) {
    movieQuery.isHidden = { $ne: true };
  }

  const movies = await Movie.find(movieQuery)
    .select('_id name original_name slug isHidden')
    .lean();
  const movieById = new Map(movies.map((movie) => [movie._id.toString(), movie]));

  return groupedEpisodes
    .map((item) => {
      const movie = movieById.get(item._id?.toString());
      if (!movie) return null;

      return {
        movieId: movie._id.toString(),
        movieName: movie.name,
        slug: movie.slug,
        episodeCount: item.episodeCount,
        pendingCount: item.pendingCount,
        approvedCount: item.approvedCount,
        detectedCount: item.detectedCount,
      };
    })
    .filter(Boolean)
    .slice(0, options.maxMovies);
}

async function waitForIntroDetectionJob(jobId, options = {}) {
  const startedAt = Date.now();
  const pollMs = parseIntOption(options.pollMs, 5000, 1000, 60000);
  const timeoutMs = parseIntOption(options.jobTimeoutMs, 25 * 60 * 1000, 60 * 1000, 60 * 60 * 1000);

  while (Date.now() - startedAt <= timeoutMs) {
    const status = await getIntroDetectionJobStatus(jobId);
    if (!status) {
      throw new Error(`Intro detection job ${jobId} not found`);
    }

    if (status.state === 'completed') return status;
    if (status.state === 'failed') {
      throw new Error(status.failedReason || `Intro detection job ${jobId} failed`);
    }

    await sleep(pollMs);
  }

  throw new Error(`Intro detection job ${jobId} timed out after ${timeoutMs}ms`);
}

function summarizeMovieDetectionResult(result = {}) {
  const detectedEpisodes = Number(result.detectedEpisodes) || 0;
  const inferredEpisodes = Number(result.inferredEpisodes) || 0;
  const noMatchEpisodes = Number(result.noMatchEpisodes) || 0;

  if (detectedEpisodes > 0 || inferredEpisodes > 0) {
    return 'detected';
  }

  if (noMatchEpisodes > 0) {
    return 'no_match';
  }

  return 'completed';
}

function getQueueSkipReason(queueState = {}) {
  if (queueState.requiresPersistentQueue && !queueState.hasPersistentQueue) {
    return queueState.unavailableReason || 'persistent intro detection queue is unavailable';
  }

  return null;
}

async function runIntroDetectionBatch(rawOptions = {}) {
  const options = normalizeBatchOptions(rawOptions);
  const batchId = rawOptions.batchId || createBatchId();
  const startedAt = new Date();
  const queueState = getIntroDetectionQueueState();
  const queueSkipReason = getQueueSkipReason(queueState);

  if (queueSkipReason) {
    const skipped = {
      batchId,
      state: 'skipped',
      reason: queueSkipReason,
      queueBackend: queueState.backend,
      startedAt,
      finishedAt: new Date(),
    };
    await saveLatestBatchSummary(skipped);
    return skipped;
  }

  const lock = await acquireBatchLock(batchId, options.lockTtlSec);

  if (!lock.acquired) {
    const skipped = {
      batchId,
      state: 'skipped',
      reason: lock.reason || 'batch lock is already held',
      lockBackend: lock.backend,
      startedAt,
      finishedAt: new Date(),
    };
    await saveLatestBatchSummary(skipped);
    return skipped;
  }

  const summary = {
    batchId,
    state: 'running',
    trigger: rawOptions.trigger || 'manual',
    lockBackend: lock.backend,
    startedAt,
    finishedAt: null,
    totalMovies: 0,
    processedMovies: 0,
    detectedMovies: 0,
    noMatchMovies: 0,
    failedMovies: 0,
    skippedMovies: 0,
    stoppedReason: null,
    errors: [],
  };

  try {
    const movies = await findEligibleIntroDetectionMovies(options);
    summary.totalMovies = movies.length;
    await saveLatestBatchSummary(summary);

    console.log(`[IntroBatch] ${batchId} started: ${movies.length} eligible movies`);

    for (const movie of movies) {
      if (Date.now() - startedAt.getTime() > options.maxRuntimeMs) {
        summary.stoppedReason = 'max_runtime';
        console.warn(`[IntroBatch] ${batchId} stopped by max runtime after ${summary.processedMovies} movies`);
        break;
      }

      try {
        console.log(
          `[IntroBatch] Detecting ${movie.movieName} (${movie.movieId}) pending=${movie.pendingCount}/${movie.episodeCount}`,
        );

        const job = await addIntroDetectionJob(movie.movieId, {
          ...options.detectionOptions,
          batchId,
        });
        const status = await waitForIntroDetectionJob(job.id, options);
        const resultType = summarizeMovieDetectionResult(status.result);

        summary.processedMovies += 1;
        if (resultType === 'detected') summary.detectedMovies += 1;
        else if (resultType === 'no_match') summary.noMatchMovies += 1;
        else summary.skippedMovies += 1;

        console.log(
          `[IntroBatch] ${movie.movieName} done: ${resultType} job=${job.id}`,
        );
      } catch (error) {
        summary.processedMovies += 1;
        summary.failedMovies += 1;
        summary.errors.push({
          movieId: movie.movieId,
          movieName: movie.movieName,
          message: error.message,
        });
        console.error(`[IntroBatch] ${movie.movieName} failed: ${error.message}`);
      }

      await saveLatestBatchSummary(summary);
      await sleep(options.betweenJobsMs);
    }

    summary.state = summary.failedMovies > 0 ? 'completed_with_errors' : 'completed';
    summary.finishedAt = new Date();
    await saveLatestBatchSummary(summary);

    console.log(
      `[IntroBatch] ${batchId} finished: processed=${summary.processedMovies}/${summary.totalMovies}, detected=${summary.detectedMovies}, no_match=${summary.noMatchMovies}, failed=${summary.failedMovies}`,
    );

    return summary;
  } catch (error) {
    summary.state = 'failed';
    summary.finishedAt = new Date();
    summary.errors.push({ message: error.message });
    await saveLatestBatchSummary(summary);
    console.error(`[IntroBatch] ${batchId} failed: ${error.message}`);
    return summary;
  } finally {
    await releaseBatchLock(batchId, lock.backend);
  }
}

module.exports = {
  findEligibleIntroDetectionMovies,
  getCompletedStatuses,
  getLatestIntroDetectionBatch,
  getQueueSkipReason,
  normalizeBatchOptions,
  runIntroDetectionBatch,
  summarizeMovieDetectionResult,
  waitForIntroDetectionJob,
};
