const mongoose = require('mongoose');
const IntroDetectionBatchRun = require('../models/introDetectionBatchRun.model');

const VALID_STATES = new Set(['running', 'completed', 'completed_with_errors', 'failed', 'skipped']);
const VALID_MOVIE_STATES = new Set(['pending', 'processing', 'completed', 'failed', 'skipped']);
const VALID_MOVIE_RESULTS = new Set(['none', 'detected', 'no_match', 'completed', 'failed', 'skipped']);
const VALID_STATS_PERIODS = new Set(['day', 'week', 'month']);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;
const DEFAULT_STATS_DAYS = 30;
const MAX_STATS_DAYS = 366;
const MAX_STATS_RUNS = 2000;

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseIntOption(value, fallback, min, max) {
  const parsed = Number.parseInt(value, 10);
  const nextValue = Number.isFinite(parsed) ? parsed : fallback;
  return clamp(nextValue, min, max);
}

function normalizeObjectId(value) {
  if (!value || !mongoose.Types.ObjectId.isValid(value)) return null;
  return new mongoose.Types.ObjectId(value);
}

function normalizeDate(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function normalizeNumber(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function createBadRequestError(message) {
  const error = new Error(message);
  error.statusCode = 400;
  return error;
}

function getBatchRunQuery(batchId) {
  if (!batchId) return null;

  return mongoose.Types.ObjectId.isValid(batchId)
    ? { $or: [{ batchId }, { _id: batchId }] }
    : { batchId };
}

function sanitizeShortText(value, maxLength = 80) {
  return String(value || '').trim().slice(0, maxLength);
}

function sanitizeTimezone(value) {
  const timezone = sanitizeShortText(value || 'Asia/Ho_Chi_Minh', 80);
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: timezone }).format(new Date());
    return timezone;
  } catch (_error) {
    return 'Asia/Ho_Chi_Minh';
  }
}

function addDays(date, days) {
  const nextDate = new Date(date);
  nextDate.setUTCDate(nextDate.getUTCDate() + days);
  return nextDate;
}

function normalizeStatsDateRange(rawQuery = {}) {
  const now = new Date();
  let from = normalizeDate(rawQuery.from);
  let to = normalizeDate(rawQuery.to);

  if (!from && !to) {
    to = now;
    from = addDays(to, -DEFAULT_STATS_DAYS);
  } else if (from && !to) {
    to = addDays(from, DEFAULT_STATS_DAYS);
    if (to > now) to = now;
  } else if (!from && to) {
    from = addDays(to, -DEFAULT_STATS_DAYS);
  }

  if (from && to && from > to) {
    throw createBadRequestError('from must be before to');
  }

  if (from && to && to.getTime() - from.getTime() > MAX_STATS_DAYS * 24 * 60 * 60 * 1000) {
    throw createBadRequestError(`Stats date range cannot exceed ${MAX_STATS_DAYS} days`);
  }

  return { from, to };
}

function getLocalDateParts(date, timezone) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const values = {};
  parts.forEach((part) => {
    if (part.type !== 'literal') {
      values[part.type] = part.value;
    }
  });

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    isoDate: `${values.year}-${values.month}-${values.day}`,
  };
}

function getIsoWeek(year, month, day) {
  const date = new Date(Date.UTC(year, month - 1, day));
  const dayNumber = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNumber);

  const weekYear = date.getUTCFullYear();
  const yearStart = new Date(Date.UTC(weekYear, 0, 1));
  const week = Math.ceil((((date - yearStart) / 86400000) + 1) / 7);
  return { weekYear, week };
}

function getStatsPeriodKey(date, period = 'day', timezone = 'Asia/Ho_Chi_Minh') {
  const parts = getLocalDateParts(date, timezone);

  if (period === 'month') {
    return {
      key: `${parts.year}-${String(parts.month).padStart(2, '0')}`,
      label: `${parts.year}-${String(parts.month).padStart(2, '0')}`,
    };
  }

  if (period === 'week') {
    const { weekYear, week } = getIsoWeek(parts.year, parts.month, parts.day);
    const weekKey = `${weekYear}-W${String(week).padStart(2, '0')}`;
    return { key: weekKey, label: weekKey };
  }

  return { key: parts.isoDate, label: parts.isoDate };
}

