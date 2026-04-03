/**
 * Leaderboard Service
 * Computes and caches the public top users leaderboard.
 *
 * Cache: leaderboard:topUsers:v2 (TTL: 300s)
 * Score formula: totalWatchTime * adjustedMaxStreak * adjustedCurrentStreak
 */

const mongoose = require('mongoose');
const redisService = require('./redis.service');
const { normalizeAvatarForOutput } = require('../utils/avatarUtils');

const CACHE_KEY = 'leaderboard:topUsers:v2';
const CACHE_TTL = 300; // 5 minutes
const LEADERBOARD_LIMIT = 10;
const PUBLIC_USER_ROLES = ['user', 'premium'];

/**
 * Aggregation-only function.
 * Starts from the users collection so the leaderboard can still return
 * up to 10 accounts even when some users do not have view history yet.
 *
 * @returns {Promise<Array>} Array of leaderboard entries
 */
const getTopUsers = async () => {
  const User = mongoose.model('User');
  const ViewHistory = mongoose.model('ViewHistory');
  const viewHistoryCollection = ViewHistory.collection.name;

  const pipeline = [
    {
      $match: {
        role: { $in: PUBLIC_USER_ROLES },
      },
    },
    {
      $lookup: {
        from: viewHistoryCollection,
        let: { userId: '$_id' },
        pipeline: [
          {
            $match: {
              $expr: { $eq: ['$userId', '$$userId'] },
            },
          },
          {
            $group: {
              _id: null,
              totalWatchTime: { $sum: '$watchDuration' },
            },
          },
        ],
        as: 'watchStats',
      },
    },
    {
      $addFields: {
        totalWatchTime: {
          $ifNull: [{ $first: '$watchStats.totalWatchTime' }, 0],
        },
        currentStreak: { $ifNull: ['$watchStreak', 0] },
        maxStreak: { $ifNull: ['$longestStreak', 0] },
      },
    },
    {
      $addFields: {
        adjustedMaxStreak: {
          $cond: [{ $gt: ['$maxStreak', 0] }, '$maxStreak', 1],
        },
        adjustedCurrentStreak: {
          $cond: [{ $gt: ['$currentStreak', 0] }, '$currentStreak', 1],
        },
      },
    },
    {
      $addFields: {
        score: {
          $multiply: ['$totalWatchTime', '$adjustedMaxStreak', '$adjustedCurrentStreak'],
        },
      },
    },
    {
      $sort: {
        score: -1,
        totalWatchTime: -1,
        maxStreak: -1,
        currentStreak: -1,
        username: 1,
      },
    },
    { $limit: LEADERBOARD_LIMIT },
    {
      $project: {
        _id: 0,
        id: { $toString: '$_id' },
        username: 1,
        avatar: 1,
        totalWatchTime: 1,
        currentStreak: 1,
        maxStreak: 1,
        score: 1,
      },
    },
  ];

  return User.aggregate(pipeline).exec();
};

/**
 * Cache-first public API.
 *
 * @returns {Promise<Array>}
 */
const getTopUsersLeaderboard = async () => {
  try {
    const cached = await redisService.get(CACHE_KEY);
    if (cached) {
      return cached;
    }
  } catch (_error) {
    // Ignore Redis errors and fall back to the DB query below.
  }

  const result = (await getTopUsers()).map((entry) => ({
    ...entry,
    avatar: normalizeAvatarForOutput(entry.avatar, entry.username || entry.id),
  }));

  try {
    await redisService.set(CACHE_KEY, result, CACHE_TTL);
  } catch (_error) {
    // Ignore cache-write errors because the response is already available.
  }

  return result;
};

/**
 * Invalidates every leaderboard cache version.
 *
 * @returns {Promise<boolean>}
 */
const invalidateLeaderboardCache = async () => {
  const deletedCount = await redisService.delByPattern('leaderboard:topUsers*');
  return deletedCount > 0;
};

module.exports = {
  getTopUsersLeaderboard,
  invalidateLeaderboardCache,
};
