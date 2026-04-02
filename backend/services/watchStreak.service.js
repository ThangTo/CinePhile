const mongoose = require('mongoose');

const User = require('../models/user.model');
const ViewHistory = require('../models/view_history.model');

/**
 * Watch Streak Logic
 *
 * Rules:
 * - A "watch day" counts only after the user reaches 10 watched minutes in that calendar day
 * - Streak increments by 1 for each consecutive qualified watch day
 * - Streak resets to 1 when the user qualifies again after missing a day
 * - longestStreak tracks the personal best
 */
const MIN_WATCH_SECONDS = 600;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

const addDays = (date, days) => {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
};

const isSameDay = (a, b) => {
  if (!a || !b) return false;
  return startOfDay(a).getTime() === startOfDay(b).getTime();
};

const clampWatchSeconds = (seconds) => Math.max(0, Number(seconds) || 0);

const getStoredQualifiedDay = (user) =>
  user?.lastQualifiedWatchDate ? startOfDay(new Date(user.lastQualifiedWatchDate)) : null;

const getCurrentStreakValue = (user, referenceDate = new Date()) => {
  const lastQualifiedDay = getStoredQualifiedDay(user);
  if (!lastQualifiedDay) return 0;

  const today = startOfDay(referenceDate);
  const yesterday = addDays(today, -1);

  if (
    lastQualifiedDay.getTime() === today.getTime() ||
    lastQualifiedDay.getTime() === yesterday.getTime()
  ) {
    return user.watchStreak || 0;
  }

  return 0;
};

const getWatchSecondsForDay = async (userId, user, day) => {
  if (user?.todayWatchDate && isSameDay(user.todayWatchDate, day)) {
    return clampWatchSeconds(user.todayWatchSeconds);
  }

  const start = startOfDay(day);
  const end = addDays(start, 1);

  const todayWatchAgg = await ViewHistory.aggregate([
    {
      $match: {
        userId: new mongoose.Types.ObjectId(userId),
        createdAt: { $gte: start, $lt: end },
      },
    },
    {
      $group: {
        _id: null,
        totalSeconds: { $sum: '$watchDuration' },
      },
    },
  ]);

  return clampWatchSeconds(todayWatchAgg[0]?.totalSeconds || 0);
};

const buildStreakPayload = (user, todaySeconds, referenceDate = new Date()) => ({
  currentStreak: getCurrentStreakValue(user, referenceDate),
  longestStreak: user.longestStreak || 0,
  lastWatchDate: user.lastWatchDate || null,
  lastQualifiedWatchDate: user.lastQualifiedWatchDate || null,
  isActiveToday: todaySeconds >= MIN_WATCH_SECONDS,
  todayProgress: Math.floor(todaySeconds / 60),
});

/**
 * Get user's current streak data.
 */
const getStreak = async (userId) => {
  const user = await User.findById(userId).lean();
  if (!user) return null;

  const today = startOfDay(new Date());
  const todaySeconds = await getWatchSecondsForDay(userId, user, today);

  return buildStreakPayload(user, todaySeconds, today);
};

/**
 * Record watched seconds and update streak.
 *
 * @param {string} userId
 * @param {number} secondsWatched - delta seconds watched since the previous heartbeat
 * @returns {Object} updated streak info
 */
const recordStreak = async (userId, secondsWatched = 0) => {
  const user = await User.findById(userId);
  if (!user) return null;

  const now = new Date();
  const today = startOfDay(now);
  const yesterday = addDays(today, -1);
  const safeSeconds = clampWatchSeconds(secondsWatched);

  if (!isSameDay(user.todayWatchDate, today)) {
    user.todayWatchSeconds = 0;
  }

  user.lastWatchDate = now;
  user.todayWatchSeconds = clampWatchSeconds(user.todayWatchSeconds) + safeSeconds;
  user.todayWatchDate = now;

  const todaySeconds = clampWatchSeconds(user.todayWatchSeconds);
  const didReachThreshold = todaySeconds >= MIN_WATCH_SECONDS;
  const lastQualifiedDay = getStoredQualifiedDay(user);
  const qualifiedToday = lastQualifiedDay && lastQualifiedDay.getTime() === today.getTime();

  if (didReachThreshold && !qualifiedToday) {
    const isConsecutiveQualifiedDay =
      lastQualifiedDay && lastQualifiedDay.getTime() === yesterday.getTime();

    user.watchStreak = isConsecutiveQualifiedDay
      ? getCurrentStreakValue(user, yesterday) + 1
      : 1;
    user.lastQualifiedWatchDate = now;

    if (user.watchStreak > (user.longestStreak || 0)) {
      user.longestStreak = user.watchStreak;
    }
  }

  await user.save();

  return {
    ...buildStreakPayload(user, todaySeconds, now),
    minutesWatchedToday: Math.floor(todaySeconds / 60),
    thresholdMinutes: MIN_WATCH_SECONDS / 60,
  };
};

module.exports = {
  getCurrentStreakValue,
  getStreak,
  recordStreak,
  MIN_WATCH_SECONDS,
};