function createStatsBucket(key = 'total', label = 'Total') {
  return {
    key,
    label,
    runs: 0,
    totalMovies: 0,
    processedMovies: 0,
    detectedMovies: 0,
    noMatchMovies: 0,
    failedMovies: 0,
    skippedMovies: 0,
    durationMs: 0,
    states: {},
    triggers: {},
    resultTypes: {},
    prioritySources: {},
    audioTypes: {},
    failureMessages: {},
  };
}

function incrementCounter(target, key, amount = 1) {
  const normalizedKey = key || 'unknown';
  target[normalizedKey] = (target[normalizedKey] || 0) + amount;
}

function finalizeStatsBucket(bucket) {
  const processedMovies = bucket.processedMovies || 0;
  const runs = bucket.runs || 0;

  return {
    ...bucket,
    successRate: processedMovies > 0 ? bucket.detectedMovies / processedMovies : 0,
    noMatchRate: processedMovies > 0 ? bucket.noMatchMovies / processedMovies : 0,
    failureRate: processedMovies > 0 ? bucket.failedMovies / processedMovies : 0,
    averageDurationMs: runs > 0 ? Math.round(bucket.durationMs / runs) : 0,
    averageMoviesPerRun: runs > 0 ? Number((bucket.totalMovies / runs).toFixed(2)) : 0,
  };
}

function addRunToStatsBucket(bucket, run = {}) {
  const hasErrorItems = Array.isArray(run.errorItems) && run.errorItems.length > 0;

  bucket.runs += 1;
  bucket.totalMovies += normalizeNumber(run.totalMovies);
  bucket.processedMovies += normalizeNumber(run.processedMovies);
  bucket.detectedMovies += normalizeNumber(run.detectedMovies);
  bucket.noMatchMovies += normalizeNumber(run.noMatchMovies);
  bucket.failedMovies += normalizeNumber(run.failedMovies);
  bucket.skippedMovies += normalizeNumber(run.skippedMovies);
  bucket.durationMs += normalizeNumber(run.durationMs);
  incrementCounter(bucket.states, run.state);
  incrementCounter(bucket.triggers, run.trigger);

  if (Array.isArray(run.movies)) {
    run.movies.forEach((movie) => {
      incrementCounter(bucket.resultTypes, movie.resultType);
      incrementCounter(bucket.prioritySources, movie.prioritySource);
      incrementCounter(bucket.audioTypes, movie.primaryAudioType);

      const message = movie.error?.message;
      if (!hasErrorItems && message) incrementCounter(bucket.failureMessages, message);
    });
  }

  if (hasErrorItems) {
    run.errorItems.forEach((error) => {
      if (error?.message) incrementCounter(bucket.failureMessages, error.message);
    });
  }
}

function summarizeBatchRuns(runs = [], options = {}) {
  const period = VALID_STATS_PERIODS.has(options.period) ? options.period : 'day';
  const timezone = sanitizeTimezone(options.timezone);
  const sortDirection = options.sort === 'desc' ? 'desc' : 'asc';
  const totals = createStatsBucket('total', 'Total');
  const groupsByKey = new Map();

  runs.forEach((run) => {
    const startedAt = normalizeDate(run.startedAt) || new Date();
    const { key, label } = getStatsPeriodKey(startedAt, period, timezone);
    if (!groupsByKey.has(key)) {
      groupsByKey.set(key, createStatsBucket(key, label));
    }

    addRunToStatsBucket(totals, run);
    addRunToStatsBucket(groupsByKey.get(key), run);
  });

  const groups = Array.from(groupsByKey.values())
    .map(finalizeStatsBucket)
    .sort((a, b) => (sortDirection === 'desc' ? b.key.localeCompare(a.key) : a.key.localeCompare(b.key)));

  return {
    period,
    timezone,
    totals: finalizeStatsBucket(totals),
    groups,
  };
}

function normalizeDetection(detection = {}) {
  return {
    episodeId: normalizeObjectId(detection.episodeId),
    episodeNumber: detection.episodeNumber ?? null,
    introStartSec: detection.introStartSec ?? null,
    introEndSec: detection.introEndSec ?? null,
    confidence: normalizeNumber(detection.confidence),
    votes: normalizeNumber(detection.votes),
  };
}

