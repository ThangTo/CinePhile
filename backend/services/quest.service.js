const QuestDefinition = require('../models/quest_definition.model');
const QuestProgress = require('../models/quest_progress.model');
const User = require('../models/user.model');
const notificationService = require('./notification.service');

function createQuestError(message, statusCode = 400) {
  const error = new Error(message);
  error.statusCode = statusCode;
  return error;
}

function getModifiedCount(result) {
  if (!result) return 0;
  if (typeof result.modifiedCount === 'number') return result.modifiedCount;
  if (typeof result.nModified === 'number') return result.nModified;
  if (typeof result.n === 'number') return result.n;
  return 0;
}

async function awardCoinsToUser(userId, amount) {
  const user = await User.findByIdAndUpdate(
    userId,
    { $inc: { coin: amount } },
    { new: true }
  );

  if (!user) {
    throw createQuestError('User not found', 404);
  }

  return user;
}

function getDayStart(date = new Date()) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getWeekStart(date = new Date()) {
  const d = new Date(date);
  const day = d.getUTCDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setUTCDate(d.getUTCDate() + diff);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function getPeriodKey(type, date = new Date()) {
  if (type === 'daily') {
    return date.toISOString().slice(0, 10);
  }

  const weekStart = getWeekStart(date);
  const year = weekStart.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1));
  const days = Math.floor((weekStart - jan1) / (24 * 60 * 60 * 1000));
  const weekNum = Math.ceil((days + jan1.getUTCDay() + 1) / 7);
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

async function syncQuestDefinitions() {
  const definitions = await QuestDefinition.find({ isActive: true }).sort({ type: 1, order: 1 });
  const daily = definitions.filter((d) => d.type === 'daily');
  const weekly = definitions.filter((d) => d.type === 'weekly');
  return { daily, weekly, all: definitions };
}

async function getUserQuestProgress(userId) {
  const definitions = await syncQuestDefinitions();
  const now = new Date();

  const dailyPk = getPeriodKey('daily', now);
  const weeklyPk = getPeriodKey('weekly', now);

  const progressDocs = await QuestProgress.find({
    userId,
    periodKey: { $in: [dailyPk, weeklyPk] },
  });

  const progressMap = {};
  for (const progress of progressDocs) {
    progressMap[`${progress.questId}_${progress.periodKey}`] = progress;
  }

  function buildQuestGroup(questDefs, periodKey) {
    const quests = questDefs.map((def) => {
      const progress = progressMap[`${def._id}_${periodKey}`];

      return {
        questId: def._id,
        questIdString: def.questId,
        title: def.title,
        description: def.description,
        icon: def.icon,
        category: def.category,
        targetMetric: def.targetMetric,
        targetValue: def.targetValue,
        currentValue: progress ? progress.currentValue : 0,
        watchedMovieIds: progress ? progress.watchedMovieIds : [],
        isCompleted: progress ? progress.isCompleted : false,
        isClaimed: progress ? progress.isClaimed : false,
        rewardCoins: def.rewardCoins,
        canClaim: progress ? progress.isCompleted && !progress.isClaimed : false,
      };
    });

    const total = quests.length;
    const completed = quests.filter((quest) => quest.isCompleted).length;
    const claimed = quests.filter((quest) => quest.isClaimed).length;
    const completionBonusCoins = questDefs[0]?.completionBonusCoins || 0;
    const completionBonusClaimed = questDefs.some((def) => {
      const progress = progressMap[`${def._id}_${periodKey}`];
      return Boolean(progress?.isCompletionBonusClaimed);
    });

    return {
      periodKey,
      quests,
      total,
      completed,
      claimed,
      allCompleted: total > 0 && completed === total,
      allClaimed: total > 0 && claimed === total,
      completionBonusCoins,
      completionBonusClaimed,
      canClaimCompletionBonus:
        total > 0 &&
        completed === total &&
        claimed === total &&
        completionBonusCoins > 0 &&
        !completionBonusClaimed,
    };
  }

  return {
    daily: buildQuestGroup(definitions.daily, dailyPk),
    weekly: buildQuestGroup(definitions.weekly, weeklyPk),
  };
}

