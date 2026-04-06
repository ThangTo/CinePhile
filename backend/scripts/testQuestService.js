const assert = require('assert');
const path = require('path');
const Module = require('module');

function createQuestHarness() {
  const definitions = [];
  const progressDocs = [];
  const users = new Map();
  const notifications = [];
  let userIncDelayMs = 0;
  let progressClaimDelayMs = 0;
  let bonusClaimDelayMs = 0;

  const cloneDate = (value) => (value instanceof Date ? new Date(value.getTime()) : value);

  const normalizeValue = (value) => {
    if (Array.isArray(value)) {
      return value.map((item) => normalizeValue(item));
    }

    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return Object.fromEntries(
        Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]),
      );
    }

    return cloneDate(value);
  };

  const matchesQuery = (doc, query = {}) =>
    Object.entries(query).every(([key, value]) => {
      const currentValue = doc[key];

      if (value && typeof value === 'object' && !(value instanceof Date) && !Array.isArray(value)) {
        if (Array.isArray(value.$in)) {
          return value.$in.includes(currentValue);
        }

        if (Object.prototype.hasOwnProperty.call(value, '$ne')) {
          return currentValue !== value.$ne;
        }
      }

      return currentValue === value;
    });

  const applyUpdate = (doc, update = {}) => {
    if (update.$set) {
      Object.assign(doc, normalizeValue(update.$set));
    }

    return doc;
  };

  function QuestProgress(doc) {
    Object.assign(this, {
      watchedMovieIds: [],
      currentValue: 0,
      isCompleted: false,
      isClaimed: false,
      claimedAt: null,
      lastUpdatedAt: null,
      isCompletionBonusClaimed: false,
      completionBonusClaimedAt: null,
    }, normalizeValue(doc));
  }

  QuestProgress.prototype.save = async function save() {
    const existingIndex = progressDocs.findIndex(
      (doc) =>
        doc.userId === this.userId &&
        doc.questId === this.questId &&
        doc.periodKey === this.periodKey,
    );

    if (existingIndex === -1) {
      progressDocs.push(this);
    } else {
      progressDocs[existingIndex] = this;
    }

    return this;
  };

  QuestProgress.find = async (query) => progressDocs.filter((doc) => matchesQuery(doc, query));

  QuestProgress.findOne = async (query) => progressDocs.find((doc) => matchesQuery(doc, query)) || null;

  QuestProgress.findOneAndUpdate = async (query, update, options = {}) => {
    if (progressClaimDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, progressClaimDelayMs));
    }

    const target = progressDocs.find((doc) => matchesQuery(doc, query));
    if (!target) return null;

    const previous = { ...target };
    applyUpdate(target, update);
    return options.new ? target : previous;
  };

  QuestProgress.updateOne = async (query, update) => {
    const target = progressDocs.find((doc) => matchesQuery(doc, query));
    if (!target) return { modifiedCount: 0 };

    applyUpdate(target, update);
    return { modifiedCount: 1 };
  };

  QuestProgress.updateMany = async (query, update) => {
    if (bonusClaimDelayMs) {
      await new Promise((resolve) => setTimeout(resolve, bonusClaimDelayMs));
    }

    const targets = progressDocs.filter((doc) => matchesQuery(doc, query));
    targets.forEach((doc) => applyUpdate(doc, update));
    return { modifiedCount: targets.length };
  };

  const QuestDefinition = {
    find(query) {
      return {
        sort: async () => definitions.filter((doc) => matchesQuery(doc, query)),
      };
    },
    findById: async (id) => definitions.find((doc) => doc._id === id) || null,
  };

  const User = {
    findByIdAndUpdate: async (id, update) => {
      if (userIncDelayMs) {
        await new Promise((resolve) => setTimeout(resolve, userIncDelayMs));
      }

      const user = users.get(id);
      if (!user) return null;

      if (update.$inc?.coin) {
        user.coin += update.$inc.coin;
      }

      return { ...user };
    },
  };

  const notificationService = {
    create: async (userId, payload) => {
      notifications.push({ userId, payload });
      return { ok: true };
    },
  };

  const servicePath = path.resolve(__dirname, '../services/quest.service.js');
  delete require.cache[servicePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '../models/quest_definition.model') return QuestDefinition;
    if (request === '../models/quest_progress.model') return QuestProgress;
    if (request === '../models/user.model') return User;
    if (request === './notification.service') return notificationService;
    return originalLoad(request, parent, isMain);
  };

  const service = require(servicePath);
  Module._load = originalLoad;

  return {
    service,
    definitions,
    progressDocs,
    users,
    notifications,
    setUserIncDelay(ms) {
      userIncDelayMs = ms;
    },
    setProgressClaimDelay(ms) {
      progressClaimDelayMs = ms;
    },
    setBonusClaimDelay(ms) {
      bonusClaimDelayMs = ms;
    },
  };
}

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
}

async function expectReject(promiseFactory, pattern) {
  let didThrow = false;

  try {
    await promiseFactory();
  } catch (error) {
    didThrow = true;
    assert.match(error.message, pattern);
  }

  if (!didThrow) {
    throw new Error(`Expected promise to reject with ${pattern}`);
  }
}

