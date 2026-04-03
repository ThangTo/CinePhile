const assert = require('assert');
const path = require('path');

const servicePath = path.resolve(__dirname, '../services/playbackHeartbeat.service.js');
const movieModelPath = path.resolve(__dirname, '../models/movie.model.js');
const episodeModelPath = path.resolve(__dirname, '../models/episode.model.js');
const viewHistoryPath = path.resolve(__dirname, '../models/view_history.model.js');
const streakServicePath = path.resolve(__dirname, '../services/watchStreak.service.js');

const clone = (value) => JSON.parse(JSON.stringify(value));

const makeLeanResult = (value) => ({
  lean: async () => (value ? clone(value) : null),
});

const installMocks = (state) => {
  delete require.cache[servicePath];
  delete require.cache[movieModelPath];
  delete require.cache[episodeModelPath];
  delete require.cache[viewHistoryPath];
  delete require.cache[streakServicePath];

  require.cache[movieModelPath] = {
    id: movieModelPath,
    filename: movieModelPath,
    loaded: true,
    exports: {
      findById(id) {
        return makeLeanResult(state.moviesById?.[id] || null);
      },
      findOne(query) {
        return makeLeanResult(state.moviesBySlug?.[query.slug] || null);
      },
      findByIdAndUpdate(id, update) {
        state.movieUpdates.push({ id, update: clone(update) });
        return Promise.resolve({ _id: id });
      },
    },
  };

  require.cache[episodeModelPath] = {
    id: episodeModelPath,
    filename: episodeModelPath,
    loaded: true,
    exports: {
      findByIdAndUpdate(id, update) {
        state.episodeUpdates.push({ id, update: clone(update) });
        return Promise.resolve({ _id: id });
      },
    },
  };

  require.cache[viewHistoryPath] = {
    id: viewHistoryPath,
    filename: viewHistoryPath,
    loaded: true,
    exports: {
      findById(id) {
        return makeLeanResult(state.viewRecordsById?.[id] || null);
      },
      findOne(query) {
        const match = (state.recentViewRecords || []).find((record) => {
          if (String(record.movieId) !== String(query.movieId)) return false;
          if ((query.episodeId || null) !== (record.episodeId || null)) return false;
          if (query.userId && String(record.userId) !== String(query.userId)) return false;
          if (query.ipAddress && record.ipAddress !== query.ipAddress) return false;
          return true;
        });

        return {
          sort() {
            return makeLeanResult(match || null);
          },
        };
      },
      create(doc) {
        const createdId = `vh-${state.createdRecords.length + 1}`;
        const created = {
          _id: createdId,
          ...clone(doc),
        };

        state.createdRecords.push(created);
        state.viewRecordsById[createdId] = created;
        return Promise.resolve(clone(created));
      },
      findByIdAndUpdate(id, update) {
        state.viewUpdates.push({ id, update: clone(update) });
        return Promise.resolve({ _id: id });
      },
    },
  };

  require.cache[streakServicePath] = {
    id: streakServicePath,
    filename: streakServicePath,
    loaded: true,
    exports: {
      recordStreak(userId, secondsWatched) {
        state.streakCalls.push({ userId, secondsWatched });
        return Promise.resolve({
          currentStreak: 2,
          longestStreak: 4,
          minutesWatchedToday: Math.floor(secondsWatched / 60),
        });
      },
    },
  };

  return require(servicePath);
};

const makeState = () => ({
  moviesById: {},
  moviesBySlug: {},
  viewRecordsById: {},
  recentViewRecords: [],
  createdRecords: [],
  movieUpdates: [],
  episodeUpdates: [],
  viewUpdates: [],
  streakCalls: [],
});

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
  await run('creates a view record and updates watch time + streak together', async () => {
    const state = makeState();
    state.moviesBySlug['movie-slug'] = { _id: 'movie-1', slug: 'movie-slug' };

    const service = installMocks(state);
    const result = await service.recordPlaybackHeartbeat('movie-slug', {
      episodeId: 'episode-1',
      seconds: 25,
      userId: 'user-1',
      ipAddress: '1.2.3.4',
      userAgent: 'Mozilla/5.0 Mobile',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.viewHistoryId, 'vh-1');
    assert.strictEqual(result.streak.currentStreak, 2);
    assert.strictEqual(state.createdRecords.length, 1);
    assert.strictEqual(state.createdRecords[0].movieId, 'movie-1');
    assert.strictEqual(state.createdRecords[0].episodeId, 'episode-1');
    assert.strictEqual(state.createdRecords[0].userId, 'user-1');
    assert.strictEqual(state.createdRecords[0].deviceType, 'Mobile');
    assert.deepStrictEqual(state.streakCalls, [{ userId: 'user-1', secondsWatched: 25 }]);
    assert.deepStrictEqual(state.viewUpdates, [
      { id: 'vh-1', update: { $inc: { watchDuration: 25 } } },
    ]);
    assert.strictEqual(state.movieUpdates.length, 2);
    assert.strictEqual(state.episodeUpdates.length, 1);
  });

  await run('reuses a matching view history id without creating duplicates', async () => {
    const state = makeState();
    state.viewRecordsById['vh-99'] = {
      _id: 'vh-99',
      movieId: 'movie-99',
      episodeId: 'episode-2',
      userId: 'user-2',
      ipAddress: '8.8.8.8',
    };

    const service = installMocks(state);
    const result = await service.recordPlaybackHeartbeat('movie-slug', {
      viewHistoryId: 'vh-99',
      episodeId: 'episode-2',
      seconds: 60,
      ipAddress: '8.8.8.8',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.viewHistoryId, 'vh-99');
    assert.strictEqual(state.createdRecords.length, 0);
    assert.deepStrictEqual(state.streakCalls, []);
    assert.deepStrictEqual(state.viewUpdates, [
      { id: 'vh-99', update: { $inc: { watchDuration: 60 } } },
    ]);
  });

  await run('falls back to a recent matching record when the supplied id points to another episode', async () => {
    const state = makeState();
    state.viewRecordsById['vh-old'] = {
      _id: 'vh-old',
      movieId: 'movie-1',
      episodeId: 'episode-old',
      userId: 'user-3',
      ipAddress: '9.9.9.9',
    };
    state.moviesBySlug['movie-slug'] = { _id: 'movie-1', slug: 'movie-slug' };
    state.recentViewRecords.push({
      _id: 'vh-new',
      movieId: 'movie-1',
      episodeId: 'episode-new',
      userId: 'user-3',
      ipAddress: '9.9.9.9',
    });

    const service = installMocks(state);
    const result = await service.recordPlaybackHeartbeat('movie-slug', {
      viewHistoryId: 'vh-old',
      episodeId: 'episode-new',
      seconds: 15,
      userId: 'user-3',
      ipAddress: '9.9.9.9',
    });

    assert.strictEqual(result.success, true);
    assert.strictEqual(result.viewHistoryId, 'vh-new');
    assert.strictEqual(state.createdRecords.length, 0);
    assert.deepStrictEqual(state.viewUpdates, [
      { id: 'vh-new', update: { $inc: { watchDuration: 15 } } },
    ]);
    assert.deepStrictEqual(state.streakCalls, [{ userId: 'user-3', secondsWatched: 15 }]);
  });
})();