async function getQuestSummary(userId) {
  const progress = await getUserQuestProgress(userId);

  function sumCoins(quests, claimedOnly) {
    return quests
      .filter((quest) => !claimedOnly || quest.isClaimed)
      .reduce((sum, quest) => sum + quest.rewardCoins, 0);
  }

  return {
    daily: {
      total: progress.daily.total,
      completed: progress.daily.completed,
      claimed: progress.daily.claimed,
      claimedCoins: sumCoins(progress.daily.quests, true),
      completionBonusCoins: progress.daily.completionBonusCoins,
      completionBonusClaimed: progress.daily.completionBonusClaimed,
      canClaimCompletionBonus: progress.daily.canClaimCompletionBonus,
    },
    weekly: {
      total: progress.weekly.total,
      completed: progress.weekly.completed,
      claimed: progress.weekly.claimed,
      claimedCoins: sumCoins(progress.weekly.quests, true),
      completionBonusCoins: progress.weekly.completionBonusCoins,
      completionBonusClaimed: progress.weekly.completionBonusClaimed,
      canClaimCompletionBonus: progress.weekly.canClaimCompletionBonus,
    },
  };
}

async function checkAndUpdateProgress(userId, event) {
  const definitions = await syncQuestDefinitions();
  const now = new Date();
  const dailyPk = getPeriodKey('daily', now);
  const weeklyPk = getPeriodKey('weekly', now);

  const metricMap = {
    comment: ['comment_count'],
    rating: ['rating_count'],
    favorite: ['favorite_count'],
    watchlist: ['watchlist_count'],
    watch: ['watch_seconds', 'unique_movies'],
  };

  const relevantMetrics = metricMap[event.type] || [];
  if (relevantMetrics.length === 0) return [];

  const allRelevant = definitions.all.filter((def) => relevantMetrics.includes(def.targetMetric));
  if (allRelevant.length === 0) return [];

  const results = [];

  for (const def of allRelevant) {
    const periodKey = def.type === 'daily' ? dailyPk : weeklyPk;
    let progress = await QuestProgress.findOne({ userId, questId: def._id, periodKey });

    if (!progress) {
      progress = new QuestProgress({ userId, questId: def._id, periodKey, currentValue: 0 });
    }

    if (progress.isCompleted) {
      results.push({ questId: def._id, isJustCompleted: false, def });
      continue;
    }

    let isJustCompleted = false;

    if (def.targetMetric === 'unique_movies' && event.movieId) {
      const alreadyTracked = progress.watchedMovieIds.some(
        (id) => id.toString() === event.movieId.toString()
      );

      if (!alreadyTracked) {
        progress.watchedMovieIds.push(event.movieId);
        progress.currentValue = progress.watchedMovieIds.length;
      }
    } else if (def.targetMetric === 'watch_seconds' && event.seconds) {
      progress.currentValue = (progress.currentValue || 0) + event.seconds;
    } else if (['comment_count', 'rating_count', 'favorite_count', 'watchlist_count'].includes(def.targetMetric)) {
      progress.currentValue = (progress.currentValue || 0) + 1;
    }

    progress.lastUpdatedAt = now;

    if (progress.currentValue >= def.targetValue && !progress.isCompleted) {
      progress.isCompleted = true;
      isJustCompleted = true;
    }

    await progress.save();
    results.push({ questId: def._id, isJustCompleted, def, prog: progress });
  }

  return results;
}

