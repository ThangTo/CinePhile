const assert = require('assert');
const path = require('path');
const Module = require('module');

function createHarness() {
  const definitions = [];
  const progressDocs = [];
  const configs = [];
  const snapshots = [];
  const notifications = [];
  const users = new Map();
  const ledgerCalls = [];

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

  const QuestConfig = {
    find: async () => configs,
    findOne: async (query) => configs.find((doc) => matchesQuery(doc, query)) || null,
    create: async (doc) => {
      const created = {
        updatedAt: new Date(),
        createdAt: new Date(),
        ...normalizeValue(doc),
      };
      configs.push(created);
      return created;
    },
    findOneAndUpdate: async (query, update, options = {}) => {
      let target = configs.find((doc) => matchesQuery(doc, query));
      if (!target && options.upsert) {
        target = {
          ...normalizeValue(query),
          ...normalizeValue(update.$setOnInsert || {}),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        configs.push(target);
      }
      if (!target) return null;
      applyUpdate(target, update);
      target.updatedAt = new Date();
      return target;
    },
  };

  const QuestPeriodSnapshot = {
    findOne: async (query) => snapshots.find((doc) => matchesQuery(doc, query)) || null,
    findOneAndUpdate: async (query, update, options = {}) => {
      let target = snapshots.find((doc) => matchesQuery(doc, query));
      if (!target && options.upsert) {
        target = {
          ...normalizeValue(query),
          ...normalizeValue(update.$setOnInsert || {}),
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        snapshots.push(target);
      }
      if (!target) return null;
      applyUpdate(target, update);
      target.updatedAt = new Date();
      return target;
    },
  };

  const notificationService = {
    createNotification: async (payload) => {
      notifications.push(payload);
      return payload;
    },
    create: async (userId, payload) => {
      notifications.push({ userId, ...payload });
      return payload;
    },
  };

  const coinLedgerService = {
    applyCoinChange: async ({ userId, delta, reason, sourceType, sourceId, note, metadata }) => {
      const user = users.get(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const before = user.coin || 0;
      user.coin = before + delta;
      const call = {
        userId,
        delta,
        reason,
        sourceType,
        sourceId,
        note,
        metadata,
        balanceBefore: before,
        balanceAfter: user.coin,
      };
      ledgerCalls.push(call);
      return {
        user: { ...user },
        entry: call,
        balanceBefore: before,
        balanceAfter: user.coin,
      };
    },
  };

  const servicePath = path.resolve(__dirname, '../services/quest.service.js');
  delete require.cache[servicePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '../models/quest_definition.model') return QuestDefinition;
    if (request === '../models/quest_progress.model') return QuestProgress;
    if (request === '../models/quest_config.model') return QuestConfig;
    if (request === '../models/quest_period_snapshot.model') return QuestPeriodSnapshot;
    if (request === '../models/user.model') return {};
    if (request === './notification.service') return notificationService;
    if (request === './coinLedger.service') return coinLedgerService;
    return originalLoad(request, parent, isMain);
  };

  const service = require(servicePath);
  Module._load = originalLoad;

  return {
    service,
    definitions,
    progressDocs,
    configs,
    snapshots,
    notifications,
    users,
    ledgerCalls,
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

async function main() {
  await runTest('autoClaimQuestPeriod claims pending quest rewards and completion bonus for a closed period', async () => {
    const harness = createHarness();
    const periodKey = '2026-04-05';
    harness.users.set('user-1', { _id: 'user-1', coin: 5 });

    harness.definitions.push(
      {
        _id: 'quest-1',
        questId: 'daily_watch_10min',
        type: 'daily',
        category: 'watch',
        title: 'Watch 10 minutes',
        description: '',
        icon: '',
        targetMetric: 'watch_seconds',
        targetValue: 600,
        rewardCoins: 10,
        completionBonusCoins: 50,
        isActive: true,
        order: 1,
      },
      {
        _id: 'quest-2',
        questId: 'daily_comment',
        type: 'daily',
        category: 'social',
        title: 'Comment once',
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
        _id: 'progress-1',
        userId: 'user-1',
        questId: 'quest-1',
        periodKey,
        currentValue: 600,
        isCompleted: true,
        isClaimed: false,
        watchedMovieIds: [],
        isCompletionBonusClaimed: false,
      },
      {
        _id: 'progress-2',
        userId: 'user-1',
        questId: 'quest-2',
        periodKey,
        currentValue: 1,
        isCompleted: true,
        isClaimed: false,
        watchedMovieIds: [],
        isCompletionBonusClaimed: false,
      },
    );

    harness.snapshots.push({
      type: 'daily',
      periodKey,
      timezone: 'Asia/Ho_Chi_Minh',
      selectionMode: 'fixed',
      completionBonusCoins: 50,
      quests: [
        {
          sourceQuestDefinitionId: 'quest-1',
          questId: 'daily_watch_10min',
          title: 'Watch 10 minutes',
          targetMetric: 'watch_seconds',
          targetValue: 600,
          rewardCoins: 10,
          order: 1,
        },
        {
          sourceQuestDefinitionId: 'quest-2',
          questId: 'daily_comment',
          title: 'Comment once',
          targetMetric: 'comment_count',
          targetValue: 1,
          rewardCoins: 20,
          order: 2,
        },
      ],
    });

    const result = await harness.service.autoClaimQuestPeriod('daily', periodKey, {
      claimedAt: new Date('2026-04-06T00:10:00.000Z'),
    });

    assert.equal(result.processedUsers, 1);
    assert.equal(result.totalCoinsAwarded, 80);
    assert.equal(harness.users.get('user-1').coin, 85);
    assert.equal(harness.progressDocs.every((doc) => doc.isClaimed), true);
    assert.equal(
      harness.progressDocs.every((doc) => doc.isCompletionBonusClaimed === true),
      true,
    );
    assert.equal(harness.ledgerCalls.length, 3);
    assert.equal(harness.notifications.length, 1);
    assert.equal(harness.notifications[0].type, 'quest_auto_claim');
  });

  await runTest('autoClaimQuestPeriod ignores incomplete rewards', async () => {
    const harness = createHarness();
    const periodKey = '2026-W14';
    harness.users.set('user-2', { _id: 'user-2', coin: 0 });

    harness.definitions.push({
      _id: 'quest-w1',
      questId: 'weekly_watch_60min',
      type: 'weekly',
      category: 'watch',
      title: 'Watch 60 minutes',
      description: '',
      icon: '',
      targetMetric: 'watch_seconds',
      targetValue: 3600,
      rewardCoins: 50,
      completionBonusCoins: 50,
      isActive: true,
      order: 1,
    });

    harness.progressDocs.push({
      _id: 'progress-w1',
      userId: 'user-2',
      questId: 'quest-w1',
      periodKey,
      currentValue: 1200,
      isCompleted: false,
      isClaimed: false,
      watchedMovieIds: [],
      isCompletionBonusClaimed: false,
    });

    harness.snapshots.push({
      type: 'weekly',
      periodKey,
      timezone: 'Asia/Ho_Chi_Minh',
      selectionMode: 'fixed',
      completionBonusCoins: 50,
      quests: [
        {
          sourceQuestDefinitionId: 'quest-w1',
          questId: 'weekly_watch_60min',
          title: 'Watch 60 minutes',
          targetMetric: 'watch_seconds',
          targetValue: 3600,
          rewardCoins: 50,
          order: 1,
        },
      ],
    });

    const result = await harness.service.autoClaimQuestPeriod('weekly', periodKey, {
      claimedAt: new Date('2026-04-06T00:10:00.000Z'),
    });

    assert.equal(result.processedUsers, 0);
    assert.equal(result.totalCoinsAwarded, 0);
    assert.equal(harness.users.get('user-2').coin, 0);
    assert.equal(harness.ledgerCalls.length, 0);
    assert.equal(harness.notifications.length, 0);
  });
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
