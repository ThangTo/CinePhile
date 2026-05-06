const crypto = require('crypto');
const moment = require('moment-timezone');
const Movie = require('../models/movie.model');
const Episode = require('../models/episode.model');
const ViewHistory = require('../models/view_history.model');
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
const DEFAULT_BATCH_TIMEZONE = 'Asia/Ho_Chi_Minh';

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

function buildValidIntroRangeExpression() {
  return {
    $and: [
      { $eq: ['$playbackMeta.intro.enabled', true] },
      { $gte: ['$playbackMeta.intro.startSec', 0] },
      { $gt: ['$playbackMeta.intro.endSec', '$playbackMeta.intro.startSec'] },
    ],
  };
}

function buildCompletedDetectionExpression(completedStatuses = DEFAULT_COMPLETED_STATUSES) {
  const statusExpression = { $ifNull: ['$playbackMeta.detection.status', 'none'] };
  const rangeStatuses = completedStatuses.filter((status) => status !== 'no_match');
  const completedClauses = [
    {
      $and: [
        { $in: [statusExpression, rangeStatuses] },
        buildValidIntroRangeExpression(),
      ],
    },
  ];

  if (completedStatuses.includes('no_match')) {
    completedClauses.push({ $eq: [statusExpression, 'no_match'] });
  }

  return { $or: completedClauses };
}

function compareObjectIdAsc(first, second) {
  return String(first.movieId || first._id || '').localeCompare(String(second.movieId || second._id || ''));
}

function getPreviousLocalDayWindow(timezone = DEFAULT_BATCH_TIMEZONE, now = new Date()) {
  const localDay = moment(now).tz(timezone).subtract(1, 'day');
  return {
    start: localDay.clone().startOf('day').toDate(),
    end: localDay.clone().endOf('day').toDate(),
    timezone,
    localDate: localDay.format('YYYY-MM-DD'),
  };
}