async function claimReward(userId, questId) {
  const def = await QuestDefinition.findById(questId);
  if (!def) throw createQuestError('Quest not found', 404);

  const now = new Date();
  const periodKey = def.type === 'daily'
    ? getPeriodKey('daily', now)
    : getPeriodKey('weekly', now);

  const claimedProgress = await QuestProgress.findOneAndUpdate(
    { userId, questId: def._id, periodKey, isCompleted: true, isClaimed: false },
    { $set: { isClaimed: true, claimedAt: now } },
    { new: true }
  );

  if (!claimedProgress) {
    const progress = await QuestProgress.findOne({ userId, questId: def._id, periodKey });
    if (!progress) throw createQuestError('Quest progress not found', 404);
    if (!progress.isCompleted) throw createQuestError('Quest not yet completed', 400);
    if (progress.isClaimed) {
      return { alreadyClaimed: true, coinsAwarded: 0, questDef: def, newBalance: null };
    }

    throw createQuestError('Quest reward is being claimed. Please try again.', 409);
  }

  let user;
  try {
    user = await awardCoinsToUser(userId, def.rewardCoins);
  } catch (error) {
    await QuestProgress.updateOne(
      { userId, questId: def._id, periodKey, isClaimed: true, claimedAt: now },
      { $set: { isClaimed: false, claimedAt: null } }
    );
    throw error;
  }

  try {
    await notificationService.create(userId, {
      title: 'Da nhan thuong nhiem vu',
      message: `Ban da nhan duoc ${def.rewardCoins} coin tu nhiem vu "${def.title}"!`,
      type: 'quest_claimed',
      data: { questTitle: def.title, coinsAwarded: def.rewardCoins },
    });
  } catch (notifErr) {
    console.error('[quest] Failed to send notification:', notifErr.message);
  }

  return { alreadyClaimed: false, coinsAwarded: def.rewardCoins, questDef: def, newBalance: user.coin };
}

async function claimCompletionBonus(userId, type) {
  const progress = await getUserQuestProgress(userId);
  const group = type === 'daily' ? progress.daily : progress.weekly;

  if (!group.allCompleted) {
    throw createQuestError('Not all quests completed', 400);
  }

  if (!group.allClaimed) {
    throw createQuestError('Please claim all quest rewards before claiming the completion bonus', 400);
  }

  if (group.completionBonusClaimed) {
    return { alreadyClaimed: true, coinsAwarded: 0, newBalance: null };
  }

  const bonus = group.completionBonusCoins;
  if (!bonus) {
    throw createQuestError('No completion bonus configured', 400);
  }

  const defs = await QuestDefinition.find({ type, isActive: true }).sort({ order: 1 });
  if (!defs[0]) throw createQuestError('Quest definitions not found', 404);

  const now = new Date();
  const periodKey = group.periodKey;
  const questIds = defs.map((def) => def._id);

  const bonusClaimResult = await QuestProgress.updateMany(
    {
      userId,
      questId: { $in: questIds },
      periodKey,
      isClaimed: true,
      isCompletionBonusClaimed: { $ne: true },
    },
    { $set: { isCompletionBonusClaimed: true, completionBonusClaimedAt: now } }
  );

  if (getModifiedCount(bonusClaimResult) === 0) {
    const refreshedProgress = await getUserQuestProgress(userId);
    const refreshedGroup = type === 'daily' ? refreshedProgress.daily : refreshedProgress.weekly;

    if (refreshedGroup.completionBonusClaimed) {
      return { alreadyClaimed: true, coinsAwarded: 0, newBalance: null };
    }

    if (!refreshedGroup.allClaimed) {
      throw createQuestError('Please claim all quest rewards before claiming the completion bonus', 400);
    }

    throw createQuestError('Completion bonus is being claimed. Please try again.', 409);
  }

  let user;
  try {
    user = await awardCoinsToUser(userId, bonus);
  } catch (error) {
    await QuestProgress.updateMany(
      {
        userId,
        questId: { $in: questIds },
        periodKey,
        isCompletionBonusClaimed: true,
        completionBonusClaimedAt: now,
      },
      { $set: { isCompletionBonusClaimed: false, completionBonusClaimedAt: null } }
    );
    throw error;
  }

  try {
    await notificationService.create(userId, {
      title: 'Nhan thuong hoan thanh!',
      message: `Ban da hoan thanh tat ca nhiem vu ${type === 'daily' ? 'ngay' : 'tuan'} va nhan duoc ${bonus} coin!`,
      type: 'quest_bonus',
      data: { bonusCoins: bonus, questType: type },
    });
  } catch (notifErr) {
    console.error('[quest] Failed to send notification:', notifErr.message);
  }

  return { alreadyClaimed: false, coinsAwarded: bonus, newBalance: user.coin };
}

module.exports = {
  getPeriodKey,
  getDayStart,
  getWeekStart,
  syncQuestDefinitions,
  getUserQuestProgress,
  getQuestSummary,
  checkAndUpdateProgress,
  claimReward,
  claimCompletionBonus,
};
