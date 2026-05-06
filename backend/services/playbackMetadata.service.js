const mongoose = require('mongoose');
const Movie = require('../models/movie.model');
const Episode = require('../models/episode.model');

const VALID_DETECTION_STATUSES = new Set([
  'none',
  'queued',
  'processing',
  'detected',
  'needs_review',
  'approved',
  'failed',
  'no_match',
]);
const VALID_SOURCES = new Set(['none', 'manual', 'auto']);

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function parseOptionalSeconds(value, fieldName) {
  if (value === undefined || value === null || value === '') return null;

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`${fieldName} must be a non-negative number`);
  }

  return Math.round(parsed);
}

function normalizeRange(input, prefix, options = {}) {
  const start = parseOptionalSeconds(input[`${prefix}StartSec`], `${prefix} start`);
  const end = parseOptionalSeconds(input[`${prefix}EndSec`], `${prefix} end`);

  if (start === null && end === null) {
    return {
      enabled: false,
      startSec: null,
      endSec: null,
    };
  }

  if (start === null) {
    throw new Error(`${prefix} start is required`);
  }

  if (options.requireEnd !== false && end === null) {
    throw new Error(`${prefix} end is required`);
  }

  if (end !== null && end <= start) {
    throw new Error(`${prefix} end must be greater than start`);
  }

  return {
    enabled: true,
    startSec: start,
    endSec: end,
  };
}

function normalizeDetection(input = {}, defaults = {}) {
  const status = input.detectionStatus || defaults.status || 'none';
  const source = input.source || input.detectionSource || defaults.source || 'none';
  const confidenceValue =
    input.confidence === undefined || input.confidence === null || input.confidence === ''
      ? defaults.confidence || 0
      : Number(input.confidence);

  if (!VALID_DETECTION_STATUSES.has(status)) {
    throw new Error('Invalid detection status');
  }

  if (!VALID_SOURCES.has(source)) {
    throw new Error('Invalid playback metadata source');
  }

  if (!Number.isFinite(confidenceValue)) {
    throw new Error('confidence must be a number');
  }

  return {
    status,
    source,
    confidence: clamp(confidenceValue, 0, 1),
    sourceKey: input.sourceKey || defaults.sourceKey || null,
    sourceHash: input.sourceHash || defaults.sourceHash || null,
    jobId: input.jobId || defaults.jobId || null,
    note: typeof input.note === 'string' ? input.note.trim().slice(0, 500) : defaults.note || '',
  };
}

function normalizePlaybackMetaInput(input = {}) {
  const intro = normalizeRange(input, 'intro');
  const outro = normalizeRange(input, 'outro', { requireEnd: false });
  const detection = normalizeDetection(input, {
    status: input.source === 'manual' || input.detectionSource === 'manual' ? 'approved' : 'detected',
    source: input.source || input.detectionSource || 'manual',
  });

  return {
    playbackMeta: {
      intro,
      outro,
      detection,
    },
    applyToSeason: input.applyToSeason === true || input.applyToSeason === 'true',
  };
}

function serializePlaybackMeta(meta = {}) {
  const intro = meta.intro || {};
  const outro = meta.outro || {};
  const detection = meta.detection || {};

  return {
    introStartSec: intro.enabled ? intro.startSec ?? null : null,
    introEndSec: intro.enabled ? intro.endSec ?? null : null,
    outroStartSec: outro.enabled ? outro.startSec ?? null : null,
    detectionStatus: detection.status || 'none',
    detectionSource: detection.source || 'none',
    confidence: Number.isFinite(detection.confidence) ? detection.confidence : 0,
    detectionNote: detection.note || '',
    detectedAt: detection.detectedAt || null,
  };
}

function mapEpisodeForAdmin(episode) {
  const movie = episode.movieId || {};

  return {
    id: episode._id?.toString() || episode.id,
    episode: episode.episodeId,
    slug: episode.slug,
    filename: episode.filename,
    audioType: episode.audioType,
    serverName: episode.serverName,
    link_m3u8: episode.link_m3u8,
    duration: episode.duration,
    playbackMeta: serializePlaybackMeta(episode.playbackMeta),
    movie: {
      id: movie._id?.toString() || movie.id || episode.movieId?.toString(),
      name: movie.name,
      original_name: movie.original_name,
      slug: movie.slug,
      thumb_url: movie.thumb_url,
      poster_url: movie.poster_url,
    },
    updatedAt: episode.updatedAt,
  };
}

