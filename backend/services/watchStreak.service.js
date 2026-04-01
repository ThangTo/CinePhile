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

/**
 * Get user's current streak data
 */
const getStreak = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastWatch = user.lastWatchDate ? new Date(user.lastWatchDate) : null;
  if (lastWatch) lastWatch.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  let currentStreak = user.watchStreak || 0;
  let isActiveToday = false;

  if (lastWatch) {
    // Already watched today
    if (lastWatch.getTime() === today.getTime()) {
      isActiveToday = true;
    }
  }

  return {
    currentStreak,
    longestStreak: user.longestStreak || 0,
    lastWatchDate: user.lastWatchDate,
    isActiveToday,
    todayProgress: 0, // populated by recordStreak
  };
};

/**
 * Record watch session and update streak.
 * Called from frontend heartbeat (every 30s) or on video end.
 *
 * @param {string} userId
 * @param {number} secondsWatched - cumulative seconds watched today (from frontend session)
 * @returns {Object} updated streak info
 */
const recordStreak = async (userId, secondsWatched = 0) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lastWatch = user.lastWatchDate ? new Date(user.lastWatchDate) : null;
  if (lastWatch) lastWatch.setHours(0, 0, 0, 0);

  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isFirstWatchToday = !lastWatch || lastWatch.getTime() !== today.getTime();
  const isBackAfterMiss = lastWatch && lastWatch.getTime() === yesterday.getTime();
  const missedMultipleDays = lastWatch && lastWatch < yesterday;

  let newStreak = user.watchStreak || 0;

  if (isFirstWatchToday) {
    if (isBackAfterMiss || missedMultipleDays) {
      // Missed yesterday (or more) — reset streak to 1
      newStreak = 1;
    } else if (!lastWatch) {
      // First ever watch
      newStreak = 1;
    }
    // else: same day revisit — streak unchanged
  }

  // Update lastWatchDate
  user.lastWatchDate = new Date();

  // Only count the day as complete and increment streak when threshold is reached
  // The frontend passes cumulative seconds per day; we only award streak once per day
  if (secondsWatched >= MIN_WATCH_SECONDS) {
    if (isFirstWatchToday) {
      if (isBackAfterMiss || missedMultipleDays) {
        newStreak = 1;
      } else if (!lastWatch) {
        newStreak = 1;
      } else {
        // Consecutive day — increment
        newStreak = (user.watchStreak || 0) + 1;
      }
      user.watchStreak = newStreak;
      if (newStreak > (user.longestStreak || 0)) {
        user.longestStreak = newStreak;
      }
    }
    // If already counted today, don't increment again
  }

  await user.save();

  return {
    currentStreak: user.watchStreak,
    longestStreak: user.longestStreak,
    lastWatchDate: user.lastWatchDate,
    isActiveToday: true,
    minutesWatchedToday: secondsWatched / 60,
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