function normalizeBatchMovie(movie = {}) {
  return {
    movieId: normalizeObjectId(movie.movieId),
    movieName: movie.movieName || '',
    slug: movie.slug || '',
    prioritySource: movie.prioritySource || 'unknown',
    priorityRank: normalizeNumber(movie.priorityRank),
    priorityViews: normalizeNumber(movie.priorityViews),
    priorityWatchTime: normalizeNumber(movie.priorityWatchTime),
    viewCount: normalizeNumber(movie.viewCount),
    episodeCount: normalizeNumber(movie.episodeCount),
    pendingCount: normalizeNumber(movie.pendingCount),
    approvedCount: normalizeNumber(movie.approvedCount),
    detectedCount: normalizeNumber(movie.detectedCount),
    state: movie.state || 'pending',
    resultType: movie.resultType || 'none',
    jobId: movie.jobId || null,
    queueBackend: movie.queueBackend || null,
    startedAt: normalizeDate(movie.startedAt),
    finishedAt: normalizeDate(movie.finishedAt),
    durationMs: normalizeNumber(movie.durationMs),
    selectionMode: movie.selectionMode || null,
    eligibleEpisodes: normalizeNumber(movie.eligibleEpisodes),
    sampledEpisodes: normalizeNumber(movie.sampledEpisodes),
    detectedEpisodes: normalizeNumber(movie.detectedEpisodes),
    inferredEpisodes: normalizeNumber(movie.inferredEpisodes),
    noMatchEpisodes: normalizeNumber(movie.noMatchEpisodes),
    audioStrategy: movie.audioStrategy || null,
    primaryAudioType: movie.primaryAudioType || null,
    copiedEpisodes: normalizeNumber(movie.copiedEpisodes),
    copiedIntroEpisodes: normalizeNumber(movie.copiedIntroEpisodes),
    copiedNoMatchEpisodes: normalizeNumber(movie.copiedNoMatchEpisodes),
    detections: Array.isArray(movie.detections) ? movie.detections.map(normalizeDetection) : [],
    error: {
      message: movie.error?.message || movie.message || '',
    },
  };
}

function normalizeError(error = {}) {
  return {
    movieId: normalizeObjectId(error.movieId),
    movieName: error.movieName || '',
    message: error.message || '',
  };
}

function normalizeOptions(options = {}) {
  const detectionOptions = options.detectionOptions || {};

  return {
    maxMovies: normalizeNumber(options.maxMovies, 30),
    maxEpisodesPerMovie: normalizeNumber(options.maxEpisodesPerMovie, 120),
    includeHidden: options.includeHidden === true,
    retryNoMatch: options.retryNoMatch === true,
    sampleSize: normalizeNumber(detectionOptions.sampleSize ?? options.sampleSize, 5),
    sampleSeconds: normalizeNumber(detectionOptions.sampleSeconds ?? options.sampleSeconds, 600),
    applySeasonDefault:
      (detectionOptions.applySeasonDefault ?? options.applySeasonDefault) !== false,
  };
}

function normalizeViewWindow(viewWindow = {}, timezone = 'Asia/Ho_Chi_Minh') {
  return {
    start: normalizeDate(viewWindow.start),
    end: normalizeDate(viewWindow.end),
    localDate: viewWindow.localDate || '',
    timezone: viewWindow.timezone || timezone,
  };
}

function normalizeBatchRun(summary = {}) {
  const startedAt = normalizeDate(summary.startedAt) || new Date();
  const finishedAt = normalizeDate(summary.finishedAt);
  const timezone = summary.timezone || summary.viewWindow?.timezone || 'Asia/Ho_Chi_Minh';

  return {
    batchId: String(summary.batchId),
    trigger: summary.trigger || 'manual',
    state: VALID_STATES.has(summary.state) ? summary.state : 'running',
    reason: summary.reason || '',
    stoppedReason: summary.stoppedReason || null,
    lockBackend: summary.lockBackend || null,
    queueBackend: summary.queueBackend || null,
    startedAt,
    finishedAt,
    durationMs: finishedAt ? Math.max(0, finishedAt.getTime() - startedAt.getTime()) : 0,
    timezone,
    viewWindow: normalizeViewWindow(summary.viewWindow, timezone),
    options: normalizeOptions(summary.options),
    totalMovies: normalizeNumber(summary.totalMovies),
    processedMovies: normalizeNumber(summary.processedMovies),
    detectedMovies: normalizeNumber(summary.detectedMovies),
    noMatchMovies: normalizeNumber(summary.noMatchMovies),
    failedMovies: normalizeNumber(summary.failedMovies),
    skippedMovies: normalizeNumber(summary.skippedMovies),
    movies: Array.isArray(summary.movies) ? summary.movies.map(normalizeBatchMovie) : [],
    errorItems: Array.isArray(summary.errors) ? summary.errors.map(normalizeError) : [],
  };
}