async function resolveMovieIdsFromSearch(search) {
  const keyword = String(search || '').trim();
  if (!keyword) return null;

  const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
  const movies = await Movie.find({
    $or: [{ name: regex }, { original_name: regex }, { slug: regex }],
  })
    .select('_id')
    .limit(100)
    .lean();

  return movies.map((movie) => movie._id);
}

async function listPlaybackEpisodes(filters = {}) {
  const page = Math.max(1, Number.parseInt(filters.page, 10) || 1);
  const limit = Math.max(1, Math.min(100, Number.parseInt(filters.limit, 10) || 25));
  const skip = (page - 1) * limit;
  const query = {};

  if (filters.movieId && mongoose.Types.ObjectId.isValid(filters.movieId)) {
    query.movieId = filters.movieId;
  }

  if (filters.status && filters.status !== 'all') {
    query['playbackMeta.detection.status'] = filters.status;
  }

  const searchMovieIds = await resolveMovieIdsFromSearch(filters.search);
  if (searchMovieIds) {
    if (searchMovieIds.length === 0) {
      return {
        data: [],
        pagination: { page, limit, total: 0, totalPages: 0 },
      };
    }

    query.movieId = query.movieId
      ? { $in: searchMovieIds.filter((id) => id.toString() === query.movieId.toString()) }
      : { $in: searchMovieIds };
  }

  const [episodes, total] = await Promise.all([
    Episode.find(query)
      .populate('movieId', 'name original_name slug thumb_url poster_url')
      .sort({ movieId: 1, episodeId: 1, audioType: 1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Episode.countDocuments(query),
  ]);

  return {
    data: episodes.map(mapEpisodeForAdmin),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

function applyNormalizedMetaToEpisode(episode, normalized, reviewer = null) {
  const existingDetection = episode.playbackMeta?.detection || {};
  const existingDetectionObject = existingDetection.toObject
    ? existingDetection.toObject({ versionKey: false })
    : existingDetection;
  const detection = {
    ...existingDetectionObject,
    ...normalized.playbackMeta.detection,
  };

  if (detection.status === 'approved') {
    detection.reviewedBy = reviewer?._id || reviewer?.id || detection.reviewedBy || null;
    detection.reviewedAt = new Date();
  }

  if (detection.status === 'detected' || detection.status === 'needs_review') {
    detection.detectedAt = detection.detectedAt || new Date();
  }

  episode.playbackMeta = {
    intro: normalized.playbackMeta.intro,
    outro: normalized.playbackMeta.outro,
    detection,
  };
}

async function updateEpisodePlaybackMeta(episodeId, input = {}, reviewer = null) {
  if (!mongoose.Types.ObjectId.isValid(episodeId)) {
    throw new Error('Invalid episode ID');
  }

  const normalized = normalizePlaybackMetaInput(input);
  const episode = await Episode.findById(episodeId);
  if (!episode) {
    throw new Error('Episode not found');
  }

  applyNormalizedMetaToEpisode(episode, normalized, reviewer);
  await episode.save();

  let updatedCount = 1;
  if (normalized.applyToSeason) {
    const siblings = await Episode.find({
      movieId: episode.movieId,
      _id: { $ne: episode._id },
      ...(episode.audioType ? { audioType: episode.audioType } : {}),
    });

    for (const sibling of siblings) {
      applyNormalizedMetaToEpisode(sibling, normalized, reviewer);
      await sibling.save();
      updatedCount += 1;
    }
  }

  const fresh = await Episode.findById(episode._id)
    .populate('movieId', 'name original_name slug thumb_url poster_url')
    .lean();

  return {
    episode: mapEpisodeForAdmin(fresh),
    updatedCount,
  };
}

async function markEpisodesDetectionStatus(episodeIds, status, extra = {}) {
  if (!Array.isArray(episodeIds) || episodeIds.length === 0) return { modifiedCount: 0 };
  if (!VALID_DETECTION_STATUSES.has(status)) throw new Error('Invalid detection status');

  return Episode.updateMany(
    { _id: { $in: episodeIds } },
    {
      $set: {
        'playbackMeta.detection.status': status,
        'playbackMeta.detection.source': extra.source || 'auto',
        'playbackMeta.detection.confidence': Number.isFinite(extra.confidence) ? extra.confidence : 0,
        'playbackMeta.detection.jobId': extra.jobId || null,
        'playbackMeta.detection.note': extra.note || '',
      },
    },
  );
}

module.exports = {
  listPlaybackEpisodes,
  markEpisodesDetectionStatus,
  normalizePlaybackMetaInput,
  serializePlaybackMeta,
  updateEpisodePlaybackMeta,
};
