const mongoose = require('mongoose');
const IntroDetectionBatchRun = require('../models/introDetectionBatchRun.model');

const VALID_STATES = new Set(['running', 'completed', 'completed_with_errors', 'failed', 'skipped']);
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

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
  if (!batchId) return null;

  const query = mongoose.Types.ObjectId.isValid(batchId)
    ? { $or: [{ batchId }, { _id: batchId }] }
    : { batchId };

  const doc = await IntroDetectionBatchRun.findOne(query).lean();
  return serializeBatchRun(doc);
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

module.exports = {
  getIntroDetectionBatchRun,
  getLatestIntroDetectionBatchRun,
  listIntroDetectionBatchRuns,
  normalizeBatchRun,
  upsertIntroDetectionBatchRun,
};