async function main() {
  await runTest('getUserQuestProgress exposes targetMetric and bonus flags', async () => {
    const harness = createQuestHarness();
    harness.definitions.push({
      _id: 'quest-1',
      questId: 'daily_watch_10min',
      type: 'daily',
      category: 'watch',
      title: 'Xem phim 10 phut',
      description: '',
      icon: 'fa-solid fa-play',
      targetMetric: 'watch_seconds',
      targetValue: 600,
      rewardCoins: 10,
      completionBonusCoins: 50,
      isActive: true,
      order: 1,
    });

    const result = await harness.service.getUserQuestProgress('user-1');

    assert.equal(result.daily.quests[0].targetMetric, 'watch_seconds');
    assert.equal(result.daily.completionBonusClaimed, false);
    assert.equal(result.daily.canClaimCompletionBonus, false);
  });

  await runTest('claimCompletionBonus blocks until all quest rewards are claimed', async () => {
    const harness = createQuestHarness();
    const periodKey = harness.service.getPeriodKey('daily');

    harness.definitions.push(
      {
        _id: 'quest-1',
        questId: 'daily_a',
        type: 'daily',
        category: 'watch',
        title: 'A',
        description: '',
        icon: '',
        targetMetric: 'watch_seconds',
        targetValue: 60,
        rewardCoins: 10,
        completionBonusCoins: 50,
        isActive: true,
        order: 1,
      },
      {
        _id: 'quest-2',
        questId: 'daily_b',
        type: 'daily',
        category: 'social',
        title: 'B',
        description: '',
        icon: '',
        targetMetric: 'comment_count',
        targetValue: 1,
        rewardCoins: 20,
        completionBonusCoins: 0,
        isActive: true,
        order: 2,
      },
    );

    harness.progressDocs.push(
      new (function ProgressOne() {
        return {
          userId: 'user-2',
          questId: 'quest-1',
          periodKey,
          currentValue: 60,
          isCompleted: true,
          isClaimed: false,
          watchedMovieIds: [],
          isCompletionBonusClaimed: false,
          completionBonusClaimedAt: null,
        };
      })(),
      new (function ProgressTwo() {
        return {
          userId: 'user-2',
          questId: 'quest-2',
          periodKey,
          currentValue: 1,
          isCompleted: true,
          isClaimed: false,
          watchedMovieIds: [],
          isCompletionBonusClaimed: false,
          completionBonusClaimedAt: null,
        };
      })(),
    );

    harness.users.set('user-2', { _id: 'user-2', coin: 0 });

    await expectReject(
      () => harness.service.claimCompletionBonus('user-2', 'daily'),
      /nhan het thuong|claim all quest rewards/i,
    );
  });

  await runTest('claimReward stays idempotent under concurrent requests', async () => {
    const harness = createQuestHarness();
    const periodKey = harness.service.getPeriodKey('daily');

    harness.definitions.push({
      _id: 'quest-3',
      questId: 'daily_watch',
      type: 'daily',
      category: 'watch',
      title: 'Watch',
      description: '',
      icon: '',
      targetMetric: 'watch_seconds',
      targetValue: 60,
      rewardCoins: 10,
      completionBonusCoins: 0,
      isActive: true,
      order: 1,
    });

    harness.progressDocs.push({
      userId: 'user-3',
      questId: 'quest-3',
      periodKey,
      currentValue: 60,
      isCompleted: true,
      isClaimed: false,
      watchedMovieIds: [],
      isCompletionBonusClaimed: false,
      completionBonusClaimedAt: null,
    });

    harness.users.set('user-3', { _id: 'user-3', coin: 0 });
    harness.setProgressClaimDelay(15);
    harness.setUserIncDelay(15);

    await Promise.all([
      harness.service.claimReward('user-3', 'quest-3'),
      harness.service.claimReward('user-3', 'quest-3'),
    ]);

    assert.equal(harness.users.get('user-3').coin, 10);
  });

  await runTest('claimCompletionBonus stays idempotent after all rewards are claimed', async () => {
    const harness = createQuestHarness();
    const periodKey = harness.service.getPeriodKey('daily');

    harness.definitions.push(
      {
        _id: 'quest-4',
        questId: 'daily_a',
        type: 'daily',
        category: 'watch',
        title: 'A',
        description: '',
        icon: '',
        targetMetric: 'watch_seconds',
        targetValue: 60,
        rewardCoins: 10,
        completionBonusCoins: 50,
        isActive: true,
        order: 1,
      },
      {
        _id: 'quest-5',
        questId: 'daily_b',
        type: 'daily',
        category: 'social',
        title: 'B',
        description: '',
        icon: '',
        targetMetric: 'comment_count',
        targetValue: 1,
        rewardCoins: 20,
        completionBonusCoins: 0,
        isActive: true,
        order: 2,
      },
    );

    harness.progressDocs.push(
      {
        userId: 'user-4',
        questId: 'quest-4',
        periodKey,
        currentValue: 60,
        isCompleted: true,
        isClaimed: true,
        watchedMovieIds: [],
        isCompletionBonusClaimed: false,
        completionBonusClaimedAt: null,
      },
      {
        userId: 'user-4',
        questId: 'quest-5',
        periodKey,
        currentValue: 1,
        isCompleted: true,
        isClaimed: true,
        watchedMovieIds: [],
        isCompletionBonusClaimed: false,
        completionBonusClaimedAt: null,
      },
    );

    harness.users.set('user-4', { _id: 'user-4', coin: 0 });
    harness.setBonusClaimDelay(15);
    harness.setUserIncDelay(15);

    await Promise.all([
      harness.service.claimCompletionBonus('user-4', 'daily'),
      harness.service.claimCompletionBonus('user-4', 'daily'),
    ]);

    assert.equal(harness.users.get('user-4').coin, 50);
    assert.equal(harness.progressDocs.every((doc) => doc.isClaimed), true);
    assert.equal(
      harness.progressDocs.every((doc) => doc.isCompletionBonusClaimed === true),
      true,
    );
  });
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
