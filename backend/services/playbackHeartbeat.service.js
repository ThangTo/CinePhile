const mongoose = require('mongoose');

const Movie = require('../models/movie.model');
const Episode = require('../models/episode.model');
const ViewHistory = require('../models/view_history.model');
const watchStreakService = require('./watchStreak.service');
const questService = require('./quest.service');
const leaderboardService = require('./leaderboard.service');

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;
const MAX_HEARTBEAT_SECONDS = 5 * 60;

const isObjectId = (value) =>
  mongoose.Types.ObjectId.isValid(value) && /^[0-9a-fA-F]{24}$/.test(value);

const toComparableId = (value) => {
  if (!value) return null;
  return typeof value === 'string' ? value : value.toString();
};

const normalizeEpisodeId = (episodeId) => {
  const normalized = toComparableId(episodeId);
  return normalized || null;
};

const detectDeviceType = (userAgent = 'Unknown') => {
  if (/mobile/i.test(userAgent)) return 'Mobile';
  if (/tablet|ipad/i.test(userAgent)) return 'Tablet';
  if (userAgent === 'Unknown') return 'Unknown';
  return 'Desktop';
};

const findMovie = async (identifier) => {
  if (!identifier) return null;

  if (isObjectId(identifier)) {
    const movie = await Movie.findById(identifier).lean();
    if (movie) return movie;
  }

  return Movie.findOne({ slug: identifier }).lean();
};

const matchesPlaybackTarget = (viewRecord, { movieId, episodeId }) => {
  if (!viewRecord) return false;

  const recordMovieId = toComparableId(viewRecord.movieId);
  const targetMovieId = toComparableId(movieId);
  const recordEpisodeId = normalizeEpisodeId(viewRecord.episodeId);
  const targetEpisodeId = normalizeEpisodeId(episodeId);

  return recordMovieId === targetMovieId && recordEpisodeId === targetEpisodeId;
};

const claimAnonymousViewRecord = async (viewRecord, userId) => {
  if (!viewRecord || !userId || viewRecord.userId) {
    return viewRecord;
  }

  await ViewHistory.findByIdAndUpdate(viewRecord._id, { $set: { userId } });
  viewRecord.userId = userId;
  return viewRecord;
};

const findRecentViewRecord = async ({ movieId, episodeId, userId, ipAddress }) => {
  const baseQuery = {
    movieId,
    createdAt: { $gte: new Date(Date.now() - TWO_HOURS_MS) },
    ...(episodeId ? { episodeId } : { episodeId: null }),
  };

  const runFindOne = async (query) => {
    const queryResult = ViewHistory.findOne(query);
    if (typeof queryResult.sort === 'function') {
      return queryResult.sort({ createdAt: -1 }).lean();
    }

    return queryResult.lean();
  };

  if (userId) {
    const userRecord = await runFindOne({ ...baseQuery, userId });
    if (userRecord) {
      return userRecord;
    }

    if (ipAddress) {
      return runFindOne({ ...baseQuery, userId: null, ipAddress });
    }
  }

  const queryResult = ViewHistory.findOne({ ...baseQuery, ipAddress });
  if (typeof queryResult.sort === 'function') {
    return queryResult.sort({ createdAt: -1 }).lean();
  }

  return queryResult.lean();
};

const ensureViewHistoryRecord = async (
  identifier,
  { viewHistoryId, episodeId = null, userId = null, ipAddress = '0.0.0.0', userAgent = 'Unknown' } = {},
) => {
  const normalizedEpisodeId = normalizeEpisodeId(episodeId);
  let existingRecord = null;

  if (viewHistoryId) {
    existingRecord = await ViewHistory.findById(viewHistoryId).lean();
    if (
      isObjectId(identifier) &&
      matchesPlaybackTarget(existingRecord, { movieId: identifier, episodeId: normalizedEpisodeId })
    ) {
      return claimAnonymousViewRecord(existingRecord, userId);
    }
  }

  const movieDoc = await findMovie(identifier);
  if (!movieDoc) {
    throw new Error('Movie not found');
  }

  if (matchesPlaybackTarget(existingRecord, { movieId: movieDoc._id, episodeId: normalizedEpisodeId })) {
    return claimAnonymousViewRecord(existingRecord, userId);
  }

  const recentRecord = await findRecentViewRecord({
    movieId: movieDoc._id,
    episodeId: normalizedEpisodeId,
    userId,
    ipAddress,
  });

  if (matchesPlaybackTarget(recentRecord, { movieId: movieDoc._id, episodeId: normalizedEpisodeId })) {
    return claimAnonymousViewRecord(recentRecord, userId);
  }

  return ViewHistory.create({
    movieId: movieDoc._id,
    episodeId: normalizedEpisodeId,
    userId: userId || null,
    ipAddress,
    watchDuration: 0,
    userAgent,
    deviceType: detectDeviceType(userAgent),
  });
};

const recordPlaybackHeartbeat = async (
  identifier,
  {
    viewHistoryId,
    episodeId = null,
    seconds = 30,
    userId = null,
    ipAddress = '0.0.0.0',
    userAgent = 'Unknown',
  } = {},
) => {
  const safeSecs = Math.min(Math.max(Math.floor(Number(seconds) || 0), 0), MAX_HEARTBEAT_SECONDS);
  if (!safeSecs) {
    return { success: false, message: 'Missing watched seconds' };
  }

  const viewRecord = await ensureViewHistoryRecord(identifier, {
    viewHistoryId,
    episodeId,
    userId,
    ipAddress,
    userAgent,
  });

  const updates = [
    Movie.findByIdAndUpdate(viewRecord.movieId, { $inc: { totalWatchTime: safeSecs } }),
    ViewHistory.findByIdAndUpdate(viewRecord._id, { $inc: { watchDuration: safeSecs } }),
  ];

  if (viewRecord.episodeId) {
    updates.push(Episode.findByIdAndUpdate(viewRecord.episodeId, { $inc: { totalWatchTime: safeSecs } }));
    updates.push(Movie.findByIdAndUpdate(viewRecord.movieId, { $inc: { totalEpisodeWatchTime: safeSecs } }));
  }

  await Promise.all(updates);

  let streak = null;
  if (userId) {
    streak = await watchStreakService.recordStreak(userId, safeSecs);
    leaderboardService.invalidateLeaderboardCache().catch(() => {});
    // Quest progress: watch event (fire-and-forget)
    questService.checkAndUpdateProgress(userId, {
      type: 'watch',
      seconds: safeSecs,
      movieId: viewRecord.movieId,
    }).catch(() => {});
  }

  return {
    success: true,
    viewHistoryId: toComparableId(viewRecord._id),
    streak,
  };
};

module.exports = {
  ensureViewHistoryRecord,
  recordPlaybackHeartbeat,
};
