const assert = require('assert');
const path = require('path');

const servicePath = path.resolve(__dirname, '../services/watchStreak.service.js');
const userModelPath = path.resolve(__dirname, '../models/user.model.js');
const viewHistoryPath = path.resolve(__dirname, '../models/view_history.model.js');

const clone = (value) => JSON.parse(JSON.stringify(value));

const makeUserDoc = (seed) => ({
  ...clone(seed),
  async save() {
    this.saved = true;
    return this;
  },
});

const daysAgo = (days, hour = 12) => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  date.setHours(hour, 0, 0, 0);
  return date;
};

const installMocks = (state) => {
  delete require.cache[servicePath];
  delete require.cache[userModelPath];
  delete require.cache[viewHistoryPath];

  require.cache[userModelPath] = {
    id: userModelPath,
    filename: userModelPath,
    loaded: true,
    exports: {
      findById() {
        const doc = state.userDoc;
        return {
          lean: async () => clone(doc),
          then: (resolve, reject) => Promise.resolve(doc).then(resolve, reject),
          catch: (reject) => Promise.resolve(doc).catch(reject),
        };
      },
    },
  };

  require.cache[viewHistoryPath] = {
    id: viewHistoryPath,
    filename: viewHistoryPath,
    loaded: true,
    exports: {
      aggregate: async () => [{ totalSeconds: state.aggregateSeconds || 0 }],
    },
  };

  return require(servicePath);
};

const run = async (name, fn) => {
  try {
    await fn();
    console.log(`PASS ${name}`);
  } catch (error) {
    console.error(`FAIL ${name}`);
    console.error(error.stack || error.message);
    process.exitCode = 1;
  }
};

(async () => {
  await run('first watch under threshold does not start streak', async () => {
    const state = {
      userDoc: makeUserDoc({
        _id: 'u1',
        watchStreak: 0,
        longestStreak: 0,
        lastQualifiedWatchDate: null,
        lastWatchDate: null,
        todayWatchSeconds: 0,
        todayWatchDate: null,
      }),
    };

    const service = installMocks(state);
    const result = await service.recordStreak('u1', 60);

    assert.strictEqual(result.currentStreak, 0);
    assert.strictEqual(result.longestStreak, 0);
    assert.strictEqual(result.isActiveToday, false);
    assert.strictEqual(state.userDoc.watchStreak, 0);
    assert.strictEqual(state.userDoc.longestStreak, 0);
    assert.strictEqual(state.userDoc.todayWatchSeconds, 60);
  });

  await run('multiple deltas in the same day can unlock day one', async () => {
    const state = {
      userDoc: makeUserDoc({
        _id: 'u2',
        watchStreak: 0,
        longestStreak: 0,
        lastQualifiedWatchDate: null,
        lastWatchDate: null,
        todayWatchSeconds: 0,
        todayWatchDate: null,
      }),
    };

    const service = installMocks(state);
    const first = await service.recordStreak('u2', 300);
    const second = await service.recordStreak('u2', 300);

    assert.strictEqual(first.currentStreak, 0);
    assert.strictEqual(second.currentStreak, 1);
    assert.strictEqual(second.longestStreak, 1);
    assert.strictEqual(second.isActiveToday, true);
    assert.strictEqual(state.userDoc.todayWatchSeconds, 600);
  });

  await run('qualified consecutive day increments the streak', async () => {
    const state = {
      userDoc: makeUserDoc({
        _id: 'u3',
        watchStreak: 3,
        longestStreak: 3,
        lastQualifiedWatchDate: daysAgo(1),
        lastWatchDate: daysAgo(1),
        todayWatchSeconds: 0,
        todayWatchDate: daysAgo(1),
      }),
    };

    const service = installMocks(state);
    const result = await service.recordStreak('u3', 600);

    assert.strictEqual(result.currentStreak, 4);
    assert.strictEqual(result.longestStreak, 4);
    assert.strictEqual(result.isActiveToday, true);
    assert.strictEqual(state.userDoc.watchStreak, 4);
  });

  await run('missed-day streak stays broken until threshold is reached again', async () => {
    const today = new Date();
    today.setHours(9, 0, 0, 0);

    const state = {
      userDoc: makeUserDoc({
        _id: 'u4',
        watchStreak: 5,
        longestStreak: 7,
        lastQualifiedWatchDate: daysAgo(2),
        lastWatchDate: today,
        todayWatchSeconds: 300,
        todayWatchDate: today,
      }),
    };

    const service = installMocks(state);
    const result = await service.getStreak('u4');

    assert.strictEqual(result.currentStreak, 0);
    assert.strictEqual(result.longestStreak, 7);
    assert.strictEqual(result.isActiveToday, false);
    assert.strictEqual(result.todayProgress, 5);
  });
})();