function rankIntroDetectionCandidates({
  eligibleMovies = [],
  recentViews = [],
  maxMovies = 30,
} = {}) {
  const eligibleById = new Map(
    eligibleMovies
      .filter((movie) => movie?.movieId)
      .map((movie) => [String(movie.movieId), movie]),
  );
  const picked = new Set();
  const ranked = [];

  const addMovie = (movie, prioritySource, extra = {}) => {
    if (!movie?.movieId) return;
    const movieId = String(movie.movieId);
    if (picked.has(movieId) || ranked.length >= maxMovies) return;
    picked.add(movieId);
    ranked.push({
      ...movie,
      ...extra,
      prioritySource,
      priorityRank: ranked.length + 1,
    });
  };

  [...recentViews]
    .filter((item) => eligibleById.has(String(item.movieId)))
    .sort((first, second) => {
      const watchDelta = (Number(second.totalWatchTime) || 0) - (Number(first.totalWatchTime) || 0);
      if (watchDelta !== 0) return watchDelta;
      const viewDelta = (Number(second.views) || 0) - (Number(first.views) || 0);
      if (viewDelta !== 0) return viewDelta;
      return String(first.movieId).localeCompare(String(second.movieId));
    })
    .forEach((item) => {
      const movie = eligibleById.get(String(item.movieId));
      addMovie(movie, 'recent_views', {
        priorityViews: Number(item.views) || 0,
        priorityWatchTime: Number(item.totalWatchTime) || 0,
      });
    });

  [...eligibleMovies]
    .filter((movie) => movie.isFeatured)
    .sort((first, second) => {
      const viewDelta = (Number(second.viewCount) || 0) - (Number(first.viewCount) || 0);
      if (viewDelta !== 0) return viewDelta;
      const updatedDelta = new Date(second.updatedAt || 0).getTime() - new Date(first.updatedAt || 0).getTime();
      if (updatedDelta !== 0) return updatedDelta;
      return compareObjectIdAsc(first, second);
    })
    .forEach((movie) => addMovie(movie, 'banner'));

  [...eligibleMovies]
    .filter((movie) => (Number(movie.viewCount) || 0) > 0)
    .sort((first, second) => {
      const viewDelta = (Number(second.viewCount) || 0) - (Number(first.viewCount) || 0);
      if (viewDelta !== 0) return viewDelta;
      return compareObjectIdAsc(first, second);
    })
    .forEach((movie) => addMovie(movie, 'total_views'));

  [...eligibleMovies]
    .sort((first, second) => {
      const pendingDelta = (Number(second.pendingCount) || 0) - (Number(first.pendingCount) || 0);
      if (pendingDelta !== 0) return pendingDelta;
      const episodeDelta = (Number(second.episodeCount) || 0) - (Number(first.episodeCount) || 0);
      if (episodeDelta !== 0) return episodeDelta;
      return compareObjectIdAsc(first, second);
    })
    .forEach((movie) => addMovie(movie, 'backlog'));

  return ranked.slice(0, maxMovies);
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

async function getRecentViewPriorities(options = {}) {
  const timezone = options.timezone || process.env.INTRO_BATCH_TIMEZONE || DEFAULT_BATCH_TIMEZONE;
  const window = options.viewWindow || getPreviousLocalDayWindow(timezone, options.now || new Date());
  const limit = Math.max(options.maxMovies * 20, 200);

  const data = await ViewHistory.aggregate([
    {
      $match: {
        createdAt: { $gte: window.start, $lte: window.end },
        movieId: { $ne: null },
      },
    },
    {
      $group: {
        _id: '$movieId',
        views: { $sum: 1 },
        totalWatchTime: { $sum: '$watchDuration' },
      },
    },
    {
      $sort: {
        totalWatchTime: -1,
        views: -1,
        _id: 1,
      },
    },
    {
      $limit: limit,
    },
  ]);

  return data.map((item) => ({
    movieId: item._id?.toString(),
    views: item.views,
    totalWatchTime: item.totalWatchTime,
  }));
}

async function findEligibleIntroDetectionMovies(rawOptions = {}) {
  const options = normalizeBatchOptions(rawOptions);
  const completedStatuses = getCompletedStatuses(options);
  const statusExpression = { $ifNull: ['$playbackMeta.detection.status', 'none'] };
  const completedDetectionExpression = buildCompletedDetectionExpression(completedStatuses);
  const detectedWithIntroExpression = {
    $and: [
      { $in: [statusExpression, ['detected', 'needs_review', 'approved']] },
      buildValidIntroRangeExpression(),
    ],
  };

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
            $cond: [completedDetectionExpression, 0, 1],
          },
        },
        approvedCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: [statusExpression, 'approved'] },
                  buildValidIntroRangeExpression(),
                ],
              },
              1,
              0,
            ],
          },
        },
        detectedCount: {
          $sum: {
            $cond: [detectedWithIntroExpression, 1, 0],
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
  ]);

  if (groupedEpisodes.length === 0) return [];

  const movieIds = groupedEpisodes.map((item) => item._id).filter(Boolean);
  const movieQuery = { _id: { $in: movieIds } };
  if (!options.includeHidden) {
    movieQuery.isHidden = { $ne: true };
  }

  const movies = await Movie.find(movieQuery)
    .select('_id name original_name slug isHidden isFeatured viewCount updatedAt')
    .lean();
  const movieById = new Map(movies.map((movie) => [movie._id.toString(), movie]));

  const eligibleMovies = groupedEpisodes
    .map((item) => {
      const movie = movieById.get(item._id?.toString());
      if (!movie) return null;

      return {
        movieId: movie._id.toString(),
        movieName: movie.name,
        slug: movie.slug,
        isFeatured: movie.isFeatured === true,
        viewCount: Number(movie.viewCount) || 0,
        updatedAt: movie.updatedAt || null,
        episodeCount: item.episodeCount,
        pendingCount: item.pendingCount,
        approvedCount: item.approvedCount,
        detectedCount: item.detectedCount,
      };
    })
    .filter(Boolean);

  const recentViews = await getRecentViewPriorities(options);
  return rankIntroDetectionCandidates({
    eligibleMovies,
    recentViews,
    maxMovies: options.maxMovies,
  });
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
          `[IntroBatch] Detecting ${movie.movieName} (${movie.movieId}) priority=${movie.prioritySource || 'unknown'} pending=${movie.pendingCount}/${movie.episodeCount}`,
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
  buildCompletedDetectionExpression,
  findEligibleIntroDetectionMovies,
  getCompletedStatuses,
  getLatestIntroDetectionBatch,
  getPreviousLocalDayWindow,
  getQueueSkipReason,
  rankIntroDetectionCandidates,
  normalizeBatchOptions,
  runIntroDetectionBatch,
  summarizeMovieDetectionResult,
  waitForIntroDetectionJob,
};