function serializeBatchRun(doc, { includeMovies = true } = {}) {
  if (!doc) return null;
  const data = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  data.errors = Array.isArray(data.errorItems) ? data.errorItems : [];
  delete data.errorItems;

  if (!includeMovies) {
    const { movies: _movies, ...rest } = data;
    return rest;
  }

  return data;
}

async function upsertIntroDetectionBatchRun(summary = {}) {
  if (!summary.batchId) return null;
  const payload = normalizeBatchRun(summary);

  const doc = await IntroDetectionBatchRun.findOneAndUpdate(
    { batchId: payload.batchId },
    { $set: payload },
    { upsert: true, new: true, setDefaultsOnInsert: true },
  ).lean();

  return serializeBatchRun(doc);
}

async function getLatestIntroDetectionBatchRun(options = {}) {
  const doc = await IntroDetectionBatchRun.findOne({})
    .sort({ startedAt: -1 })
    .select(options.includeMovies === false ? '-movies' : '')
    .lean();
  return serializeBatchRun(doc, { includeMovies: options.includeMovies !== false });
}

async function getIntroDetectionBatchRun(batchId) {
  const query = getBatchRunQuery(batchId);
  if (!query) return null;

  const doc = await IntroDetectionBatchRun.findOne(query).lean();
  return serializeBatchRun(doc);
}

function serializeBatchMeta(doc) {
  if (!doc) return null;
  const { movies: _movies, errorItems, ...batch } = typeof doc.toObject === 'function' ? doc.toObject() : doc;
  batch.errors = Array.isArray(errorItems) ? errorItems : [];
  return batch;
}

