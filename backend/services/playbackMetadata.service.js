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
const DETECTION_STATUSES_REQUIRING_INTRO = new Set(['detected', 'needs_review', 'approved']);

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

function hasValidIntroRange(meta = {}) {
  const intro = meta.intro || meta;
  const startSec = Number(intro.startSec ?? meta.introStartSec);
  const endSec = Number(intro.endSec ?? meta.introEndSec);

  return intro.enabled === true && Number.isFinite(startSec) && Number.isFinite(endSec) && startSec >= 0 && endSec > startSec;
}

function normalizePlaybackMetaInput(input = {}) {
  const intro = normalizeRange(input, 'intro');
  const outro = normalizeRange(input, 'outro', { requireEnd: false });
  const detection = normalizeDetection(input, {
    status: input.source === 'manual' || input.detectionSource === 'manual' ? 'approved' : 'detected',
    source: input.source || input.detectionSource || 'manual',
  });

  if (DETECTION_STATUSES_REQUIRING_INTRO.has(detection.status) && !hasValidIntroRange({ intro })) {
    throw new Error('Intro start/end are required before marking detection as approved or detected');
  }

  return {
    playbackMeta: {
      intro,
      outro,
      detection,
    },
    applyToSeason: input.applyToSeason === true || input.applyToSeason === 'true',
  };
}

function escapeRegex(value) {
  return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeSearchText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenizeSearch(value) {
  return normalizeSearchText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

function levenshteinDistance(first, second) {
  if (first === second) return 0;
  if (!first) return second.length;
  if (!second) return first.length;

  const previous = Array.from({ length: second.length + 1 }, (_, index) => index);
  const current = new Array(second.length + 1);

  for (let firstIndex = 1; firstIndex <= first.length; firstIndex += 1) {
    current[0] = firstIndex;
    for (let secondIndex = 1; secondIndex <= second.length; secondIndex += 1) {
      const substitutionCost = first[firstIndex - 1] === second[secondIndex - 1] ? 0 : 1;
      current[secondIndex] = Math.min(
        previous[secondIndex] + 1,
        current[secondIndex - 1] + 1,
        previous[secondIndex - 1] + substitutionCost,
      );
    }

    for (let index = 0; index <= second.length; index += 1) {
      previous[index] = current[index];
    }
  }

  return previous[second.length];
}

function scoreToken(token, words) {
  if (words.includes(token)) return 1;

  for (const word of words) {
    if (word.startsWith(token) || token.startsWith(word)) return 0.75;
    if (token.length >= 4 && word.length >= 4 && levenshteinDistance(token, word) <= 1) return 0.6;
  }

  return 0;
}

function scorePlaybackMovieSearchCandidate(movie = {}, search = '') {
  const query = normalizeSearchText(search);
  const tokens = tokenizeSearch(search);
  if (!query || tokens.length === 0) {
    return { matched: false, score: 0, matchedTokens: 0 };
  }

  const normalizedFields = [
    normalizeSearchText(movie.name),
    normalizeSearchText(movie.original_name),
    normalizeSearchText(movie.slug),
  ].filter(Boolean);
  const haystack = normalizedFields.join(' ');
  const compactHaystack = haystack.replace(/\s+/g, '');
  const compactQuery = query.replace(/\s+/g, '');
  const words = haystack.split(/\s+/).filter(Boolean);

  let score = 0;
  let matchedTokens = 0;

  if (haystack.includes(query)) score += 100;
  if (compactQuery.length >= 3 && compactHaystack.includes(compactQuery)) score += 80;

  for (const token of tokens) {
    const tokenScore = scoreToken(token, words);
    if (tokenScore > 0) {
      matchedTokens += tokenScore >= 0.75 ? 1 : 0.5;
      score += Math.round(tokenScore * 12);
    }
  }

  const coverage = matchedTokens / tokens.length;
  const matched = score >= 80 || coverage >= 0.6;

  return {
    matched,
    score: matched ? score + Math.round(coverage * 20) : score,
    matchedTokens,
  };
}

function serializePlaybackMeta(meta = {}) {
  const intro = meta.intro || {};
  const outro = meta.outro || {};
  const detection = meta.detection || {};
  const rawDetectionStatus = detection.status || 'none';
  const detectionStatus =
    DETECTION_STATUSES_REQUIRING_INTRO.has(rawDetectionStatus) && !hasValidIntroRange({ intro })
      ? 'needs_review'
      : rawDetectionStatus;

  return {
    introStartSec: intro.enabled ? intro.startSec ?? null : null,
    introEndSec: intro.enabled ? intro.endSec ?? null : null,
    outroStartSec: outro.enabled ? outro.startSec ?? null : null,
    detectionStatus,
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

  const tokens = tokenizeSearch(keyword).slice(0, 8);
  const regex = new RegExp(escapeRegex(keyword), 'i');
  const orderedTokenRegex = tokens.length > 0
    ? new RegExp(tokens.map(escapeRegex).join('.*'), 'i')
    : regex;
  const tokenClauses = tokens.map((token) => {
    const tokenRegex = new RegExp(escapeRegex(token), 'i');
    return {
      $or: [{ name: tokenRegex }, { original_name: tokenRegex }, { slug: tokenRegex }],
    };
  });
  const movies = await Movie.find({
    $or: [
      { name: regex },
      { original_name: regex },
      { slug: regex },
      { slug: orderedTokenRegex },
      ...tokenClauses,
    ],
  })
    .select('_id name original_name slug viewCount')
    .sort({ viewCount: -1, updatedAt: -1 })
    .limit(500)
    .lean();

  return movies
    .map((movie) => ({
      movie,
      ...scorePlaybackMovieSearchCandidate(movie, keyword),
    }))
    .filter((item) => item.matched)
    .sort((first, second) => {
      if (second.score !== first.score) return second.score - first.score;
      return (Number(second.movie.viewCount) || 0) - (Number(first.movie.viewCount) || 0);
    })
    .slice(0, 100)
    .map((item) => item.movie._id);
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
  hasValidIntroRange,
  listPlaybackEpisodes,
  markEpisodesDetectionStatus,
  normalizeSearchText,
  normalizePlaybackMetaInput,
  scorePlaybackMovieSearchCandidate,
  serializePlaybackMeta,
  updateEpisodePlaybackMeta,
};
