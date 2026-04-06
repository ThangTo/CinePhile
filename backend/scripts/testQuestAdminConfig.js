const assert = require('assert');
const path = require('path');
const Module = require('module');

function createHarness() {
  const definitions = [];
  const configs = [];
  const snapshots = [];
  let nextDefinitionId = 1;

  const cloneDate = (value) => (value instanceof Date ? new Date(value.getTime()) : value);

  const normalizeValue = (value) => {
    if (Array.isArray(value)) return value.map((item) => normalizeValue(item));
    if (value && typeof value === 'object' && !(value instanceof Date)) {
      return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalizeValue(item)]));
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
      }
      return currentValue === value;
    });

  const sortDocs = (docs, sortSpec = {}) => {
    const [field, direction] = Object.entries(sortSpec)[0] || [];
    if (!field) return docs;
    return [...docs].sort((a, b) => ((a[field] || 0) - (b[field] || 0)) * direction);
  };

  const attachDefinitionHelpers = (doc) => ({
    ...doc,
    async save() {
      const index = definitions.findIndex((item) => String(item._id) === String(doc._id));
      if (index >= 0) {
        definitions[index] = this;
      } else {
        definitions.push(this);
      }
      this.updatedAt = new Date();
      return this;
    },
  });

  const QuestDefinition = {
    find(query = {}) {
      return {
        sort: async (sortSpec = {}) =>
          sortDocs(definitions.filter((doc) => matchesQuery(doc, query)), sortSpec).map(
            attachDefinitionHelpers,
          ),
      };
    },
    findById: async (id) => {
      const doc = definitions.find((item) => String(item._id) === String(id));
      return doc ? attachDefinitionHelpers(doc) : null;
    },
    create: async (doc) => {
      const created = attachDefinitionHelpers({
        _id: doc._id || `quest-def-${nextDefinitionId++}`,
        createdAt: new Date(),
        updatedAt: new Date(),
        ...normalizeValue(doc),
      });
      definitions.push(created);
      return created;
    },
  };

  const QuestConfig = {
    find: async () => configs,
    findOne: async (query) => configs.find((doc) => matchesQuery(doc, query)) || null,
    create: async (doc) => {
      const created = {
        createdAt: new Date(),
        updatedAt: new Date(),
        ...normalizeValue(doc),
      };
      configs.push(created);
      return created;
    },
    findOneAndUpdate: async (query, update, options = {}) => {
      let target = configs.find((doc) => matchesQuery(doc, query));
      if (!target && options.upsert) {
        target = {
          createdAt: new Date(),
          updatedAt: new Date(),
          ...normalizeValue(query),
          ...normalizeValue(update.$setOnInsert || {}),
        };
        configs.push(target);
      }
      if (!target) return null;
      Object.assign(target, normalizeValue(update.$set || {}));
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
          createdAt: new Date(),
          updatedAt: new Date(),
          ...normalizeValue(query),
          ...normalizeValue(update.$setOnInsert || {}),
        };
        snapshots.push(target);
      }
      if (!target) return null;
      Object.assign(target, normalizeValue(update.$set || {}));
      target.updatedAt = new Date();
      return target;
    },
  };

  const QuestProgress = {
    find: async () => [],
    findOne: async () => null,
    findOneAndUpdate: async () => null,
    updateOne: async () => ({ modifiedCount: 0 }),
    updateMany: async () => ({ modifiedCount: 0 }),
  };

  const servicePath = path.resolve(__dirname, '../services/quest.service.js');
  delete require.cache[servicePath];

  const originalLoad = Module._load;
  Module._load = function patchedLoad(request, parent, isMain) {
    if (request === '../models/quest_definition.model') return QuestDefinition;
    if (request === '../models/quest_config.model') return QuestConfig;
    if (request === '../models/quest_period_snapshot.model') return QuestPeriodSnapshot;
    if (request === '../models/quest_progress.model') return QuestProgress;
    if (request === './notification.service') return {};
    if (request === './coinLedger.service') return {};
    return originalLoad(request, parent, isMain);
  };

  const service = require(servicePath);
  Module._load = originalLoad;

  return { service, definitions, configs, snapshots };
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
  await runTest('random preview matches persisted snapshot deterministically', async () => {
    const harness = createHarness();
    const now = new Date('2026-04-06T10:00:00.000Z');
    const updatedAt = new Date('2026-04-05T08:00:00.000Z');

    harness.definitions.push(
      { _id: 'd1', questId: 'd1', type: 'daily', category: 'watch', title: 'Quest 1', targetMetric: 'watch_seconds', targetValue: 600, rewardCoins: 10, isActive: true, order: 1 },
      { _id: 'd2', questId: 'd2', type: 'daily', category: 'watch', title: 'Quest 2', targetMetric: 'watch_seconds', targetValue: 1200, rewardCoins: 20, isActive: true, order: 2 },
      { _id: 'd3', questId: 'd3', type: 'daily', category: 'social', title: 'Quest 3', targetMetric: 'comment_count', targetValue: 1, rewardCoins: 20, isActive: true, order: 3 },
      { _id: 'd4', questId: 'd4', type: 'daily', category: 'engagement', title: 'Quest 4', targetMetric: 'favorite_count', targetValue: 1, rewardCoins: 20, isActive: true, order: 4 },
    );
    harness.configs.push({
      type: 'daily',
      selectionMode: 'random',
      fixedQuestIds: ['d1', 'd2'],
      randomPoolQuestIds: ['d1', 'd2', 'd3', 'd4'],
      randomCount: 2,
      completionBonusCoins: 50,
      updatedAt,
    });
    harness.configs.push({
      type: 'weekly',
      selectionMode: 'fixed',
      fixedQuestIds: [],
      randomPoolQuestIds: [],
      randomCount: 0,
      completionBonusCoins: 0,
      updatedAt,
    });

    const overview = await harness.service.getAdminQuestConfig(now);
    const previewIds = overview.nextPreview.daily.quests.map((quest) => quest.sourceQuestDefinitionId);
    const previewKey = overview.nextPeriodKey.daily;
    const persisted = await harness.service.ensureQuestPeriodSnapshot('daily', previewKey);
    const persistedIds = persisted.quests.map((quest) => String(quest.sourceQuestDefinitionId));

    assert.deepEqual(persistedIds, previewIds);
  });

  await runTest('archiving a template does not rewrite the current snapshot', async () => {
    const harness = createHarness();
    const now = new Date('2026-04-06T10:00:00.000Z');
    const todayKey = harness.service.getPeriodKey('daily', now);

    harness.definitions.push(
      { _id: 'd1', questId: 'd1', type: 'daily', category: 'watch', title: 'Quest 1', targetMetric: 'watch_seconds', targetValue: 600, rewardCoins: 10, isActive: true, order: 1 },
      { _id: 'd2', questId: 'd2', type: 'daily', category: 'social', title: 'Quest 2', targetMetric: 'comment_count', targetValue: 1, rewardCoins: 20, isActive: true, order: 2 },
      { _id: 'd3', questId: 'd3', type: 'daily', category: 'engagement', title: 'Quest 3', targetMetric: 'favorite_count', targetValue: 1, rewardCoins: 20, isActive: true, order: 3 },
    );
    harness.configs.push({
      type: 'daily',
      selectionMode: 'fixed',
      fixedQuestIds: ['d1', 'd2'],
      randomPoolQuestIds: ['d1', 'd2', 'd3'],
      randomCount: 2,
      completionBonusCoins: 50,
      updatedAt: new Date('2026-04-06T08:00:00.000Z'),
    });
    harness.configs.push({
      type: 'weekly',
      selectionMode: 'fixed',
      fixedQuestIds: [],
      randomPoolQuestIds: [],
      randomCount: 0,
      completionBonusCoins: 0,
      updatedAt: new Date('2026-04-06T08:00:00.000Z'),
    });

    await harness.service.ensureQuestPeriodSnapshot('daily', todayKey);
    await harness.service.archiveQuestTemplate('d1');
    const overview = await harness.service.getAdminQuestConfig(now);

    assert.deepEqual(
      overview.currentSnapshot.daily.quests.map((quest) => quest.sourceQuestDefinitionId),
      ['d1', 'd2'],
    );
    assert.equal(overview.draftConfig.daily.fixedQuestIds.includes('d1'), false);
    assert.equal(
      overview.nextPreview.daily.quests.some((quest) => quest.sourceQuestDefinitionId === 'd1'),
      false,
    );
  });

  await runTest('saving a new draft first locks the current period snapshot', async () => {
    const harness = createHarness();
    const now = new Date('2026-04-06T10:00:00.000Z');

    harness.definitions.push(
      { _id: 'd1', questId: 'd1', type: 'daily', category: 'watch', title: 'Quest 1', targetMetric: 'watch_seconds', targetValue: 600, rewardCoins: 10, isActive: true, order: 1 },
      { _id: 'd2', questId: 'd2', type: 'daily', category: 'social', title: 'Quest 2', targetMetric: 'comment_count', targetValue: 1, rewardCoins: 20, isActive: true, order: 2 },
      { _id: 'd3', questId: 'd3', type: 'daily', category: 'engagement', title: 'Quest 3', targetMetric: 'favorite_count', targetValue: 1, rewardCoins: 20, isActive: true, order: 3 },
    );
    harness.configs.push({
      type: 'daily',
      selectionMode: 'fixed',
      fixedQuestIds: ['d1', 'd2'],
      randomPoolQuestIds: ['d1', 'd2', 'd3'],
      randomCount: 2,
      completionBonusCoins: 50,
      updatedAt: new Date('2026-04-06T07:00:00.000Z'),
    });
    harness.configs.push({
      type: 'weekly',
      selectionMode: 'fixed',
      fixedQuestIds: [],
      randomPoolQuestIds: [],
      randomCount: 0,
      completionBonusCoins: 0,
      updatedAt: new Date('2026-04-06T07:00:00.000Z'),
    });

    await harness.service.updateQuestConfig(
      'daily',
      {
        selectionMode: 'fixed',
        fixedQuestIds: ['d2', 'd3'],
        randomPoolQuestIds: ['d1', 'd2', 'd3'],
        randomCount: 2,
        completionBonusCoins: 60,
      },
      'admin-1',
    );

    const overview = await harness.service.getAdminQuestConfig(now);

    assert.deepEqual(
      overview.currentSnapshot.daily.quests.map((quest) => quest.sourceQuestDefinitionId),
      ['d1', 'd2'],
    );
    assert.deepEqual(
      overview.nextPreview.daily.quests.map((quest) => quest.sourceQuestDefinitionId),
      ['d2', 'd3'],
    );
  });

  await runTest('upsertQuestTemplate converts watch minutes into seconds and keeps type immutable', async () => {
    const harness = createHarness();

    const created = await harness.service.upsertQuestTemplate({
      type: 'daily',
      category: 'watch',
      title: 'Watch 15 minutes',
      description: 'New watch quest',
      icon: 'fa-solid fa-play',
      targetMetric: 'watch_seconds',
      targetValue: 15,
      rewardCoins: 20,
    });

    assert.equal(created.targetInputValue, 15);
    assert.equal(harness.definitions[0].targetValue, 900);

    await expectReject(
      () =>
        harness.service.upsertQuestTemplate({
          id: created.id,
          type: 'weekly',
          category: 'watch',
          title: 'Changed type',
          targetMetric: 'watch_seconds',
          targetValue: 15,
          rewardCoins: 20,
        }),
      /khong the doi loai quest/i,
    );
  });
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
