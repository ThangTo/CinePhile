const User = require('../models/user.model');

/**
 * Watch Streak Logic
 *
 * Rules:
 * - A "watch day" counts when user watches ≥ 10 minutes (600 seconds) in a single day
 * - Streak increments by 1 for each consecutive watch day
 * - Streak resets to 1 if user missed a day and returns
 * - longestStreak tracks the personal best
 */
const MIN_WATCH_SECONDS = 600; // 10 minutes to count as a watch day

// Normalize date to start of day in local (Vietnam) timezone
const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

/**
 * Get user's current streak data
 */
const getStreak = async (userId) => {
  const UserModel = require('../models/user.model');
  const ViewHistory = require('../models/view_history.model');
  const mongoose = require('mongoose');

  const user = await UserModel.findById(userId).lean();
  if (!user) return null;

  const today = startOfDay(new Date());
  const lastWatch = user.lastWatchDate ? startOfDay(new Date(user.lastWatchDate)) : null;

  let currentStreak = user.watchStreak || 0;
  let isActiveToday = false;

  if (lastWatch && lastWatch.getTime() === today.getTime()) {
    isActiveToday = true;
  }

  // Use today's seconds from user doc if it exists and is from today,
  // otherwise fall back to querying ViewHistory
  let todaySeconds = 0;
  if (
    user.todayWatchSeconds &&
    user.todayWatchDate &&
    startOfDay(new Date(user.todayWatchDate)).getTime() === today.getTime()
  ) {
    todaySeconds = user.todayWatchSeconds;
  } else {
    const s = new Date(today);
    const e = new Date(today);
    e.setDate(e.getDate() + 1);
    const todayWatchAgg = await ViewHistory.aggregate([
      { $match: { userId: new mongoose.Types.ObjectId(userId), createdAt: { $gte: s, $lt: e } } },
      { $group: { _id: null, totalSeconds: { $sum: '$watchDuration' } } },
    ]);
    todaySeconds = todayWatchAgg[0]?.totalSeconds || 0;
  }

  return {
    currentStreak,
    longestStreak: user.longestStreak || 0,
    lastWatchDate: user.lastWatchDate,
    isActiveToday,
    todayProgress: Math.floor(todaySeconds / 60),
  };
};

/**
 * Record watch session and update streak.
 * Called from frontend heartbeat (every 30s) or on video end.
 *
 * @param {string} userId
 * @param {number} secondsWatched - cumulative seconds watched this session (frontend累积)
 * @returns {Object} updated streak info
 */
const recordStreak = async (userId, secondsWatched = 0) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const today = startOfDay(new Date());
  const lastWatch = user.lastWatchDate ? startOfDay(new Date(user.lastWatchDate)) : null;
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isFirstWatchToday = !lastWatch || lastWatch.getTime() !== today.getTime();
  const isBackAfterMiss = lastWatch && lastWatch.getTime() === yesterday.getTime();
  const missedDays = lastWatch && lastWatch < yesterday;

  // Update lastWatchDate
  user.lastWatchDate = new Date();

  // ---- Track today's cumulative seconds ----
  // Frontend sends cumulative session seconds; take the max to avoid double-count on cleanup/re-mount.
  // Reset only when a new day starts (handled by isFirstWatchToday).
  if (isFirstWatchToday) {
    user.todayWatchSeconds = 0;
  }
  user.todayWatchSeconds = Math.max(user.todayWatchSeconds || 0, secondsWatched);
  user.todayWatchDate = new Date();

  const todaySeconds = user.todayWatchSeconds || 0;
  const didReachThreshold = todaySeconds >= MIN_WATCH_SECONDS;
  let didIncrementStreak = false;

  if (isFirstWatchToday) {
    if (!lastWatch || missedDays || isBackAfterMiss) {
      // First ever OR missed ≥ 1 day — reset to 1
      user.watchStreak = 1;
    }
    // If consecutive day, streak will be incremented below after threshold check
  }

  // Increment streak only when threshold is reached AND this is a consecutive day
  if (didReachThreshold && isFirstWatchToday && lastWatch && !isBackAfterMiss && !missedDays) {
    user.watchStreak = (user.watchStreak || 1) + 1;
    didIncrementStreak = true;
  }

  // Update longest streak
  if (user.watchStreak > (user.longestStreak || 0)) {
    user.longestStreak = user.watchStreak;
  }

  await user.save();

  return {
    currentStreak: user.watchStreak,
    longestStreak: user.longestStreak,
    lastWatchDate: user.lastWatchDate,
    isActiveToday: didReachThreshold,
    minutesWatchedToday: Math.floor(todaySeconds / 60),
    thresholdMinutes: MIN_WATCH_SECONDS / 60,
  };
};

/**
 * Reset streak silently (called by cron/background job — optional)
 * Marks a day as missed and decays the streak if user doesn't return.
 * Currently handled inline when user returns.
 */
const decayStreak = async (userId) => {
  // This is handled naturally by the isBackAfterMiss logic above.
  // No-op for now.
};

module.exports = {
  getStreak,
  recordStreak,
  MIN_WATCH_SECONDS,
};