function filterBatchMovies(movies = [], rawQuery = {}) {
  const state = VALID_MOVIE_STATES.has(rawQuery.state) ? rawQuery.state : null;
  const resultType = VALID_MOVIE_RESULTS.has(rawQuery.resultType) ? rawQuery.resultType : null;
  const prioritySource = sanitizeShortText(rawQuery.prioritySource, 60);
  const search = sanitizeShortText(rawQuery.search, 120).toLowerCase();

  return movies
    .map((movie, index) => ({ ...movie, order: index + 1 }))
    .filter((movie) => {
      if (state && movie.state !== state) return false;
      if (resultType && movie.resultType !== resultType) return false;
      if (prioritySource && movie.prioritySource !== prioritySource) return false;
      if (!search) return true;

      const haystack = [
        movie.movieName,
        movie.slug,
        movie.prioritySource,
        movie.primaryAudioType,
        movie.error?.message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      return haystack.includes(search);
    });
}

function sortBatchMovies(movies = [], rawQuery = {}) {
  const sort = sanitizeShortText(rawQuery.sort, 30);
  const direction = rawQuery.direction === 'desc' ? -1 : 1;
  const sorted = [...movies];

  const compareNumbers = (left, right, field) =>
    (normalizeNumber(left[field]) - normalizeNumber(right[field])) * direction;
  const compareStrings = (left, right, field) =>
    String(left[field] || '').localeCompare(String(right[field] || ''), 'vi') * direction;

  if (sort === 'movieName') {
    return sorted.sort((left, right) => compareStrings(left, right, 'movieName'));
  }

  if (
    sort === 'durationMs' ||
    sort === 'episodeCount' ||
    sort === 'eligibleEpisodes' ||
    sort === 'sampledEpisodes' ||
    sort === 'detectedEpisodes' ||
    sort === 'noMatchEpisodes' ||
    sort === 'copiedEpisodes'
  ) {
    return sorted.sort((left, right) => compareNumbers(left, right, sort));
  }

  if (sort === 'resultType' || sort === 'prioritySource' || sort === 'state') {
    return sorted.sort((left, right) => compareStrings(left, right, sort));
  }

  return sorted.sort((left, right) => left.order - right.order);
}

async function listIntroDetectionBatchMovies(batchId, rawQuery = {}) {
  const query = getBatchRunQuery(batchId);
  if (!query) return null;

  const page = parseIntOption(rawQuery.page, 1, 1, 100000);
  const limit = parseIntOption(rawQuery.limit, 25, 1, MAX_LIMIT);
  const skip = (page - 1) * limit;
  const doc = await IntroDetectionBatchRun.findOne(query).lean();
  if (!doc) return null;

  const filteredMovies = sortBatchMovies(filterBatchMovies(doc.movies || [], rawQuery), rawQuery);
  const total = filteredMovies.length;

  return {
    batch: serializeBatchMeta(doc),
    items: filteredMovies.slice(skip, skip + limit),
    filters: {
      state: VALID_MOVIE_STATES.has(rawQuery.state) ? rawQuery.state : null,
      resultType: VALID_MOVIE_RESULTS.has(rawQuery.resultType) ? rawQuery.resultType : null,
      prioritySource: sanitizeShortText(rawQuery.prioritySource, 60) || null,
      search: sanitizeShortText(rawQuery.search, 120) || null,
    },
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function listIntroDetectionBatchRuns(rawQuery = {}) {
  const page = parseIntOption(rawQuery.page, 1, 1, 100000);
  const limit = parseIntOption(rawQuery.limit, DEFAULT_LIMIT, 1, MAX_LIMIT);
  const skip = (page - 1) * limit;
  const query = {};

  if (rawQuery.state && VALID_STATES.has(rawQuery.state)) {
    query.state = rawQuery.state;
  }

  if (rawQuery.trigger) {
    query.trigger = String(rawQuery.trigger).trim().slice(0, 50);
  }

  if (rawQuery.movieId && mongoose.Types.ObjectId.isValid(rawQuery.movieId)) {
    query['movies.movieId'] = new mongoose.Types.ObjectId(rawQuery.movieId);
  }

  const startedAt = {};
  const from = normalizeDate(rawQuery.from);
  const to = normalizeDate(rawQuery.to);
  if (from) startedAt.$gte = from;
  if (to) startedAt.$lte = to;
  if (Object.keys(startedAt).length > 0) {
    query.startedAt = startedAt;
  }

  const [items, total] = await Promise.all([
    IntroDetectionBatchRun.find(query)
      .sort({ startedAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-movies')
      .lean(),
    IntroDetectionBatchRun.countDocuments(query),
  ]);

  return {
    items: items.map((item) => serializeBatchRun(item, { includeMovies: false })),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

async function getIntroDetectionBatchStats(rawQuery = {}) {
  const period = VALID_STATS_PERIODS.has(rawQuery.period) ? rawQuery.period : 'day';
  const timezone = sanitizeTimezone(rawQuery.timezone);
  const sort = rawQuery.sort === 'desc' ? 'desc' : 'asc';
  const limit = parseIntOption(rawQuery.limit, 500, 1, MAX_STATS_RUNS);
  const { from, to } = normalizeStatsDateRange(rawQuery);
  const query = {};

  if (rawQuery.state && VALID_STATES.has(rawQuery.state)) {
    query.state = rawQuery.state;
  }

  if (rawQuery.trigger) {
    query.trigger = sanitizeShortText(rawQuery.trigger, 50);
  }

  if (rawQuery.movieId && mongoose.Types.ObjectId.isValid(rawQuery.movieId)) {
    query['movies.movieId'] = new mongoose.Types.ObjectId(rawQuery.movieId);
  }

  if (from || to) {
    query.startedAt = {};
    if (from) query.startedAt.$gte = from;
    if (to) query.startedAt.$lte = to;
  }

  const runs = await IntroDetectionBatchRun.find(query)
    .sort({ startedAt: -1 })
    .limit(limit)
    .select(
      'batchId trigger state startedAt finishedAt durationMs timezone viewWindow options totalMovies processedMovies detectedMovies noMatchMovies failedMovies skippedMovies movies.movieName movies.resultType movies.prioritySource movies.primaryAudioType movies.error errorItems',
    )
    .lean();

  const summary = summarizeBatchRuns(runs, { period, timezone, sort });

  return {
    ...summary,
    range: { from, to },
    runLimit: limit,
    truncated: runs.length >= limit,
  };
}

module.exports = {
  filterBatchMovies,
  getIntroDetectionBatchStats,
  getIntroDetectionBatchRun,
  getLatestIntroDetectionBatchRun,
  getStatsPeriodKey,
  listIntroDetectionBatchMovies,
  listIntroDetectionBatchRuns,
  normalizeBatchRun,
  summarizeBatchRuns,
  upsertIntroDetectionBatchRun,
};
